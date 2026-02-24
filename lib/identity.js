// Author UID and Data Identity Utilities
import prisma from './prisma';

/**
 * Generate a unique Author UID in format: WP-AUTH-XXXXXX
 * Uses a sequence table to ensure uniqueness
 */
export async function generateAuthorUid() {
  // Use upsert to handle the singleton sequence
  const sequence = await prisma.authorUidSequence.upsert({
    where: { id: 'singleton' },
    update: { lastValue: { increment: 1 } },
    create: { id: 'singleton', lastValue: 1 },
  });

  const paddedNumber = String(sequence.lastValue).padStart(6, '0');
  return `WP-AUTH-${paddedNumber}`;
}

/**
 * Assign Author UID to a user if they don't have one
 */
export async function ensureAuthorUid(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, authorUid: true },
  });

  if (!user) return null;
  
  if (user.authorUid) return user.authorUid;

  const authorUid = await generateAuthorUid();
  
  await prisma.user.update({
    where: { id: userId },
    data: { authorUid },
  });

  return authorUid;
}

/**
 * Get or create Author UID by email
 * Used during CSV imports to match existing authors
 */
export async function getOrCreateAuthorByEmail(email, name, options = {}) {
  const normalizedEmail = email.toLowerCase().trim();
  
  // Check if user exists
  let user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (user) {
    // Ensure they have an Author UID
    if (!user.authorUid) {
      const authorUid = await generateAuthorUid();
      user = await prisma.user.update({
        where: { id: user.id },
        data: { authorUid },
      });
    }
    return user;
  }

  // Create new user with Author UID
  const authorUid = await generateAuthorUid();
  
  user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      name: name || 'Unknown Author',
      password: '', // Empty password - user needs to set up account
      authorUid,
      importSource: options.importSource || 'csv',
      phone: options.phone,
      alternateEmail: options.alternateEmail,
      alternatePhone: options.alternatePhone,
    },
  });

  return user;
}

/**
 * Determine royalty bucket from platform name
 * Case-insensitive matching
 */
export function getRoyaltyBucket(platform) {
  if (!platform) return 'ECOMMERCE';
  
  const p = platform.toLowerCase().trim();
  
  // Website bucket
  if (p.includes('website') || p.includes('direct')) {
    return 'WEBSITE';
  }
  
  // Ebook bucket
  if (
    p.includes('ebook') ||
    p.includes('kindle') ||
    p.includes('google books') ||
    p.includes('google play') ||
    p.includes('kobo') ||
    p.includes('apple books') ||
    p.includes('nook')
  ) {
    return 'EBOOK';
  }
  
  // Default to ecommerce
  return 'ECOMMERCE';
}

/**
 * Find book by ISBN (checks paperback, hardcover, and legacy ISBN)
 */
export async function findBookByIsbn(isbn) {
  if (!isbn) return null;
  
  const normalizedIsbn = isbn.replace(/[-\s]/g, '').trim();
  
  const book = await prisma.book.findFirst({
    where: {
      OR: [
        { isbnPaperback: normalizedIsbn },
        { isbnHardcover: normalizedIsbn },
        { isbn: normalizedIsbn },
      ],
    },
    include: {
      authors: {
        include: { author: true },
      },
      author: true,
    },
  });

  return book;
}

/**
 * Get canonical ISBN for a book (paperback ISBN is the anchor)
 */
export function getCanonicalIsbn(book) {
  return book.isbnPaperback || book.isbn || book.isbnHardcover;
}

/**
 * Link multiple authors to a book
 */
export async function linkAuthorsToBook(bookId, authorIds, addedBy = null) {
  const results = [];
  
  for (let i = 0; i < authorIds.length; i++) {
    const authorId = authorIds[i];
    
    // Get author's UID
    const author = await prisma.user.findUnique({
      where: { id: authorId },
      select: { id: true, authorUid: true },
    });

    if (!author) continue;

    // Create or update book-author link
    const bookAuthor = await prisma.bookAuthor.upsert({
      where: {
        bookId_authorId: { bookId, authorId },
      },
      update: {
        authorUid: author.authorUid,
      },
      create: {
        bookId,
        authorId,
        authorUid: author.authorUid,
        isPrimary: i === 0, // First author is primary
        addedBy,
      },
    });

    results.push(bookAuthor);
  }

  return results;
}

/**
 * Get all authors for a book
 */
export async function getBookAuthors(bookId) {
  const bookAuthors = await prisma.bookAuthor.findMany({
    where: { bookId },
    include: {
      author: {
        select: {
          id: true,
          authorUid: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: [
      { isPrimary: 'desc' },
      { addedAt: 'asc' },
    ],
  });

  return bookAuthors;
}

/**
 * Get all books for an author (via BookAuthor junction)
 */
export async function getAuthorBooks(authorId) {
  const bookAuthors = await prisma.bookAuthor.findMany({
    where: { authorId },
    include: {
      book: true,
    },
  });

  return bookAuthors.map(ba => ba.book);
}

/**
 * Create royalties for all authors of a book
 */
export async function createRoyaltiesForSale(bookId, saleAmount, platform, options = {}) {
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    include: {
      authors: {
        include: { author: true },
      },
      author: true, // Legacy single author
    },
  });

  if (!book) return [];

  const bucket = getRoyaltyBucket(platform);
  const royaltyRate = options.royaltyRate || 0.10;
  const royalties = [];

  // Get all authors (from junction table or legacy)
  let authors = book.authors.map(ba => ({
    id: ba.author.id,
    authorUid: ba.author.authorUid,
    share: ba.royaltyShare,
  }));

  // Fallback to legacy single author if no multi-author setup
  if (authors.length === 0 && book.author) {
    authors = [{
      id: book.author.id,
      authorUid: book.author.authorUid,
      share: 100,
    }];
  }

  // Calculate royalty amount per author
  const totalRoyalty = saleAmount * royaltyRate;
  const hasCustomShares = authors.some(a => a.share !== null && a.share !== undefined);
  
  for (const author of authors) {
    let authorShare;
    if (hasCustomShares && author.share !== null) {
      authorShare = author.share / 100;
    } else {
      authorShare = 1 / authors.length; // Equal split
    }

    const authorRoyalty = totalRoyalty * authorShare;

    const royalty = await prisma.royalty.create({
      data: {
        authorId: author.id,
        authorUid: author.authorUid,
        bookId,
        saleId: options.saleId,
        amount: authorRoyalty,
        royaltyRate,
        saleAmount: saleAmount * authorShare,
        bucket,
        platform,
        period: options.period || getCurrentPeriod(),
      },
    });

    royalties.push(royalty);
  }

  return royalties;
}

/**
 * Get current period string (YYYY-MM)
 */
export function getCurrentPeriod() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Parse period string to date range
 */
export function parsePeriod(period) {
  const [year, month] = period.split('-').map(Number);
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  return { startDate, endDate };
}
