// Writer's Pocket - Main API Routes
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import prisma from '@/lib/prisma';
import { isRazorpayConfigured, createOrder, verifyPaymentSignature, verifyWebhookSignature } from '@/lib/razorpay';
import { getSetting, getSettings, getSettingsByCategory, setSetting } from '@/lib/site-settings';
import { syncLeadToSheets, syncAnthologyToSheets } from '@/lib/google-sheets';
import { generateAuthorUid, ensureAuthorUid, getOrCreateAuthorByEmail, linkAuthorsToBook, getRoyaltyBucket } from '@/lib/identity';

// Helper: Get current session
async function getSession(request) {
  // Simple JWT extraction from Authorization header for API calls
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    // For API calls, we'll verify the session differently
    // This is a simplified version - in production use proper JWT verification
  }
  return null;
}

// Helper: Check role authorization
function checkRole(userRole, allowedRoles) {
  return allowedRoles.includes(userRole);
}

// Helper: Generate order number
function generateOrderNumber() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `WP-${timestamp}-${random}`;
}

// Define publishing stages
const PUBLISHING_STAGES = [
  { type: 'MANUSCRIPT_RECEIVED', order: 1 },
  { type: 'INITIAL_REVIEW', order: 2 },
  { type: 'EDITING', order: 3 },
  { type: 'PROOFREADING', order: 4 },
  { type: 'COVER_DESIGN', order: 5 },
  { type: 'INTERIOR_FORMATTING', order: 6 },
  { type: 'FINAL_REVIEW', order: 7 },
  { type: 'ISBN_ASSIGNMENT', order: 8 },
  { type: 'PRINTING', order: 9 },
  { type: 'DISTRIBUTION', order: 10 },
  { type: 'COMPLETED', order: 11 },
];

export async function GET(request, context) {
  const params = await context.params;
  const pathSegments = params?.path || [];
  const path = '/' + pathSegments.join('/');

  try {
    // Health check
    if (path === '/health') {
      return NextResponse.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: 'postgresql',
        razorpay: isRazorpayConfigured() ? 'configured' : 'not_configured',
      });
    }

    // Get all books (public)
    if (path === '/books') {
      const { searchParams } = new URL(request.url);
      const isPublic = searchParams.get('public') === 'true';
      const authorId = searchParams.get('authorId');

      const where = {};
      if (isPublic) {
        where.isPublic = true;
        where.isAuthorCopy = false;
      }
      if (authorId) {
        where.authorId = authorId;
      }

      const books = await prisma.book.findMany({
        where,
        include: {
          author: {
            select: { id: true, name: true, publicUrl: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return NextResponse.json({ books });
    }

    // Get single book
    if (path.startsWith('/books/') && pathSegments.length === 2) {
      const bookId = pathSegments[1];
      const book = await prisma.book.findUnique({
        where: { id: bookId },
        include: {
          author: { select: { id: true, name: true, publicUrl: true, bio: true } },
          publishingStages: {
            orderBy: { stageOrder: 'asc' },
            include: { files: true },
          },
          manuscripts: { orderBy: { version: 'desc' } },
        },
      });

      if (!book) {
        return NextResponse.json({ error: 'Book not found' }, { status: 404 });
      }

      return NextResponse.json({ book });
    }

    // Get author's books with full details
    if (path === '/author/books') {
      const { searchParams } = new URL(request.url);
      const authorId = searchParams.get('authorId') || request.headers.get('x-user-id');

      if (!authorId) {
        return NextResponse.json({ error: 'Author ID required' }, { status: 400 });
      }

      const books = await prisma.book.findMany({
        where: { authorId },
        include: {
          publishingStages: {
            orderBy: { stageOrder: 'asc' },
          },
          manuscripts: {
            orderBy: { version: 'desc' },
            take: 1,
          },
          externalLinks: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return NextResponse.json({ books });
    }

    // Get author's sales analytics
    if (path === '/author/analytics') {
      const { searchParams } = new URL(request.url);
      const authorId = searchParams.get('authorId');

      if (!authorId) {
        return NextResponse.json({ error: 'Author ID required' }, { status: 400 });
      }

      // Daily sales (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const royalties = await prisma.royalty.findMany({
        where: {
          authorId,
          createdAt: { gte: thirtyDaysAgo },
        },
        include: { book: { select: { title: true } } },
        orderBy: { createdAt: 'desc' },
      });

      // Monthly summary
      const monthlySummary = await prisma.royalty.groupBy({
        by: ['period'],
        where: { authorId },
        _sum: { amount: true, saleAmount: true },
        _count: true,
      });

      // Total unpaid royalties
      const unpaidRoyalties = await prisma.royalty.aggregate({
        where: { authorId, isPaid: false },
        _sum: { amount: true },
      });

      return NextResponse.json({
        recentRoyalties: royalties,
        monthlySummary,
        unpaidTotal: unpaidRoyalties._sum.amount || 0,
      });
    }

    // Get author's orders
    if (path === '/author/orders') {
      const { searchParams } = new URL(request.url);
      const authorId = searchParams.get('authorId');

      if (!authorId) {
        return NextResponse.json({ error: 'Author ID required' }, { status: 400 });
      }

      const orders = await prisma.order.findMany({
        where: { userId: authorId },
        include: {
          items: {
            include: { book: { select: { title: true, coverImage: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return NextResponse.json({ orders });
    }

    // Get queries for author
    if (path === '/author/queries') {
      const { searchParams } = new URL(request.url);
      const authorId = searchParams.get('authorId');

      if (!authorId) {
        return NextResponse.json({ error: 'Author ID required' }, { status: 400 });
      }

      const queries = await prisma.query.findMany({
        where: { authorId },
        include: {
          book: { select: { title: true } },
          stage: { select: { stageType: true } },
          comments: { orderBy: { createdAt: 'asc' } },
        },
        orderBy: { createdAt: 'desc' },
      });

      return NextResponse.json({ queries });
    }

    // Get notifications
    if (path === '/notifications') {
      const { searchParams } = new URL(request.url);
      const userId = searchParams.get('userId');

      if (!userId) {
        return NextResponse.json({ error: 'User ID required' }, { status: 400 });
      }

      const notifications = await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      const unreadCount = await prisma.notification.count({
        where: { userId, isRead: false },
      });

      return NextResponse.json({ notifications, unreadCount });
    }

    // Get user profile
    if (path === '/profile') {
      const { searchParams } = new URL(request.url);
      const userId = searchParams.get('userId');

      if (!userId) {
        return NextResponse.json({ error: 'User ID required' }, { status: 400 });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          profileImage: true,
          bio: true,
          website: true,
          socialLinks: true,
          publicUrl: true,
          createdAt: true,
        },
      });

      const bankDetails = await prisma.bankDetails.findUnique({
        where: { userId },
      });

      return NextResponse.json({ user, bankDetails });
    }

    // Public author profile
    if (path.startsWith('/authors/') && pathSegments.length === 2) {
      const publicUrl = pathSegments[1];
      const author = await prisma.user.findUnique({
        where: { publicUrl },
        select: {
          id: true,
          name: true,
          bio: true,
          profileImage: true,
          website: true,
          socialLinks: true,
          publicUrl: true,
          books: {
            where: { isPublic: true },
            select: {
              id: true,
              title: true,
              coverImage: true,
              description: true,
              price: true,
            },
          },
        },
      });

      if (!author) {
        return NextResponse.json({ error: 'Author not found' }, { status: 404 });
      }

      return NextResponse.json({ author });
    }

    // GET /api/store/books - Get all publicly listed books for the store
    if (path === '/store/books') {
      const books = await prisma.book.findMany({
        where: {
          isPublic: true,
          status: 'PUBLISHED',
        },
        include: {
          author: { select: { id: true, name: true } },
        },
        orderBy: { publishedDate: 'desc' },
      });

      return NextResponse.json({ books });
    }

    // GET /api/store/books/[id] - Get single book for store
    if (path.startsWith('/store/books/') && pathSegments.length === 3) {
      const bookId = pathSegments[2];
      
      const book = await prisma.book.findUnique({
        where: { id: bookId },
        include: {
          author: { select: { id: true, name: true, publicUrl: true } },
        },
      });

      if (!book || !book.isPublic) {
        return NextResponse.json({ error: 'Book not found' }, { status: 404 });
      }

      return NextResponse.json({ book });
    }

    // Admin: Get all users
    // Admin: Get all books with stages
    if (path === '/admin/books') {
      const books = await prisma.book.findMany({
        include: {
          author: { select: { id: true, name: true, email: true, authorUid: true } },
          publishingStages: {
            orderBy: { stageOrder: 'asc' },
            include: { assignedTo: { select: { name: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return NextResponse.json({ books });
    }

    // GET /api/admin/books/[id] - Get single book with full project details
    if (path.startsWith('/admin/books/') && pathSegments.length === 3 && !path.includes('/stages')) {
      const bookId = pathSegments[2];
      
      const book = await prisma.book.findUnique({
        where: { id: bookId },
        include: {
          author: { 
            select: { 
              id: true, 
              name: true, 
              email: true, 
              phone: true,
              authorUid: true,
              createdAt: true,
            } 
          },
          publishingStages: {
            orderBy: { stageOrder: 'asc' },
            include: { 
              assignedTo: { select: { id: true, name: true, email: true } },
              history: {
                orderBy: { createdAt: 'desc' },
                take: 10,
                include: {
                  changedBy: { select: { id: true, name: true } },
                },
              },
            },
          },
          queries: {
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: {
              author: { select: { name: true } },
              assignedTo: { select: { name: true } },
            },
          },
        },
      });

      if (!book) {
        return NextResponse.json({ error: 'Book not found' }, { status: 404 });
      }

      // Calculate ISBN status
      const isbnStatus = book.isbnPaperback ? 'ALLOTTED' : 'PENDING';
      
      // Calculate overall progress
      const totalStages = book.publishingStages.length;
      const completedStages = book.publishingStages.filter(s => 
        s.status === 'COMPLETED' || s.status === 'APPROVED'
      ).length;
      const progressPercent = totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0;

      // Get current stage
      const currentStage = book.publishingStages.find(s => 
        s.status === 'IN_PROGRESS' || s.status === 'AWAITING_APPROVAL'
      ) || book.publishingStages.find(s => s.status === 'PENDING');

      return NextResponse.json({ 
        book,
        meta: {
          isbnStatus,
          progressPercent,
          completedStages,
          totalStages,
          currentStage: currentStage?.stageType || null,
        }
      });
    }

    // GET /api/admin/team - Get team members for assignment
    if (path === '/admin/team') {
      const team = await prisma.user.findMany({
        where: {
          role: { in: ['ADMIN', 'TEAM'] },
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
        orderBy: { name: 'asc' },
      });

      return NextResponse.json({ team });
    }

    // GET /api/admin/stage-templates - Get all stage templates
    if (path === '/admin/stage-templates') {
      let templates = await prisma.stageTemplate.findMany({
        orderBy: { sortOrder: 'asc' },
      });

      // If no templates exist, create defaults (all OFF except INITIAL_REVIEW)
      if (templates.length === 0) {
        const defaultStages = [
          { stageType: 'MANUSCRIPT_RECEIVED', name: 'Manuscript Received', sortOrder: 1, isDefault: false },
          { stageType: 'INITIAL_REVIEW', name: 'Initial Review', sortOrder: 2, isDefault: true }, // Only this one is ON by default
          { stageType: 'EDITING', name: 'Editing', sortOrder: 3, isDefault: false },
          { stageType: 'PROOFREADING', name: 'Proofreading', sortOrder: 4, isDefault: false },
          { stageType: 'COVER_DESIGN', name: 'Cover Design', sortOrder: 5, isDefault: false },
          { stageType: 'INTERIOR_FORMATTING', name: 'Interior Formatting', sortOrder: 6, isDefault: false },
          { stageType: 'FINAL_REVIEW', name: 'Final Review', sortOrder: 7, isDefault: false },
          { stageType: 'ISBN_ASSIGNMENT', name: 'ISBN Assignment', sortOrder: 8, isDefault: false },
          { stageType: 'PRINTING', name: 'Printing', sortOrder: 9, isDefault: false },
          { stageType: 'DISTRIBUTION', name: 'Distribution', sortOrder: 10, isDefault: false },
          { stageType: 'COMPLETED', name: 'Completed', sortOrder: 11, isDefault: false },
        ];

        await prisma.stageTemplate.createMany({ data: defaultStages });
        templates = await prisma.stageTemplate.findMany({ orderBy: { sortOrder: 'asc' } });
      }

      return NextResponse.json({ templates });
    }

    // Admin: Get all queries
    if (path === '/admin/queries') {
      const queries = await prisma.query.findMany({
        include: {
          author: { select: { name: true, email: true } },
          book: { select: { title: true } },
          assignedTo: { select: { name: true } },
          comments: { orderBy: { createdAt: 'asc' } },
        },
        orderBy: { createdAt: 'desc' },
      });

      return NextResponse.json({ queries });
    }

    // Admin: Get CRM leads
    if (path === '/admin/leads') {
      const url = new URL(request.url);
      const statusFilter = url.searchParams.get('status');
      const dateFrom = url.searchParams.get('dateFrom');
      const dateTo = url.searchParams.get('dateTo');
      const assignedToId = url.searchParams.get('assignedToId');

      const where = {};
      
      // Status filter (Converted, Lost, Open)
      if (statusFilter && statusFilter !== 'all') {
        if (statusFilter === 'OPEN') {
          where.status = { notIn: ['CONVERTED', 'LOST'] };
        } else {
          where.status = statusFilter;
        }
      }

      // Date range filter
      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = new Date(dateFrom);
        if (dateTo) where.createdAt.lte = new Date(dateTo + 'T23:59:59');
      }

      // Assigned to filter
      if (assignedToId && assignedToId !== 'all') {
        where.assignedToId = assignedToId;
      }

      const leads = await prisma.lead.findMany({
        where,
        include: {
          assignedTo: { select: { id: true, name: true } },
          activities: { orderBy: { createdAt: 'desc' }, take: 5 },
          notes: { orderBy: { createdAt: 'desc' } },
          stageHistory: { orderBy: { movedAt: 'desc' } },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Map status to stage for frontend compatibility
      const mappedLeads = leads.map(lead => ({
        ...lead,
        stage: lead.status, // Map status to stage
      }));

      // Calculate summary
      const allLeads = await prisma.lead.findMany();
      const summary = {
        total: allLeads.length,
        new: allLeads.filter(l => l.status === 'NEW').length,
        contacted: allLeads.filter(l => l.status === 'CONTACTED').length,
        interested: allLeads.filter(l => l.status === 'INTERESTED').length,
        negotiating: allLeads.filter(l => l.status === 'NEGOTIATING').length,
        converted: allLeads.filter(l => l.status === 'CONVERTED').length,
        lost: allLeads.filter(l => l.status === 'LOST').length,
      };

      return NextResponse.json({ leads: mappedLeads, summary });
    }

    // GET /api/admin/lead-stages - Get custom lead stages
    if (path === '/admin/lead-stages') {
      const stagesSetting = await prisma.siteSetting.findUnique({
        where: { key: 'leadStages' },
      });

      const defaultStages = [
        { id: 'NEW', name: 'New', color: 'blue' },
        { id: 'CONTACTED', name: 'Contacted', color: 'yellow' },
        { id: 'INTERESTED', name: 'Interested', color: 'green' },
        { id: 'NEGOTIATING', name: 'Negotiating', color: 'purple' },
        { id: 'CONVERTED', name: 'Converted', color: 'emerald' },
        { id: 'LOST', name: 'Lost', color: 'red' },
      ];

      return NextResponse.json({ stages: stagesSetting?.value || defaultStages });
    }

    // GET /api/admin/notifications - Get all notifications sent
    if (path === '/admin/notifications') {
      const notifications = await prisma.notification.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
          user: { select: { id: true, name: true, authorUid: true } },
        },
      });

      return NextResponse.json({ notifications });
    }

    // GET /api/admin/site-settings - Get all site settings
    if (path === '/admin/site-settings') {
      const allSettings = await prisma.siteSetting.findMany();
      
      const settings = {};
      for (const s of allSettings) {
        settings[s.key] = s.value;
      }

      return NextResponse.json({ settings });
    }

    // Admin: Get all categories (with book count)
    if (path === '/admin/categories') {
      const categories = await prisma.category.findMany({
        orderBy: { sortOrder: 'asc' },
        include: {
          children: {
            orderBy: { sortOrder: 'asc' },
            include: {
              _count: { select: { books: true } },
            },
          },
          _count: { select: { books: true } },
        },
      });

      const topLevel = categories.filter(c => !c.parentId);
      return NextResponse.json({ categories: topLevel });
    }

    // Admin: Dashboard stats
    if (path === '/admin/stats') {
      const [totalBooks, totalAuthors, totalOrders, pendingQueries, newLeads] = await Promise.all([
        prisma.book.count(),
        prisma.user.count({ where: { role: 'AUTHOR' } }),
        prisma.order.count({ where: { status: 'PAID' } }),
        prisma.query.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
        prisma.lead.count({ where: { status: 'NEW' } }),
      ]);

      // Books by status
      const booksByStatus = await prisma.book.groupBy({
        by: ['status'],
        _count: true,
      });

      // Recent orders
      const recentOrders = await prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true } },
          items: { select: { book: { select: { title: true } } } },
        },
      });

      return NextResponse.json({
        totalBooks,
        totalAuthors,
        totalOrders,
        pendingQueries,
        newLeads,
        booksByStatus,
        recentOrders,
      });
    }

    // ==================== ADMIN USERS API ====================
    
    // GET /api/admin/users - List all users with filters
    if (path === '/admin/users') {
      const url = new URL(request.url);
      const role = url.searchParams.get('role');
      const search = url.searchParams.get('search');
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const skip = (page - 1) * limit;

      const where = {};
      if (role && role !== 'all') where.role = role;
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { authorUid: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            authorUid: true,
            email: true,
            name: true,
            phone: true,
            role: true,
            isActive: true,
            isBlogWriter: true,
            importSource: true,
            createdAt: true,
            _count: {
              select: {
                books: true,
                bookAuthorships: true,
                royalties: true,
              },
            },
          },
        }),
        prisma.user.count({ where }),
      ]);

      // Calculate total royalties per user
      const usersWithRoyalties = await Promise.all(
        users.map(async (user) => {
          const royaltyAgg = await prisma.royalty.aggregate({
            where: { authorId: user.id },
            _sum: { amount: true },
          });
          const paidAgg = await prisma.royalty.aggregate({
            where: { authorId: user.id, isPaid: true },
            _sum: { amount: true },
          });
          return {
            ...user,
            totalRoyalty: royaltyAgg._sum.amount || 0,
            paidRoyalty: paidAgg._sum.amount || 0,
            unpaidRoyalty: (royaltyAgg._sum.amount || 0) - (paidAgg._sum.amount || 0),
          };
        })
      );

      return NextResponse.json({
        users: usersWithRoyalties,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    }

    // GET /api/admin/users/[id] - Single user details
    if (path.startsWith('/admin/users/') && pathSegments.length === 3 && pathSegments[2] !== 'import') {
      const userId = pathSegments[2];

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          books: {
            select: { id: true, title: true, status: true, isbnPaperback: true },
          },
          bookAuthorships: {
            include: {
              book: { select: { id: true, title: true, status: true, isbnPaperback: true } },
            },
          },
          royalties: {
            orderBy: { createdAt: 'desc' },
            take: 20,
            include: {
              book: { select: { id: true, title: true } },
            },
          },
          bankDetails: true,
        },
      });

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Calculate royalty summary
      const royaltyAgg = await prisma.royalty.aggregate({
        where: { authorId: userId },
        _sum: { amount: true },
      });
      const paidAgg = await prisma.royalty.aggregate({
        where: { authorId: userId, isPaid: true },
        _sum: { amount: true },
      });

      const { password: _, ...userWithoutPassword } = user;
      return NextResponse.json({
        user: {
          ...userWithoutPassword,
          totalRoyalty: royaltyAgg._sum.amount || 0,
          paidRoyalty: paidAgg._sum.amount || 0,
          unpaidRoyalty: (royaltyAgg._sum.amount || 0) - (paidAgg._sum.amount || 0),
        },
      });
    }

    // ==================== ADMIN ORDERS API ====================

    // GET /api/admin/orders - List all orders
    if (path === '/admin/orders') {
      const url = new URL(request.url);
      const status = url.searchParams.get('status');
      const search = url.searchParams.get('search');
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const skip = (page - 1) * limit;

      const where = {};
      if (status && status !== 'all') where.status = status;
      if (search) {
        where.OR = [
          { orderNumber: { contains: search, mode: 'insensitive' } },
          { shippingName: { contains: search, mode: 'insensitive' } },
          { shippingEmail: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, name: true, email: true, authorUid: true } },
            items: {
              include: {
                book: { select: { id: true, title: true, coverImage: true } },
              },
            },
            currentStage: true,
            stageHistory: {
              orderBy: { movedAt: 'desc' },
              take: 5,
              include: { stage: true },
            },
          },
        }),
        prisma.order.count({ where }),
      ]);

      return NextResponse.json({
        orders,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    }

    // GET /api/admin/orders/stages - Get order stages
    if (path === '/admin/orders/stages') {
      const stages = await prisma.orderStage.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      });
      return NextResponse.json({ stages });
    }

    // GET /api/admin/orders/[id] - Single order details
    if (path.startsWith('/admin/orders/') && pathSegments.length === 3 && pathSegments[2] !== 'stages') {
      const orderId = pathSegments[2];

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          user: { select: { id: true, name: true, email: true, authorUid: true, phone: true } },
          items: {
            include: {
              book: true,
            },
          },
          currentStage: true,
          stageHistory: {
            orderBy: { movedAt: 'desc' },
            include: { stage: true },
          },
        },
      });

      if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      return NextResponse.json({ order });
    }

    // ==================== ADMIN ROYALTIES API ====================

    // GET /api/admin/royalties - List royalties with filters
    if (path === '/admin/royalties') {
      const url = new URL(request.url);
      const authorUid = url.searchParams.get('authorUid');
      const authorId = url.searchParams.get('authorId');
      const bookId = url.searchParams.get('bookId');
      const period = url.searchParams.get('period');
      const isPaid = url.searchParams.get('isPaid');
      const bucket = url.searchParams.get('bucket');
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const skip = (page - 1) * limit;

      const where = {};
      if (authorUid) where.authorUid = authorUid;
      if (authorId) where.authorId = authorId;
      if (bookId) where.bookId = bookId;
      if (period) where.period = period;
      if (isPaid === 'true') where.isPaid = true;
      if (isPaid === 'false') where.isPaid = false;
      if (bucket) where.bucket = bucket;

      const [royalties, total, aggregates] = await Promise.all([
        prisma.royalty.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            author: { 
              select: { 
                id: true, 
                name: true, 
                email: true, 
                authorUid: true,
                bankDetails: {
                  select: { accountNumber: true, ifscCode: true, accountName: true, bankName: true }
                }
              } 
            },
            book: { select: { id: true, title: true, isbn: true, isbnPaperback: true, isbnHardcover: true } },
          },
        }),
        prisma.royalty.count({ where }),
        prisma.royalty.aggregate({
          where,
          _sum: { amount: true, saleAmount: true },
        }),
      ]);

      // Get paid vs unpaid breakdown
      const paidAgg = await prisma.royalty.aggregate({
        where: { ...where, isPaid: true },
        _sum: { amount: true },
      });

      return NextResponse.json({
        royalties,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        summary: {
          totalAmount: aggregates._sum.amount || 0,
          totalSales: aggregates._sum.saleAmount || 0,
          paidAmount: paidAgg._sum.amount || 0,
          pendingAmount: (aggregates._sum.amount || 0) - (paidAgg._sum.amount || 0),
        },
      });
    }

    // GET /api/admin/royalties/periods - Get available periods
    if (path === '/admin/royalties/periods') {
      const periods = await prisma.royalty.groupBy({
        by: ['period'],
        _sum: { amount: true },
        orderBy: { period: 'desc' },
      });

      return NextResponse.json({
        periods: periods.filter(p => p.period).map(p => ({
          period: p.period,
          totalAmount: p._sum.amount || 0,
        })),
      });
    }

    // GET /api/admin/royalties/by-author - Royalties grouped by author
    if (path === '/admin/royalties/by-author') {
      const url = new URL(request.url);
      const period = url.searchParams.get('period');

      const where = period ? { period } : {};

      const royalties = await prisma.royalty.groupBy({
        by: ['authorId', 'authorUid'],
        where,
        _sum: { amount: true, saleAmount: true },
        _count: true,
      });

      // Get author details
      const authorIds = royalties.map(r => r.authorId);
      const authors = await prisma.user.findMany({
        where: { id: { in: authorIds } },
        select: { id: true, name: true, email: true, authorUid: true },
      });

      const authorsMap = new Map(authors.map(a => [a.id, a]));

      return NextResponse.json({
        royaltiesByAuthor: royalties.map(r => ({
          author: authorsMap.get(r.authorId),
          totalAmount: r._sum.amount || 0,
          totalSales: r._sum.saleAmount || 0,
          count: r._count,
        })),
      });
    }

    // ==================== ADMIN PACKAGES API ====================

    // GET /api/admin/packages - List all packages (including inactive)
    if (path === '/admin/packages') {
      const packages = await prisma.publishingPackage.findMany({
        orderBy: { sortOrder: 'asc' },
      });
      return NextResponse.json({ packages });
    }

    // GET /api/admin/packages/[id] - Single package
    if (path.startsWith('/admin/packages/') && pathSegments.length === 3) {
      const packageId = pathSegments[2];

      const pkg = await prisma.publishingPackage.findUnique({
        where: { id: packageId },
      });

      if (!pkg) {
        return NextResponse.json({ error: 'Package not found' }, { status: 404 });
      }

      return NextResponse.json({ package: pkg });
    }

    // Get publishing packages
    if (path === '/packages') {
      const packages = await prisma.publishingPackage.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      });

      return NextResponse.json({ packages });
    }

    // Get blog posts
    if (path === '/blog') {
      const { searchParams } = new URL(request.url);
      const category = searchParams.get('category');

      const where = { isPublished: true };
      if (category) where.category = category;

      const posts = await prisma.blogPost.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
      });

      return NextResponse.json({ posts });
    }

    // Payment status check
    if (path === '/payment/status') {
      return NextResponse.json({
        configured: isRazorpayConfigured(),
        message: isRazorpayConfigured()
          ? 'Razorpay is configured and ready'
          : 'Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to enable payments.',
      });
    }

    // ==================== NEW API ROUTES ====================

    // GET /api/settings
    if (path === '/settings') {
      const { searchParams } = new URL(request.url);
      const category = searchParams.get('category');
      const key = searchParams.get('key');

      if (key) {
        const value = await getSetting(key);
        return NextResponse.json({ key, value });
      }

      if (category) {
        const settings = await getSettingsByCategory(category);
        return NextResponse.json({ settings });
      }

      const allSettings = await prisma.siteSetting.findMany();
      return NextResponse.json({ settings: allSettings });
    }

    // GET /api/addons
    if (path === '/addons') {
      const { searchParams } = new URL(request.url);
      const serviceType = searchParams.get('serviceType');

      const where = { isActive: true };
      if (serviceType) {
        where.serviceType = serviceType;
      }

      const addOns = await prisma.serviceAddOn.findMany({
        where,
        orderBy: { sortOrder: 'asc' },
      });

      return NextResponse.json({ addOns });
    }

    // GET /api/reviews
    if (path === '/reviews') {
      const { searchParams } = new URL(request.url);
      const displayOn = searchParams.get('displayOn');
      const bookId = searchParams.get('bookId');
      const featured = searchParams.get('featured');

      const where = { isApproved: true };
      if (bookId) where.bookId = bookId;
      if (featured === 'true') where.isFeatured = true;

      let reviews = await prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 20,
      });

      if (displayOn) {
        reviews = reviews.filter(r => {
          const displays = r.displayOn || [];
          return displays.includes(displayOn);
        });
      }

      return NextResponse.json({ reviews });
    }

    // GET /api/categories
    if (path === '/categories') {
      const categories = await prisma.category.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        include: {
          children: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
      });

      const topLevel = categories.filter(c => !c.parentId);
      return NextResponse.json({ categories: topLevel });
    }

    // GET /api/anthology/count
    if (path === '/anthology/count') {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const count = await prisma.anthologySubmission.count({
        where: {
          createdAt: { gte: twentyFourHoursAgo },
        },
      });

      return NextResponse.json({ count, period: '24h' });
    }

    // GET /api/discounts
    if (path === '/discounts') {
      const { searchParams } = new URL(request.url);
      const code = searchParams.get('code');
      const appliesTo = searchParams.get('appliesTo');

      if (code) {
        const discount = await prisma.discount.findUnique({
          where: { code },
        });

        if (!discount || !discount.isActive) {
          return NextResponse.json({ valid: false, error: 'Invalid or expired code' });
        }

        if (discount.expiresAt && new Date() > discount.expiresAt) {
          return NextResponse.json({ valid: false, error: 'Code has expired' });
        }

        if (discount.maxUses && discount.usedCount >= discount.maxUses) {
          return NextResponse.json({ valid: false, error: 'Code usage limit reached' });
        }

        return NextResponse.json({ valid: true, discount });
      }

      const where = { isActive: true };
      if (appliesTo) {
        where.appliesTo = { in: [appliesTo, 'all'] };
      }

      const discounts = await prisma.discount.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      return NextResponse.json({ discounts });
    }

    // GET /api/homepage - Homepage data
    if (path === '/homepage') {
      const showRecentReleases = await getSetting('homepage.show_recent_releases');
      const showBestSellers = await getSetting('homepage.show_best_sellers');
      const bestSellersMode = await getSetting('homepage.best_sellers_mode');
      const showLiveCounter = await getSetting('homepage.show_live_counter');
      const publishingSteps = await getSetting('homepage.publishing_steps');

      const data = {
        settings: {
          showRecentReleases,
          showBestSellers,
          bestSellersMode,
          showLiveCounter,
          publishingSteps,
        },
      };

      if (showRecentReleases) {
        data.recentReleases = await prisma.book.findMany({
          where: {
            isPublic: true,
            isAuthorCopy: false,
            status: 'PUBLISHED',
          },
          orderBy: { publishedDate: 'desc' },
          take: 8,
          select: {
            id: true,
            title: true,
            coverImage: true,
            category: true,
            genre: true,
            author: { select: { name: true } },
          },
        });
      }

      if (showBestSellers) {
        if (bestSellersMode === 'manual') {
          data.bestSellers = await prisma.book.findMany({
            where: {
              isPublic: true,
              isAuthorCopy: false,
              isBestSeller: true,
              bestSellerManual: true,
            },
            take: 8,
            select: {
              id: true,
              title: true,
              coverImage: true,
              category: true,
              genre: true,
              author: { select: { name: true } },
            },
          });
        } else {
          data.bestSellers = await prisma.book.findMany({
            where: {
              isPublic: true,
              isAuthorCopy: false,
            },
            orderBy: { salesCount: 'desc' },
            take: 8,
            select: {
              id: true,
              title: true,
              coverImage: true,
              category: true,
              genre: true,
              author: { select: { name: true } },
            },
          });
        }
      }

      if (showLiveCounter) {
        data.booksPublished = await prisma.book.count({
          where: { status: 'PUBLISHED' },
        });
      }

      data.reviews = await prisma.review.findMany({
        where: {
          isApproved: true,
          isFeatured: true,
        },
        take: 6,
      });

      return NextResponse.json(data);
    }

    // ==================== BLOG SYSTEM APIs ====================

    // GET /api/blog - List published blog posts (public)
    if (path === '/blog') {
      const url = new URL(request.url);
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '12');
      const category = url.searchParams.get('category');
      const skip = (page - 1) * limit;

      const where = { isPublished: true };
      if (category) where.category = category;

      const [posts, total] = await Promise.all([
        prisma.blogPost.findMany({
          where,
          orderBy: { publishedAt: 'desc' },
          skip,
          take: limit,
          select: {
            id: true,
            title: true,
            slug: true,
            excerpt: true,
            coverImage: true,
            authorName: true,
            category: true,
            tags: true,
            views: true,
            publishedAt: true,
            _count: { select: { comments: { where: { isApproved: true } }, likes: true } },
          },
        }),
        prisma.blogPost.count({ where }),
      ]);

      return NextResponse.json({
        posts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    }

    // GET /api/blog/[slug] - Single blog post (public)
    if (path.startsWith('/blog/') && pathSegments.length === 2 && pathSegments[1] !== 'categories') {
      const slug = pathSegments[1];

      const post = await prisma.blogPost.findUnique({
        where: { slug },
        include: {
          comments: {
            where: { isApproved: true },
            orderBy: { createdAt: 'desc' },
          },
          _count: { select: { likes: true } },
        },
      });

      if (!post || !post.isPublished) {
        return NextResponse.json({ error: 'Post not found' }, { status: 404 });
      }

      // Increment views
      await prisma.blogPost.update({
        where: { id: post.id },
        data: { views: { increment: 1 } },
      });

      // Get linked book if exists
      let linkedBook = null;
      if (post.linkedBookId) {
        linkedBook = await prisma.book.findUnique({
          where: { id: post.linkedBookId },
          select: {
            id: true,
            title: true,
            coverImage: true,
            author: { select: { name: true } },
          },
        });
      }

      return NextResponse.json({ post: { ...post, linkedBook } });
    }

    // GET /api/blog/categories - Blog categories
    if (path === '/blog/categories') {
      const categories = await prisma.blogPost.groupBy({
        by: ['category'],
        where: { isPublished: true, category: { not: null } },
        _count: { category: true },
      });

      return NextResponse.json({
        categories: categories.filter(c => c.category).map(c => ({
          name: c.category,
          count: c._count.category,
        })),
      });
    }

    // GET /api/admin/blog - All blog posts (admin)
    if (path === '/admin/blog') {
      const posts = await prisma.blogPost.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { comments: true, likes: true } },
        },
      });

      return NextResponse.json({ posts });
    }

    // GET /api/admin/blog/comments - Pending comments (admin) - MUST BE BEFORE /admin/blog/[id]
    if (path === '/admin/blog/comments') {
      const url = new URL(request.url);
      const approved = url.searchParams.get('approved');

      const where = {};
      if (approved === 'true') where.isApproved = true;
      else if (approved === 'false') where.isApproved = false;

      const comments = await prisma.blogComment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          post: { select: { id: true, title: true, slug: true } },
        },
      });

      return NextResponse.json({ comments });
    }

    // GET /api/admin/blog/[id] - Single blog post for editing (admin)
    if (path.startsWith('/admin/blog/') && pathSegments.length === 3) {
      const postId = pathSegments[2];

      const post = await prisma.blogPost.findUnique({
        where: { id: postId },
        include: {
          comments: { orderBy: { createdAt: 'desc' } },
        },
      });

      if (!post) {
        return NextResponse.json({ error: 'Post not found' }, { status: 404 });
      }

      return NextResponse.json({ post });
    }

    // GET /api/admin/guest-posts - Guest post submissions (admin)
    if (path === '/admin/guest-posts') {
      const url = new URL(request.url);
      const status = url.searchParams.get('status') || 'pending';

      const guestPosts = await prisma.guestPost.findMany({
        where: status === 'all' ? {} : { status },
        orderBy: { createdAt: 'desc' },
      });

      return NextResponse.json({ guestPosts });
    }

    // GET /api/anthology/stats - Anthology submission stats
    if (path === '/anthology/stats') {
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const [total, today] = await Promise.all([
        prisma.anthologySubmission.count(),
        prisma.anthologySubmission.count({
          where: { createdAt: { gte: twentyFourHoursAgo } },
        }),
      ]);

      return NextResponse.json({ total, today });
    }

    // GET /api/admin/anthology - Anthology submissions (admin)
    if (path === '/admin/anthology') {
      const submissions = await prisma.anthologySubmission.findMany({
        orderBy: { createdAt: 'desc' },
      });

      return NextResponse.json({ submissions });
    }

    // GET /api/shop/books
    if (path === '/shop/books') {
      const { searchParams } = new URL(request.url);
      const search = searchParams.get('search');
      const category = searchParams.get('category');
      const userId = searchParams.get('userId'); // For author copies visibility

      const where = {
        isPublic: true,
        status: 'PUBLISHED',
      };

      // Only show author copies to logged-in matching authors
      if (!userId) {
        where.isAuthorCopy = false;
      }

      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { isbn: { contains: search, mode: 'insensitive' } },
          { author: { name: { contains: search, mode: 'insensitive' } } },
        ];
      }

      if (category) {
        where.category = category;
      }

      const books = await prisma.book.findMany({
        where,
        include: {
          author: { select: { id: true, name: true } },
          externalLinks: true,
          categories: {
            include: { category: true },
          },
        },
        orderBy: { publishedDate: 'desc' },
      });

      // Filter author copies - only show to matching author
      const filteredBooks = books.filter(book => {
        if (book.isAuthorCopy) {
          return book.authorId === userId;
        }
        return true;
      });

      return NextResponse.json({ books: filteredBooks });
    }

    // ============================================
    // AUTHOR API ROUTES
    // ============================================

    // GET /api/author/manuscripts - Get author's manuscripts
    if (path === '/author/manuscripts') {
      const url = new URL(request.url);
      const authorIdParam = url.searchParams.get('authorId');
      const userId = authorIdParam || request.headers.get('x-user-id');
      
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const manuscripts = await prisma.manuscript.findMany({
        where: { authorId: userId },
        include: {
          book: { select: { id: true, title: true } },
        },
        orderBy: { updatedAt: 'desc' },
      });

      return NextResponse.json({ manuscripts });
    }

    // GET /api/author/queries - Get author's queries
    if (path === '/author/queries') {
      const userId = request.headers.get('x-user-id');
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const queries = await prisma.query.findMany({
        where: { authorId: userId },
        include: {
          book: { select: { id: true, title: true } },
          comments: {
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return NextResponse.json({ queries });
    }

    // GET /api/author/orders - Get author's orders
    if (path === '/author/orders') {
      const userId = request.headers.get('x-user-id');
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const orders = await prisma.order.findMany({
        where: { userId },
        include: {
          items: {
            include: {
              book: { select: { id: true, title: true, coverImage: true } },
            },
          },
          currentStage: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return NextResponse.json({ orders });
    }

    // GET /api/author/royalties - Get author's royalties with daily breakdown
    if (path === '/author/royalties') {
      const userId = request.headers.get('x-user-id');
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const royalties = await prisma.royalty.findMany({
        where: { authorId: userId },
        include: {
          book: { select: { id: true, title: true, isbn: true, isbnPaperback: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Group by period for monthly breakdown
      const byPeriod = royalties.reduce((acc, r) => {
        const period = r.period || 'Unknown';
        if (!acc[period]) acc[period] = { total: 0, paid: 0, pending: 0, items: [] };
        acc[period].total += r.amount;
        if (r.isPaid) acc[period].paid += r.amount;
        else acc[period].pending += r.amount;
        acc[period].items.push(r);
        return acc;
      }, {});

      // Group by day for daily breakdown (recent 30 days)
      const last30Days = new Date();
      last30Days.setDate(last30Days.getDate() - 30);
      const recentRoyalties = royalties.filter(r => new Date(r.createdAt) >= last30Days);
      const byDay = recentRoyalties.reduce((acc, r) => {
        const day = new Date(r.createdAt).toISOString().split('T')[0];
        if (!acc[day]) acc[day] = { total: 0, items: [] };
        acc[day].total += r.amount;
        acc[day].items.push(r);
        return acc;
      }, {});

      const summary = {
        total: royalties.reduce((sum, r) => sum + r.amount, 0),
        paid: royalties.filter(r => r.isPaid).reduce((sum, r) => sum + r.amount, 0),
        pending: royalties.filter(r => !r.isPaid).reduce((sum, r) => sum + r.amount, 0),
        byBucket: {
          WEBSITE: royalties.filter(r => r.bucket === 'WEBSITE').reduce((sum, r) => sum + r.amount, 0),
          EBOOK: royalties.filter(r => r.bucket === 'EBOOK').reduce((sum, r) => sum + r.amount, 0),
          ECOMMERCE: royalties.filter(r => r.bucket === 'ECOMMERCE').reduce((sum, r) => sum + r.amount, 0),
        },
      };

      return NextResponse.json({ royalties, summary, byPeriod, byDay });
    }

    // GET /api/author/settings - Get author's settings
    if (path === '/author/settings') {
      const url = new URL(request.url);
      const authorIdParam = url.searchParams.get('authorId');
      const userId = authorIdParam || request.headers.get('x-user-id');
      
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          bankDetails: true,
        },
      });

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      return NextResponse.json({
        profile: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          alternateEmail: user.alternateEmail,
          alternatePhone: user.alternatePhone,
          bio: user.bio,
          website: user.website,
          publicUrl: user.publicUrl,
          socialLinks: user.socialLinks,
          authorUid: user.authorUid,
          profileImage: user.profileImage,
        },
        bankDetails: user.bankDetails,
        notifications: {
          emailNotifications: true,
          stageUpdates: true,
          queryResponses: true,
          royaltyAlerts: true,
          marketingEmails: false,
        },
      });
    }

    // GET /api/public/authors/[slug] - Public author profile
    if (path.startsWith('/public/authors/') && pathSegments.length === 3) {
      const slug = pathSegments[2];

      const author = await prisma.user.findFirst({
        where: {
          OR: [
            { publicUrl: slug },
            { id: slug },
          ],
          role: 'AUTHOR',
        },
        select: {
          id: true,
          name: true,
          bio: true,
          profileImage: true,
          website: true,
          socialLinks: true,
          email: true,
        },
      });

      if (!author) {
        return NextResponse.json({ error: 'Author not found' }, { status: 404 });
      }

      const books = await prisma.book.findMany({
        where: {
          authorId: author.id,
          isPublic: true,
          status: 'PUBLISHED',
        },
        include: {
          externalLinks: true,
        },
        orderBy: { publishedDate: 'desc' },
      });

      return NextResponse.json({ author, books });
    }

    // GET /api/admin/sales - Get all sales with enhanced data
    if (path === '/admin/sales') {
      const sales = await prisma.sale.findMany({
        include: {
          book: {
            include: {
              author: { select: { id: true, name: true, authorUid: true } },
              royaltyConfigs: true,
            },
          },
        },
        orderBy: { saleDate: 'desc' },
      });

      // Fetch all royalties for summary
      const royalties = await prisma.royalty.findMany({
        include: {
          author: { select: { id: true, name: true, authorUid: true } },
          book: { select: { id: true, title: true, isbn: true, isbnPaperback: true, isbnHardcover: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      const summary = {
        totalSales: sales.reduce((sum, s) => sum + s.totalAmount, 0),
        totalUnits: sales.reduce((sum, s) => sum + s.quantity, 0),
        totalRoyalties: royalties.reduce((sum, r) => sum + r.amount, 0),
        pendingRoyalties: royalties.filter(r => !r.isPaid).reduce((sum, r) => sum + r.amount, 0),
        paidRoyalties: royalties.filter(r => r.isPaid).reduce((sum, r) => sum + r.amount, 0),
      };

      return NextResponse.json({ sales, royalties, summary });
    }

    // GET /api/admin/royalties - Get all royalties with full details
    if (path === '/admin/royalties') {
      const url = new URL(request.url);
      const isPaidFilter = url.searchParams.get('isPaid');
      const platform = url.searchParams.get('platform');
      const period = url.searchParams.get('period');

      const where = {};
      if (isPaidFilter !== null && isPaidFilter !== 'all') {
        where.isPaid = isPaidFilter === 'true';
      }
      if (platform && platform !== 'all') {
        where.OR = [{ platform }, { bucket: platform }];
      }
      if (period && period !== 'all') {
        where.period = period;
      }

      const royalties = await prisma.royalty.findMany({
        where,
        include: {
          author: { select: { id: true, name: true, email: true, authorUid: true } },
          book: { select: { id: true, title: true, isbn: true, isbnPaperback: true, isbnHardcover: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      return NextResponse.json({ royalties });
    }

    // GET /api/admin/books/{bookId}/royalty-config - Get royalty configs for a book
    if (path.match(/^\/admin\/books\/[^/]+\/royalty-config$/)) {
      const bookId = pathSegments[2];
      
      const configs = await prisma.bookRoyaltyConfig.findMany({
        where: { bookId, isActive: true },
        orderBy: { platform: 'asc' },
      });

      return NextResponse.json({ configs });
    }

    // GET /api/admin/content - Get site content
    if (path === '/admin/content') {
      const contents = await prisma.siteContent.findMany({
        orderBy: { key: 'asc' },
      });

      return NextResponse.json({ contents });
    }

    // GET /api/admin/imports - Get import history
    if (path === '/admin/imports') {
      const imports = await prisma.importBatch.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      return NextResponse.json({ imports });
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (error) {
    console.error('API GET Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request, context) {
  const params = await context.params;
  const pathSegments = params?.path || [];
  const path = '/' + pathSegments.join('/');

  try {
    // Handle FormData routes BEFORE trying to parse JSON
    // Upload manuscript (with actual file storage)
    if (path === '/manuscripts') {
      const formData = await request.formData();
      const file = formData.get('file');
      const bookId = formData.get('bookId');
      const authorId = formData.get('authorId');
      const notes = formData.get('notes');

      if (!file || !bookId || !authorId) {
        return NextResponse.json(
          { error: 'File, book ID, and author ID are required' },
          { status: 400 }
        );
      }

      // Validate file type for Word documents
      const validTypes = [
        'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      if (!validTypes.includes(file.type)) {
        return NextResponse.json(
          { error: 'Only Word documents (.doc, .docx) are allowed' },
          { status: 400 }
        );
      }

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'File size cannot exceed 10MB' },
          { status: 400 }
        );
      }

      // Get current version
      const latestManuscript = await prisma.manuscript.findFirst({
        where: { bookId },
        orderBy: { version: 'desc' },
      });

      const version = (latestManuscript?.version || 0) + 1;

      // Generate unique filename and store the file
      const fileId = uuidv4();
      const ext = file.name.split('.').pop();
      const safeFileName = `${fileId}.${ext}`;
      const fileUrl = `/uploads/manuscripts/${safeFileName}`;
      
      // Write file to disk
      const fs = require('fs');
      const pathModule = require('path');
      const uploadsDir = pathModule.join(process.cwd(), 'public', 'uploads', 'manuscripts');
      
      // Ensure directory exists
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      // Write the file
      const buffer = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(pathModule.join(uploadsDir, safeFileName), buffer);

      const manuscript = await prisma.manuscript.create({
        data: {
          bookId,
          authorId,
          fileName: file.name,
          fileUrl,
          fileSize: file.size,
          fileType: file.type,
          version,
          status: 'UPLOADED',
          notes,
          isWordUpload: true,
        },
      });

      // Update book status if first manuscript
      if (version === 1) {
        await prisma.book.update({
          where: { id: bookId },
          data: { status: 'IN_PROGRESS' },
        });
      }

      return NextResponse.json({ manuscript });
    }

    // Parse body once for routes that need it
    let body = {};
    try {
      body = await request.json();
    } catch (e) {
      // Body might be form data or empty, which is fine
    }

    // User registration
    if (path === '/auth/register') {
      const { email, password, name, phone } = body;

      if (!email || !password || !name) {
        return NextResponse.json(
          { error: 'Email, password, and name are required' },
          { status: 400 }
        );
      }

      // Check if user exists
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return NextResponse.json(
          { error: 'User with this email already exists' },
          { status: 400 }
        );
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Generate public URL from name
      const baseUrl = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
      let publicUrl = baseUrl;
      let counter = 1;
      while (await prisma.user.findUnique({ where: { publicUrl } })) {
        publicUrl = `${baseUrl}-${counter}`;
        counter++;
      }

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          phone,
          role: 'AUTHOR',
          publicUrl,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          publicUrl: true,
        },
      });

      return NextResponse.json({ user, message: 'Registration successful' });
    }

    // Create book
    if (path === '/books') {
      const { title, subtitle, authorId, description, category, genre } = body;

      if (!title || !authorId) {
        return NextResponse.json(
          { error: 'Title and author ID are required' },
          { status: 400 }
        );
      }

      // Create book with publishing stages
      const book = await prisma.book.create({
        data: {
          title,
          subtitle,
          authorId,
          description,
          category,
          genre,
          status: 'DRAFT',
          publishingStages: {
            create: PUBLISHING_STAGES.map((stage) => ({
              stageType: stage.type,
              stageOrder: stage.order,
              status: stage.order === 1 ? 'IN_PROGRESS' : 'PENDING',
            })),
          },
        },
        include: {
          publishingStages: { orderBy: { stageOrder: 'asc' } },
        },
      });

      // Create notification for author
      await prisma.notification.create({
        data: {
          userId: authorId,
          type: 'SYSTEM',
          title: 'Book Created',
          message: `Your book "${title}" has been created. Start by uploading your manuscript.`,
          link: `/author/books/${book.id}`,
        },
      });

      return NextResponse.json({ book });
    }

    // Approve stage
    if (path === '/stages/approve') {
      
      const { stageId, authorNotes } = body;

      const stage = await prisma.publishingStage.update({
        where: { id: stageId },
        data: {
          status: 'APPROVED',
          authorNotes,
          completedAt: new Date(),
        },
      });

      // Move to next stage
      const nextStage = await prisma.publishingStage.findFirst({
        where: {
          bookId: stage.bookId,
          stageOrder: stage.stageOrder + 1,
        },
      });

      if (nextStage) {
        await prisma.publishingStage.update({
          where: { id: nextStage.id },
          data: { status: 'IN_PROGRESS', startedAt: new Date() },
        });
      }

      return NextResponse.json({ stage, message: 'Stage approved' });
    }

    // Raise query
    if (path === '/queries') {
      
      const { authorId, bookId, stageId, type, subject, description, priority } = body;

      if (!authorId || !subject || !description) {
        return NextResponse.json(
          { error: 'Author ID, subject, and description are required' },
          { status: 400 }
        );
      }

      const query = await prisma.query.create({
        data: {
          authorId,
          bookId,
          stageId,
          type: type || 'GENERAL',
          priority: priority || 'MEDIUM',
          subject,
          description,
          status: 'OPEN',
        },
      });

      // Update stage status if stage-specific query
      if (stageId) {
        await prisma.publishingStage.update({
          where: { id: stageId },
          data: { status: 'QUERY_RAISED' },
        });
      }

      return NextResponse.json({ query });
    }

    // Add query comment
    if (path === '/queries/comment') {
      
      const { queryId, userId, userName, userRole, comment, isInternal } = body;

      const queryComment = await prisma.queryComment.create({
        data: {
          queryId,
          userId,
          userName,
          userRole,
          comment,
          isInternal: isInternal || false,
        },
      });

      // Update query status
      await prisma.query.update({
        where: { id: queryId },
        data: { status: 'IN_PROGRESS' },
      });

      return NextResponse.json({ comment: queryComment });
    }

    // Create order
    if (path === '/orders') {
      
      const {
        userId,
        items,
        shippingName,
        shippingEmail,
        shippingPhone,
        shippingAddress,
        shippingCity,
        shippingState,
        shippingZipCode,
        shippingCountry,
      } = body;

      if (!userId || !items || items.length === 0) {
        return NextResponse.json(
          { error: 'User ID and items are required' },
          { status: 400 }
        );
      }

      // Calculate total
      let totalAmount = 0;
      const orderItems = [];

      for (const item of items) {
        const book = await prisma.book.findUnique({ where: { id: item.bookId } });
        if (!book) {
          return NextResponse.json(
            { error: `Book ${item.bookId} not found` },
            { status: 400 }
          );
        }

        const unitPrice = item.isAuthorCopy && book.authorCopyPrice
          ? book.authorCopyPrice
          : book.discountPrice || book.price;
        const itemTotal = unitPrice * item.quantity;
        totalAmount += itemTotal;

        orderItems.push({
          bookId: item.bookId,
          quantity: item.quantity,
          unitPrice,
          totalPrice: itemTotal,
        });
      }

      // Create order
      const order = await prisma.order.create({
        data: {
          userId,
          orderNumber: generateOrderNumber(),
          totalAmount,
          status: 'PENDING',
          shippingName,
          shippingEmail,
          shippingPhone,
          shippingAddress,
          shippingCity,
          shippingState,
          shippingZipCode,
          shippingCountry: shippingCountry || 'India',
          items: { create: orderItems },
        },
        include: { items: true },
      });

      // Create Razorpay order if configured
      if (isRazorpayConfigured()) {
        try {
          const razorpayOrder = await createOrder(
            totalAmount,
            'INR',
            order.orderNumber,
            { orderId: order.id, userId }
          );

          await prisma.order.update({
            where: { id: order.id },
            data: {
              razorpayOrderId: razorpayOrder.id,
              status: 'PAYMENT_PENDING',
            },
          });

          return NextResponse.json({
            order,
            razorpayOrderId: razorpayOrder.id,
            razorpayKeyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
            amount: totalAmount,
          });
        } catch (error) {
          console.error('Razorpay order creation failed:', error);
        }
      }

      return NextResponse.json({
        order,
        paymentDisabled: true,
        message: 'Order created but payment gateway not configured',
      });
    }

    // Verify payment
    if (path === '/payment/verify') {
      
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = body;

      if (!isRazorpayConfigured()) {
        return NextResponse.json(
          { error: 'Payment gateway not configured' },
          { status: 400 }
        );
      }

      // Verify signature
      const isValid = verifyPaymentSignature(
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
      );

      if (!isValid) {
        return NextResponse.json(
          { error: 'Invalid payment signature' },
          { status: 400 }
        );
      }

      // Update order
      const order = await prisma.order.update({
        where: { razorpayOrderId: razorpay_order_id },
        data: {
          status: 'PAID',
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
          paidAt: new Date(),
        },
        include: { items: { include: { book: true } }, user: true },
      });

      // Create royalty records for each item
      for (const item of order.items) {
        const royaltyRate = 0.10; // 10%
        const royaltyAmount = item.totalPrice * royaltyRate;

        await prisma.royalty.create({
          data: {
            authorId: item.book.authorId,
            bookId: item.bookId,
            orderId: order.id,
            amount: royaltyAmount,
            royaltyRate,
            saleAmount: item.totalPrice,
            period: new Date().toISOString().substring(0, 7),
          },
        });
      }

      return NextResponse.json({ success: true, order });
    }

    // CRM: Create lead
    if (path === '/leads') {
      
      const { name, email, phone, source, interestArea, notes, createdById } = body;

      if (!name || !email) {
        return NextResponse.json(
          { error: 'Name and email are required' },
          { status: 400 }
        );
      }

      const lead = await prisma.lead.create({
        data: {
          name,
          email,
          phone,
          source: source || 'WEBSITE',
          interestArea,
          notes,
          createdById,
          status: 'NEW',
        },
      });

      return NextResponse.json({ lead });
    }

    // Update profile
    if (path === '/profile') {
      
      const { userId, name, phone, bio, website, socialLinks, publicUrl } = body;

      if (!userId) {
        return NextResponse.json({ error: 'User ID required' }, { status: 400 });
      }

      // Check public URL uniqueness
      if (publicUrl) {
        const existing = await prisma.user.findFirst({
          where: { publicUrl, id: { not: userId } },
        });
        if (existing) {
          return NextResponse.json(
            { error: 'This profile URL is already taken' },
            { status: 400 }
          );
        }
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: { name, phone, bio, website, socialLinks, publicUrl },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          bio: true,
          website: true,
          socialLinks: true,
          publicUrl: true,
        },
      });

      return NextResponse.json({ user });
    }

    // Update bank details
    if (path === '/bank-details') {
      
      const { userId, accountName, accountNumber, bankName, ifscCode, branchName } = body;

      if (!userId || !accountName || !accountNumber || !bankName || !ifscCode) {
        return NextResponse.json(
          { error: 'All bank details are required' },
          { status: 400 }
        );
      }

      const bankDetails = await prisma.bankDetails.upsert({
        where: { userId },
        create: { userId, accountName, accountNumber, bankName, ifscCode, branchName },
        update: { accountName, accountNumber, bankName, ifscCode, branchName },
      });

      return NextResponse.json({ bankDetails });
    }

    // Mark notifications as read
    if (path === '/notifications/read') {
      
      const { notificationIds, userId } = body;

      if (notificationIds && notificationIds.length > 0) {
        await prisma.notification.updateMany({
          where: { id: { in: notificationIds } },
          data: { isRead: true, readAt: new Date() },
        });
      } else if (userId) {
        await prisma.notification.updateMany({
          where: { userId, isRead: false },
          data: { isRead: true, readAt: new Date() },
        });
      }

      return NextResponse.json({ success: true });
    }

    // POST /api/admin/notifications - Send notification to authors
    if (path === '/admin/notifications') {
      const { targetUserIds, targetAll, type, title, message, link, ctaText } = body;

      if (!title || !message) {
        return NextResponse.json({ error: 'title and message are required' }, { status: 400 });
      }

      let userIds = [];

      if (targetAll) {
        // Send to all authors
        const authors = await prisma.user.findMany({
          where: { role: 'AUTHOR', isActive: true },
          select: { id: true },
        });
        userIds = authors.map(a => a.id);
      } else if (targetUserIds && Array.isArray(targetUserIds)) {
        userIds = targetUserIds;
      } else {
        return NextResponse.json({ error: 'targetUserIds or targetAll required' }, { status: 400 });
      }

      // Create notifications
      const notifications = [];
      for (const userId of userIds) {
        const notification = await prisma.notification.create({
          data: {
            userId,
            type: type || 'GENERAL',
            title,
            message: ctaText ? `${message}\n\n${ctaText}` : message,
            link,
          },
        });
        notifications.push(notification);
      }

      return NextResponse.json({ success: true, count: notifications.length });
    }

    // ==================== NEW POST ROUTES ====================

    // POST /api/settings
    if (path === '/settings') {
      const { key, value, settings } = body;

      if (settings) {
        const results = [];
        for (const [k, v] of Object.entries(settings)) {
          const result = await setSetting(k, v);
          results.push(result);
        }
        return NextResponse.json({ success: true, count: results.length });
      }

      if (key) {
        const result = await setSetting(key, value);
        return NextResponse.json({ success: true, setting: result });
      }

      return NextResponse.json({ error: 'Key or settings required' }, { status: 400 });
    }

    // POST /api/enrollments
    if (path === '/enrollments') {
      const {
        serviceType,
        name,
        email,
        phone,
        amount,
        addOns,
        metadata,
        userId,
        discountCode,
      } = body;

      if (!serviceType || !name || !email || !phone) {
        return NextResponse.json(
          { error: 'Service type, name, email, and phone are required' },
          { status: 400 }
        );
      }

      let totalAmount = amount || 0;
      let addOnDetails = [];

      if (addOns && Object.keys(addOns).length > 0) {
        for (const [addOnId, quantity] of Object.entries(addOns)) {
          const addOn = await prisma.serviceAddOn.findUnique({
            where: { id: addOnId },
          });
          if (addOn) {
            const addOnTotal = addOn.basePrice * (quantity || 1);
            totalAmount += addOnTotal;
            addOnDetails.push({
              addOnId,
              name: addOn.name,
              quantity: quantity || 1,
              price: addOn.basePrice,
              total: addOnTotal,
            });
          }
        }
      }

      let discountAmount = 0;
      if (discountCode) {
        const discount = await prisma.discount.findUnique({
          where: { code: discountCode },
        });
        if (discount && discount.isActive) {
          if (discount.discountType === 'percentage') {
            discountAmount = totalAmount * (discount.discountValue / 100);
          } else {
            discountAmount = discount.discountValue;
          }
          totalAmount -= discountAmount;
        }
      }

      const enrollment = await prisma.serviceEnrollment.create({
        data: {
          userId,
          serviceType,
          name,
          email,
          phone,
          amount: body.amount || 0,
          discountCode,
          discountAmount,
          finalAmount: Math.max(0, totalAmount),
          addOns: addOnDetails.length > 0 ? addOnDetails : null,
          metadata,
          status: 'pending',
        },
      });

      await prisma.lead.create({
        data: {
          name,
          email,
          phone,
          source: 'WEBSITE',
          interestArea: serviceType === 'free_publishing' ? 'Free Publishing' : 'Writing Challenge',
          notes: `Enrollment ID: ${enrollment.id}`,
          status: 'NEW',
        },
      });

      await syncLeadToSheets({
        name,
        email,
        phone,
        source: 'WEBSITE',
        interestArea: serviceType,
        status: 'NEW',
      });

      return NextResponse.json({
        enrollment,
        paymentRequired: totalAmount > 0,
        amount: totalAmount,
      });
    }

    // POST /api/anthology
    if (path === '/anthology') {
      const {
        name: anthName,
        phone: anthPhone,
        isWhatsApp,
        whatsAppNumber,
        email: anthEmail,
        instagramUsername,
        poetryTitle,
        poetryContent,
        bio,
        contactPreference,
      } = body;

      if (!anthName || !anthPhone || !anthEmail || !poetryTitle || !poetryContent || !contactPreference) {
        return NextResponse.json(
          { error: 'All required fields must be filled' },
          { status: 400 }
        );
      }

      const submission = await prisma.anthologySubmission.create({
        data: {
          name: anthName,
          phone: anthPhone,
          isWhatsApp: isWhatsApp !== false,
          whatsAppNumber: isWhatsApp === false ? whatsAppNumber : null,
          email: anthEmail,
          instagramUsername,
          poetryTitle,
          poetryContent,
          bio,
          contactPreference,
        },
      });

      await syncAnthologyToSheets(submission);

      return NextResponse.json({ submission, success: true });
    }

    // ==================== ADMIN STAGE TEMPLATES POST ROUTES ====================

    // POST /api/admin/stage-templates - Create new stage template
    if (path === '/admin/stage-templates') {
      const { stageType, name, description, isDefault, sortOrder } = body;

      if (!stageType || !name) {
        return NextResponse.json({ error: 'stageType and name are required' }, { status: 400 });
      }

      // Check if stageType already exists
      const existing = await prisma.stageTemplate.findUnique({ where: { stageType } });
      if (existing) {
        return NextResponse.json({ error: 'Stage type already exists' }, { status: 400 });
      }

      const template = await prisma.stageTemplate.create({
        data: {
          stageType,
          name,
          description,
          isDefault: isDefault || false,
          sortOrder: sortOrder || 99,
          isActive: true,
        },
      });

      return NextResponse.json({ template });
    }

    // POST /api/admin/books/[bookId]/stages - Add a stage to a book
    if (path.match(/\/admin\/books\/[^/]+\/stages$/) && pathSegments.length === 4) {
      const bookId = pathSegments[2];
      const { stageType, stageOrder } = body;

      if (!stageType) {
        return NextResponse.json({ error: 'stageType is required' }, { status: 400 });
      }

      // Check if stage already exists for this book
      const existing = await prisma.publishingStage.findFirst({
        where: { bookId, stageType },
      });
      if (existing) {
        return NextResponse.json({ error: 'Stage already exists for this book' }, { status: 400 });
      }

      // Get max order if not provided
      let order = stageOrder;
      if (!order) {
        const maxStage = await prisma.publishingStage.findFirst({
          where: { bookId },
          orderBy: { stageOrder: 'desc' },
        });
        order = (maxStage?.stageOrder || 0) + 1;
      }

      const stage = await prisma.publishingStage.create({
        data: {
          bookId,
          stageType,
          stageOrder: order,
          status: 'PENDING',
          isVisible: true,
        },
      });

      return NextResponse.json({ stage });
    }

    // POST /api/admin/books/[bookId]/stages/toggle - Enable/disable stages for a book
    if (path.match(/\/admin\/books\/[^/]+\/stages\/toggle$/) && pathSegments.length === 4) {
      const bookId = pathSegments[2];
      const { stageIds, visible } = body; // stageIds: array of stage IDs, visible: boolean

      if (!stageIds || !Array.isArray(stageIds)) {
        return NextResponse.json({ error: 'stageIds array required' }, { status: 400 });
      }

      await prisma.publishingStage.updateMany({
        where: {
          id: { in: stageIds },
          bookId: bookId,
        },
        data: { isVisible: visible },
      });

      return NextResponse.json({ success: true, count: stageIds.length });
    }

    // POST /api/admin/books/[bookId]/stages/[stageId]/approve - Author approves a stage (locks it)
    if (path.match(/\/admin\/books\/[^/]+\/stages\/[^/]+\/approve$/) && pathSegments.length === 5) {
      const bookId = pathSegments[2];
      const stageId = pathSegments[4];

      const stage = await prisma.publishingStage.findUnique({
        where: { id: stageId },
      });

      if (!stage || stage.bookId !== bookId) {
        return NextResponse.json({ error: 'Stage not found' }, { status: 404 });
      }

      if (stage.status !== 'AWAITING_APPROVAL') {
        return NextResponse.json({ error: 'Stage is not awaiting approval' }, { status: 400 });
      }

      const updatedStage = await prisma.publishingStage.update({
        where: { id: stageId },
        data: {
          status: 'APPROVED',
          isLocked: true,
          completedAt: new Date(),
        },
      });

      return NextResponse.json({ stage: updatedStage });
    }

    // ==================== ADMIN USERS POST ROUTES ====================

    // POST /api/admin/users - Create user (manual add)
    if (path === '/admin/users') {
      const { email, name, phone, role, isBlogWriter, alternateEmail, alternatePhone } = body;

      if (!email || !name) {
        return NextResponse.json({ error: 'Email and name are required' }, { status: 400 });
      }

      // Check if user exists
      const existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
      if (existingUser) {
        return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
      }

      // Generate Author UID
      const authorUid = await generateAuthorUid();

      // Generate public URL
      const baseUrl = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
      let publicUrl = baseUrl;
      let counter = 1;
      while (await prisma.user.findUnique({ where: { publicUrl } })) {
        publicUrl = `${baseUrl}-${counter}`;
        counter++;
      }

      const user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          name,
          password: '', // No password - user needs to set up
          phone,
          alternateEmail,
          alternatePhone,
          role: role || 'AUTHOR',
          isBlogWriter: isBlogWriter || false,
          authorUid,
          publicUrl,
          importSource: 'manual',
        },
        select: {
          id: true, authorUid: true, email: true, name: true, role: true, phone: true,
        },
      });

      return NextResponse.json({ user });
    }

    // POST /api/admin/users/import - CSV import users
    if (path === '/admin/users/import') {
      const { users: usersData, importedById } = body;

      if (!usersData || !Array.isArray(usersData)) {
        return NextResponse.json({ error: 'Users array is required' }, { status: 400 });
      }

      const results = { success: [], errors: [], skipped: [] };

      for (const userData of usersData) {
        try {
          const { email, name, phone, role } = userData;
          if (!email || !name) {
            results.errors.push({ email, error: 'Missing email or name' });
            continue;
          }

          // Check if exists
          const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
          if (existing) {
            results.skipped.push({ email, reason: 'Already exists', existingId: existing.id });
            continue;
          }

          const authorUid = await generateAuthorUid();
          const baseUrl = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
          let publicUrl = baseUrl;
          let counter = 1;
          while (await prisma.user.findUnique({ where: { publicUrl } })) {
            publicUrl = `${baseUrl}-${counter}`;
            counter++;
          }

          const user = await prisma.user.create({
            data: {
              email: email.toLowerCase(),
              name,
              password: '',
              phone,
              role: role || 'AUTHOR',
              authorUid,
              publicUrl,
              importSource: 'csv',
            },
          });

          results.success.push({ email, authorUid: user.authorUid, id: user.id });
        } catch (err) {
          results.errors.push({ email: userData.email, error: err.message });
        }
      }

      // Create import batch record
      await prisma.importBatch.create({
        data: {
          type: 'users',
          totalRows: usersData.length,
          successCount: results.success.length,
          errorCount: results.errors.length,
          status: 'completed',
          importedById: importedById || 'system',
          summary: results,
          completedAt: new Date(),
        },
      });

      return NextResponse.json({ results });
    }

    // POST /api/admin/users/[id]/link-books - Link books to user
    if (path.match(/^\/admin\/users\/[^/]+\/link-books$/)) {
      const userId = pathSegments[2];
      const { bookIds } = body;

      if (!bookIds || !Array.isArray(bookIds)) {
        return NextResponse.json({ error: 'bookIds array required' }, { status: 400 });
      }

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const results = await linkAuthorsToBook(bookIds[0], [userId]); // For now, link one book at a time
      
      return NextResponse.json({ success: true, linked: results.length });
    }

    // ==================== AUTHOR POST ROUTES ====================

    // POST /api/author/queries - Create query
    if (path === '/author/queries') {
      const userId = request.headers.get('x-user-id');
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const { subject, description, type, bookId, priority } = body;

      if (!subject || !description) {
        return NextResponse.json({ error: 'Subject and description required' }, { status: 400 });
      }

      const query = await prisma.query.create({
        data: {
          authorId: userId,
          subject,
          description,
          type: type || 'GENERAL',
          bookId: bookId || null,
          priority: priority || 'MEDIUM',
        },
      });

      return NextResponse.json({ query });
    }

    // POST /api/author/queries/[id]/comments - Add comment to query
    if (path.match(/^\/author\/queries\/[^/]+\/comments$/)) {
      const queryId = pathSegments[2];
      const userId = request.headers.get('x-user-id');
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const { comment } = body;
      if (!comment) {
        return NextResponse.json({ error: 'Comment required' }, { status: 400 });
      }

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const newComment = await prisma.queryComment.create({
        data: {
          queryId,
          userId,
          userName: user.name,
          userRole: user.role,
          comment,
        },
      });

      // Update query status
      await prisma.query.update({
        where: { id: queryId },
        data: { status: 'WAITING_RESPONSE' },
      });

      return NextResponse.json({ comment: newComment });
    }

    // POST /api/author/manuscripts - Create or update manuscript
    if (path === '/author/manuscripts') {
      const userId = request.headers.get('x-user-id');
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const { id, bookId, content, fileName, fileUrl, isWordUpload, status } = body;

      if (!bookId) {
        return NextResponse.json({ error: 'bookId required' }, { status: 400 });
      }

      // Check if updating existing manuscript
      if (id) {
        const updated = await prisma.manuscript.update({
          where: { id },
          data: {
            content: content || undefined,
            fileName: fileName || undefined,
            fileUrl: fileUrl || undefined,
            isWordUpload: isWordUpload || false,
            status: status || 'DRAFT',
          },
        });
        return NextResponse.json({ manuscript: updated });
      }

      // Create new manuscript
      const manuscript = await prisma.manuscript.create({
        data: {
          bookId,
          authorId: userId,
          fileName: fileName || 'manuscript',
          fileUrl: fileUrl || '',
          content: content || null,
          isWordUpload: isWordUpload || false,
          status: status || 'DRAFT',
        },
      });

      return NextResponse.json({ manuscript });
    }

    // POST /api/admin/content - Save site content
    if (path === '/admin/content') {
      const { key, content } = body;

      if (!key) {
        return NextResponse.json({ error: 'Key required' }, { status: 400 });
      }

      const existing = await prisma.siteContent.findUnique({ where: { key } });

      if (existing) {
        await prisma.siteContent.update({
          where: { key },
          data: { content },
        });
      } else {
        await prisma.siteContent.create({
          data: { key, content },
        });
      }

      return NextResponse.json({ success: true });
    }

    // POST /api/admin/imports/validate - Validate import data
    if (path === '/admin/imports/validate') {
      const { type, data, mapping } = body;

      if (!type || !data) {
        return NextResponse.json({ error: 'Type and data required' }, { status: 400 });
      }

      const errors = [];
      const warnings = [];
      let validCount = 0;

      // Validate based on type
      if (type === 'users') {
        for (let i = 0; i < data.length; i++) {
          const row = data[i];
          const email = row[mapping['Email*']];
          const name = row[mapping['Name*']];

          if (!email) {
            errors.push({ row: i + 2, message: 'Email is required' });
          } else if (!/\S+@\S+\.\S+/.test(email)) {
            errors.push({ row: i + 2, message: `Invalid email: ${email}` });
          } else {
            const existing = await prisma.user.findUnique({ where: { email } });
            if (existing) {
              warnings.push({ row: i + 2, message: `User already exists: ${email}` });
            } else {
              validCount++;
            }
          }

          if (!name) {
            errors.push({ row: i + 2, message: 'Name is required' });
          }
        }
      } else if (type === 'books') {
        for (let i = 0; i < data.length; i++) {
          const row = data[i];
          const title = row[mapping['Title*']];
          const authorRef = row[mapping['Author UID/Email*']];

          if (!title) {
            errors.push({ row: i + 2, message: 'Title is required' });
          } else {
            validCount++;
          }

          if (!authorRef) {
            warnings.push({ row: i + 2, message: 'No author specified' });
          }
        }
      } else if (type === 'sales') {
        for (let i = 0; i < data.length; i++) {
          const row = data[i];
          const isbn = row[mapping['ISBN*']];
          const platform = row[mapping['Platform*']];
          const amount = row[mapping['Amount*']];

          if (!isbn) {
            errors.push({ row: i + 2, message: 'ISBN is required' });
          }
          if (!platform) {
            errors.push({ row: i + 2, message: 'Platform is required' });
          }
          if (!amount || isNaN(parseFloat(amount))) {
            errors.push({ row: i + 2, message: 'Valid amount is required' });
          }

          if (isbn && platform && amount && !isNaN(parseFloat(amount))) {
            validCount++;
          }
        }
      }

      return NextResponse.json({ validCount, errors, warnings });
    }

    // POST /api/admin/imports/execute - Execute import
    if (path === '/admin/imports/execute') {
      const { type, data, mapping } = body;
      const importedById = request.headers.get('x-user-id') || 'system';

      if (!type || !data) {
        return NextResponse.json({ error: 'Type and data required' }, { status: 400 });
      }

      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      // Execute import based on type
      if (type === 'users') {
        for (const row of data) {
          try {
            const email = row[mapping['Email*']];
            const name = row[mapping['Name*']];
            const phone = row[mapping['Phone']];
            const role = row[mapping['Role']] || 'AUTHOR';

            if (!email || !name) continue;

            const existing = await prisma.user.findUnique({ where: { email } });
            if (existing) {
              errorCount++;
              errors.push({ email, message: 'Already exists' });
              continue;
            }

            // Generate author UID
            const seq = await prisma.authorUidSequence.upsert({
              where: { id: 'singleton' },
              update: { lastValue: { increment: 1 } },
              create: { id: 'singleton', lastValue: 1 },
            });
            const authorUid = `WP${String(seq.lastValue).padStart(5, '0')}`;

            await prisma.user.create({
              data: {
                email,
                name,
                phone,
                role: role.toUpperCase() === 'ADMIN' ? 'ADMIN' : role.toUpperCase() === 'TEAM' ? 'TEAM' : 'AUTHOR',
                password: await bcrypt.hash('temp123', 12),
                authorUid,
                importSource: 'csv',
              },
            });
            successCount++;
          } catch (e) {
            errorCount++;
            errors.push({ message: e.message });
          }
        }
      } else if (type === 'books') {
        for (const row of data) {
          try {
            const title = row[mapping['Title*']];
            const authorRef = row[mapping['Author UID/Email*']];
            const isbnPaperback = row[mapping['Paperback ISBN']];
            const isbnHardcover = row[mapping['Hardcover ISBN']];
            const category = row[mapping['Category']];
            const description = row[mapping['Description']];

            if (!title) continue;

            // Find author
            let author = null;
            if (authorRef) {
              author = await prisma.user.findFirst({
                where: {
                  OR: [
                    { email: authorRef },
                    { authorUid: authorRef },
                  ],
                },
              });
            }

            if (!author) {
              // Create placeholder author or skip
              errorCount++;
              errors.push({ title, message: 'Author not found' });
              continue;
            }

            await prisma.book.create({
              data: {
                title,
                authorId: author.id,
                isbnPaperback,
                isbnHardcover,
                category,
                description,
                status: 'DRAFT',
                importSource: 'csv',
              },
            });
            successCount++;
          } catch (e) {
            errorCount++;
            errors.push({ message: e.message });
          }
        }
      } else if (type === 'sales') {
        const batchId = `import-${Date.now()}`;
        for (const row of data) {
          try {
            const isbn = row[mapping['ISBN*']];
            const platform = row[mapping['Platform*']];
            const dateStr = row[mapping['Date*']];
            const quantity = parseInt(row[mapping['Quantity*']] || '1');
            const amount = parseFloat(row[mapping['Amount*']]);

            if (!isbn || !platform || isNaN(amount)) continue;

            // Find book by ISBN
            const book = await prisma.book.findFirst({
              where: {
                OR: [
                  { isbn },
                  { isbnPaperback: isbn },
                  { isbnHardcover: isbn },
                ],
              },
            });

            if (!book) {
              errorCount++;
              errors.push({ isbn, message: 'Book not found' });
              continue;
            }

            await prisma.sale.create({
              data: {
                bookId: book.id,
                isbnUsed: isbn,
                platform,
                saleDate: dateStr ? new Date(dateStr) : new Date(),
                quantity,
                unitPrice: amount / quantity,
                totalAmount: amount,
                importBatchId: batchId,
                importSource: 'csv',
              },
            });

            // Generate royalty
            const bucket = platform.toLowerCase().includes('website') ? 'WEBSITE' : 
                          platform.toLowerCase().includes('ebook') || platform.toLowerCase().includes('kindle') ? 'EBOOK' : 'ECOMMERCE';
            
            await prisma.royalty.create({
              data: {
                authorId: book.authorId,
                bookId: book.id,
                saleAmount: amount,
                amount: amount * 0.10, // 10% default royalty
                royaltyRate: 0.10,
                bucket,
                platform,
                period: new Date().toISOString().slice(0, 7), // YYYY-MM
              },
            });

            successCount++;
          } catch (e) {
            errorCount++;
            errors.push({ message: e.message });
          }
        }
      }

      // Create import batch record
      await prisma.importBatch.create({
        data: {
          type,
          totalRows: data.length,
          successCount,
          errorCount,
          status: 'completed',
          importedById,
          errors: errors.length > 0 ? errors : null,
          completedAt: new Date(),
        },
      });

      return NextResponse.json({ successCount, errorCount, errors });
    }

    // ==================== ADMIN ORDERS POST ROUTES ====================

    // POST /api/admin/orders/stages - Create order stage
    if (path === '/admin/orders/stages') {
      const { name, description, color, sortOrder } = body;

      if (!name) {
        return NextResponse.json({ error: 'Stage name is required' }, { status: 400 });
      }

      const stage = await prisma.orderStage.create({
        data: { name, description, color, sortOrder: sortOrder || 0 },
      });

      return NextResponse.json({ stage });
    }

    // POST /api/admin/orders/[id]/move-stage - Move order to stage
    if (path.match(/^\/admin\/orders\/[^/]+\/move-stage$/)) {
      const orderId = pathSegments[2];
      const { stageId, notes, movedById } = body;

      const order = await prisma.order.update({
        where: { id: orderId },
        data: { currentStageId: stageId },
      });

      // Record history
      await prisma.orderStageHistory.create({
        data: {
          orderId,
          stageId,
          notes,
          movedById,
        },
      });

      return NextResponse.json({ order });
    }

    // ==================== ADMIN ROYALTIES POST ROUTES ====================

    // POST /api/admin/royalties/mark-paid - Mark royalties as paid and notify authors
    if (path === '/admin/royalties/mark-paid') {
      const { royaltyIds, paymentRef, markedById } = body;

      if (!royaltyIds || !Array.isArray(royaltyIds)) {
        return NextResponse.json({ error: 'royaltyIds array required' }, { status: 400 });
      }

      // Get royalties with author info before updating
      const royaltiesToMark = await prisma.royalty.findMany({
        where: { id: { in: royaltyIds } },
        include: {
          author: { select: { id: true, name: true } },
          book: { select: { title: true } },
        },
      });

      // Update royalties
      const updated = await prisma.royalty.updateMany({
        where: { id: { in: royaltyIds } },
        data: { isPaid: true, paidAt: new Date(), paymentRef },
      });

      // Create notifications for each unique author
      const authorGroups = {};
      for (const r of royaltiesToMark) {
        if (!authorGroups[r.authorId]) {
          authorGroups[r.authorId] = { amount: 0, books: [] };
        }
        authorGroups[r.authorId].amount += r.amount;
        if (!authorGroups[r.authorId].books.includes(r.book?.title)) {
          authorGroups[r.authorId].books.push(r.book?.title);
        }
      }

      // Create notification for each author
      for (const [authorId, data] of Object.entries(authorGroups)) {
        await prisma.notification.create({
          data: {
            userId: authorId,
            type: 'ROYALTY_PAYMENT',
            title: 'Royalty Payment Processed',
            message: `Your royalty payment of ₹${data.amount.toLocaleString()} has been processed for ${data.books.join(', ')}.`,
            link: '/author/royalties',
          },
        });
      }

      return NextResponse.json({ success: true, updated: updated.count, notified: Object.keys(authorGroups).length });
    }

    // POST /api/admin/books/{bookId}/royalty-config - Create/Update royalty config
    if (path.match(/^\/admin\/books\/[^/]+\/royalty-config$/)) {
      const bookId = pathSegments[2];
      const { platform, royaltyAmount } = body;

      if (!platform || royaltyAmount === undefined) {
        return NextResponse.json({ error: 'platform and royaltyAmount required' }, { status: 400 });
      }

      // Check if config exists
      const existing = await prisma.bookRoyaltyConfig.findUnique({
        where: { bookId_platform: { bookId, platform } },
      });

      let config;
      if (existing) {
        config = await prisma.bookRoyaltyConfig.update({
          where: { id: existing.id },
          data: { royaltyAmount: parseFloat(royaltyAmount), isActive: true },
        });
      } else {
        config = await prisma.bookRoyaltyConfig.create({
          data: { bookId, platform, royaltyAmount: parseFloat(royaltyAmount) },
        });
      }

      return NextResponse.json({ config });
    }

    // POST /api/admin/royalties/generate - Generate royalties from sales using AMOUNT-BASED model
    if (path === '/admin/royalties/generate') {
      const { bookId, quantity, platform, period } = body;

      if (!bookId || !quantity) {
        return NextResponse.json({ error: 'bookId and quantity required' }, { status: 400 });
      }

      const bucket = getRoyaltyBucket(platform);
      
      // Get book, its authors, and royalty config
      const book = await prisma.book.findUnique({
        where: { id: bookId },
        include: {
          authors: { include: { author: true } },
          author: true,
          royaltyConfigs: {
            where: { platform, isActive: true },
          },
        },
      });

      if (!book) {
        return NextResponse.json({ error: 'Book not found' }, { status: 404 });
      }

      // Get royalty amount from config
      const royaltyConfig = book.royaltyConfigs[0];
      const royaltyPerUnit = royaltyConfig?.royaltyAmount || 0;
      
      if (royaltyPerUnit === 0) {
        return NextResponse.json({ 
          error: 'No royalty amount configured for this book/platform combination',
          hint: 'Configure royalty amount first in Sales > Royalty Configuration'
        }, { status: 400 });
      }

      // Determine authors
      let authors = book.authors.map(ba => ({
        id: ba.author.id,
        authorUid: ba.author.authorUid,
        share: ba.royaltyShare,
      }));

      if (authors.length === 0 && book.author) {
        authors = [{ id: book.author.id, authorUid: book.author.authorUid, share: 100 }];
      }

      const totalRoyalty = royaltyPerUnit * quantity;
      const royalties = [];

      for (const author of authors) {
        const share = author.share !== null ? author.share / 100 : 1 / authors.length;
        const royalty = await prisma.royalty.create({
          data: {
            authorId: author.id,
            authorUid: author.authorUid,
            bookId,
            amount: totalRoyalty * share,
            royaltyRate: 0, // Not used in amount-based model
            saleAmount: 0, // Not relevant in amount-based model
            quantity,
            bucket,
            platform,
            period: period || new Date().toISOString().slice(0, 7),
          },
        });
        royalties.push(royalty);
      }

      return NextResponse.json({ royalties, royaltyPerUnit, totalRoyalty });
    }

    // POST /api/admin/sales/import - Import sales data and auto-generate royalties
    if (path === '/admin/sales/import') {
      const { sales: salesData } = body;

      if (!salesData || !Array.isArray(salesData)) {
        return NextResponse.json({ error: 'sales array required' }, { status: 400 });
      }

      const results = {
        success: [],
        errors: [],
        royaltiesGenerated: 0,
      };

      for (const saleItem of salesData) {
        try {
          const { isbn, platform, quantity, saleDate, unitPrice } = saleItem;

          // Find book by ISBN
          const book = await prisma.book.findFirst({
            where: {
              OR: [
                { isbn: isbn },
                { isbnPaperback: isbn },
                { isbnHardcover: isbn },
                { isbnEbook: isbn },
              ],
            },
            include: {
              authors: { include: { author: true } },
              author: true,
              royaltyConfigs: {
                where: { platform, isActive: true },
              },
            },
          });

          if (!book) {
            results.errors.push({ isbn, error: 'Book not found' });
            continue;
          }

          // Create sale record
          const sale = await prisma.sale.create({
            data: {
              bookId: book.id,
              isbnUsed: isbn,
              platform,
              quantity: parseInt(quantity) || 1,
              unitPrice: parseFloat(unitPrice) || 0,
              totalAmount: (parseFloat(unitPrice) || 0) * (parseInt(quantity) || 1),
              saleDate: new Date(saleDate),
              importSource: 'CSV',
            },
          });

          results.success.push({ isbn, saleId: sale.id });

          // Auto-generate royalties if config exists
          const royaltyConfig = book.royaltyConfigs[0];
          if (royaltyConfig) {
            const bucket = getRoyaltyBucket(platform);
            let authors = book.authors.map(ba => ({
              id: ba.author.id,
              authorUid: ba.author.authorUid,
              share: ba.royaltyShare,
            }));

            if (authors.length === 0 && book.author) {
              authors = [{ id: book.author.id, authorUid: book.author.authorUid, share: 100 }];
            }

            const totalRoyalty = royaltyConfig.royaltyAmount * (parseInt(quantity) || 1);

            for (const author of authors) {
              const share = author.share !== null ? author.share / 100 : 1 / authors.length;
              await prisma.royalty.create({
                data: {
                  authorId: author.id,
                  authorUid: author.authorUid,
                  bookId: book.id,
                  saleId: sale.id,
                  amount: totalRoyalty * share,
                  royaltyRate: 0,
                  saleAmount: sale.totalAmount,
                  quantity: parseInt(quantity) || 1,
                  bucket,
                  platform,
                  period: new Date(saleDate).toISOString().slice(0, 7),
                },
              });
              results.royaltiesGenerated++;
            }
          }
        } catch (error) {
          results.errors.push({ ...saleItem, error: error.message });
        }
      }

      return NextResponse.json({ results });
    }

    // ==================== ADMIN LEADS POST ROUTES ====================

    // POST /api/admin/leads - Create lead
    if (path === '/admin/leads') {
      const { name, email, phone, alternateEmail, alternatePhone, source, interestArea, contractAmount, deadline, deadlineSeverity, assignedToId, notes, createdById, stage } = body;

      if (!name || !email) {
        return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
      }

      // Handle empty strings - convert to null for UUID fields
      const cleanAssignedToId = assignedToId && assignedToId.trim() !== '' ? assignedToId : null;
      const cleanCreatedById = createdById && createdById.trim() !== '' ? createdById : null;

      const lead = await prisma.lead.create({
        data: {
          name,
          email,
          phone: phone || null,
          alternateEmail: alternateEmail || null,
          alternatePhone: alternatePhone || null,
          source: source || 'WEBSITE',
          interestArea: interestArea || null,
          contractAmount: contractAmount ? parseFloat(contractAmount) : null,
          deadline: deadline ? new Date(deadline) : null,
          deadlineSeverity: deadlineSeverity || 'MEDIUM',
          assignedToId: cleanAssignedToId,
          createdById: cleanCreatedById,
          status: stage || 'NEW',
        },
      });

      // Add initial note if provided
      if (notes) {
        await prisma.leadNote.create({
          data: {
            leadId: lead.id,
            content: notes,
            createdById,
          },
        });
      }

      return NextResponse.json({ lead: { ...lead, stage: lead.status } });
    }

    // POST /api/admin/leads/[id]/notes - Add note to lead
    if (path.match(/^\/admin\/leads\/[^/]+\/notes$/)) {
      const leadId = pathSegments[2];
      const { content, createdById, createdByName } = body;

      if (!content) {
        return NextResponse.json({ error: 'Content is required' }, { status: 400 });
      }

      const lead = await prisma.lead.findUnique({ where: { id: leadId } });
      if (!lead) {
        return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
      }

      const note = await prisma.leadNote.create({
        data: {
          leadId,
          content,
          createdById,
        },
      });

      return NextResponse.json({ success: true, note });
    }

    // POST /api/admin/site-settings - Save site settings
    if (path === '/admin/site-settings') {
      const settings = body;

      // Save each category of settings
      for (const [category, values] of Object.entries(settings)) {
        await prisma.siteSetting.upsert({
          where: { key: category },
          update: { value: values },
          create: { key: category, value: values },
        });
      }

      return NextResponse.json({ success: true });
    }

    // ==================== ADMIN BOOKS POST ROUTES ====================

    // POST /api/admin/books - Create book from admin
    if (path === '/admin/books') {
      const { title, authorId, authorUid, authorEmail, category, description, isbnPaperback, isbnHardcover, allowWordUpload } = body;

      // Validation: Title required
      if (!title) {
        return NextResponse.json({ error: 'Title is required' }, { status: 400 });
      }

      // Validation: Exactly one of authorId, authorUid, or authorEmail required
      const authorIdentifiers = [authorId, authorUid, authorEmail].filter(Boolean);
      if (authorIdentifiers.length === 0) {
        return NextResponse.json({ 
          error: 'Author identification required. Provide one of: authorId, authorUid, or authorEmail' 
        }, { status: 400 });
      }

      // Find author by ID, UID, or Email
      let author = null;
      if (authorId) {
        author = await prisma.user.findUnique({ where: { id: authorId } });
        if (!author) {
          return NextResponse.json({ error: 'Author not found with provided ID' }, { status: 404 });
        }
      } else if (authorUid) {
        author = await prisma.user.findUnique({ where: { authorUid } });
        if (!author) {
          return NextResponse.json({ error: `Author not found with UID: ${authorUid}` }, { status: 404 });
        }
      } else if (authorEmail) {
        author = await prisma.user.findUnique({ where: { email: authorEmail.toLowerCase() } });
        if (!author) {
          return NextResponse.json({ error: `Author not found with email: ${authorEmail}` }, { status: 404 });
        }
      }

      // Create book with publishing stages (ISBN is optional)
      // Only INITIAL_REVIEW is visible by default, others are hidden
      const publishingStageTypes = [
        { type: 'MANUSCRIPT_RECEIVED', visible: false },
        { type: 'INITIAL_REVIEW', visible: true }, // Only this one visible on submission
        { type: 'EDITING', visible: false },
        { type: 'PROOFREADING', visible: false },
        { type: 'COVER_DESIGN', visible: false },
        { type: 'INTERIOR_FORMATTING', visible: false },
        { type: 'FINAL_REVIEW', visible: false },
        { type: 'ISBN_ASSIGNMENT', visible: false },
        { type: 'PRINTING', visible: false },
        { type: 'DISTRIBUTION', visible: false },
        { type: 'COMPLETED', visible: false },
      ];

      const book = await prisma.book.create({
        data: {
          title,
          authorId: author.id,
          category: category || null,
          description: description || null,
          isbnPaperback: isbnPaperback || null,
          isbnHardcover: isbnHardcover || null,
          isbn: isbnPaperback || null, // Legacy field synced with paperback
          status: 'DRAFT',
          allowWordUpload: allowWordUpload || false,
          publishingStages: {
            create: publishingStageTypes.map((stage, index) => ({
              stageType: stage.type,
              stageOrder: index + 1,
              status: stage.type === 'INITIAL_REVIEW' ? 'PENDING' : 'PENDING',
              isVisible: stage.visible,
            })),
          },
        },
        include: {
          author: { select: { id: true, name: true, authorUid: true } },
          publishingStages: true,
        },
      });

      return NextResponse.json({ book });
    }

    // POST /api/admin/books/import - Bulk import books
    if (path === '/admin/books/import') {
      const { books: booksData } = body;

      if (!booksData || !Array.isArray(booksData)) {
        return NextResponse.json({ error: 'Books array is required' }, { status: 400 });
      }

      const results = { success: [], errors: [], skipped: [] };

      for (const bookData of booksData) {
        try {
          const { title, authorUid, authorEmail, isbnPaperback, isbnHardcover, category } = bookData;

          if (!title) {
            results.errors.push({ title: title || 'Unknown', error: 'Title is required' });
            continue;
          }

          // Find author by UID or email (at least one required)
          let author = null;
          if (authorUid) {
            author = await prisma.user.findUnique({ where: { authorUid } });
          }
          if (!author && authorEmail) {
            author = await prisma.user.findUnique({ where: { email: authorEmail.toLowerCase() } });
          }

          if (!author) {
            results.errors.push({ 
              title, 
              error: `Author not found. Provided: ${authorUid ? `UID=${authorUid}` : ''} ${authorEmail ? `Email=${authorEmail}` : ''}`.trim()
            });
            continue;
          }

          // Check for duplicate ISBN
          if (isbnPaperback) {
            const existing = await prisma.book.findUnique({ where: { isbnPaperback } });
            if (existing) {
              results.skipped.push({ title, reason: `Paperback ISBN ${isbnPaperback} already exists` });
              continue;
            }
          }

          const publishingStageTypes = [
            'MANUSCRIPT_RECEIVED', 'INITIAL_REVIEW', 'EDITING', 'PROOFREADING',
            'COVER_DESIGN', 'INTERIOR_FORMATTING', 'FINAL_REVIEW', 'ISBN_ASSIGNMENT',
            'PRINTING', 'DISTRIBUTION', 'COMPLETED',
          ];

          const book = await prisma.book.create({
            data: {
              title,
              authorId: author.id,
              category: category || null,
              isbnPaperback: isbnPaperback || null,
              isbnHardcover: isbnHardcover || null,
              isbn: isbnPaperback || null,
              status: 'DRAFT',
              publishingStages: {
                create: publishingStageTypes.map((type, index) => ({
                  stageType: type,
                  stageOrder: index + 1,
                  status: index === 0 ? 'IN_PROGRESS' : 'PENDING',
                })),
              },
            },
          });

          results.success.push({ title, id: book.id });
        } catch (error) {
          results.errors.push({ title: bookData.title || 'Unknown', error: error.message });
        }
      }

      return NextResponse.json({ results });
    }

    // ==================== ADMIN PACKAGES POST ROUTES ====================

    // POST /api/admin/packages - Create package
    if (path === '/admin/packages') {
      const { name, description, price, features, isPopular, sortOrder } = body;

      if (!name || price === undefined) {
        return NextResponse.json({ error: 'Name and price are required' }, { status: 400 });
      }

      const pkg = await prisma.publishingPackage.create({
        data: {
          name,
          description,
          price,
          features: features || [],
          isPopular: isPopular || false,
          sortOrder: sortOrder || 0,
          isActive: true,
        },
      });

      return NextResponse.json({ package: pkg });
    }

    // POST /api/categories
    if (path === '/categories') {
      const { name: catName, description: catDesc, parentId, seoTitle, seoDesc } = body;

      if (!catName) {
        return NextResponse.json({ error: 'Name is required' }, { status: 400 });
      }

      let slug = catName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-');
      let counter = 1;
      while (await prisma.category.findUnique({ where: { slug } })) {
        slug = `${catName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${counter}`;
        counter++;
      }

      const category = await prisma.category.create({
        data: {
          name: catName,
          slug,
          description: catDesc,
          parentId,
          seoTitle: seoTitle || catName,
          seoDesc,
        },
      });

      return NextResponse.json({ category });
    }

    // ==================== BLOG POST ROUTES ====================

    // POST /api/blog - Create blog post (admin/blog writer)
    if (path === '/blog') {
      const {
        title: blogTitle,
        content: blogContent,
        excerpt,
        coverImage,
        authorName,
        authorId: blogAuthorId,
        category: blogCategory,
        tags,
        isPublished,
        linkedBookId,
        seoTitle,
        seoDesc,
      } = body;

      if (!blogTitle || !blogContent) {
        return NextResponse.json(
          { error: 'Title and content are required' },
          { status: 400 }
        );
      }

      // Generate slug
      let slug = blogTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      let counter = 1;
      while (await prisma.blogPost.findUnique({ where: { slug } })) {
        slug = `${blogTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-')}-${counter}`;
        counter++;
      }

      const post = await prisma.blogPost.create({
        data: {
          title: blogTitle,
          slug,
          content: blogContent,
          excerpt: excerpt || blogContent.substring(0, 200) + '...',
          coverImage,
          authorName: authorName || 'Admin',
          authorId: blogAuthorId,
          category: blogCategory,
          tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim())) : null,
          isPublished: isPublished || false,
          publishedAt: isPublished ? new Date() : null,
          linkedBookId,
          seoTitle: seoTitle || blogTitle,
          seoDesc: seoDesc || excerpt,
        },
      });

      return NextResponse.json({ post });
    }

    // POST /api/blog/[slug]/comment - Add comment to blog post
    if (path.match(/^\/blog\/[^/]+\/comment$/)) {
      const slug = pathSegments[1];
      const { authorName: commentAuthor, authorEmail, content: commentContent } = body;

      if (!commentAuthor || !commentContent) {
        return NextResponse.json(
          { error: 'Name and comment are required' },
          { status: 400 }
        );
      }

      const post = await prisma.blogPost.findUnique({ where: { slug } });
      if (!post || !post.isPublished) {
        return NextResponse.json({ error: 'Post not found' }, { status: 404 });
      }

      const comment = await prisma.blogComment.create({
        data: {
          postId: post.id,
          authorName: commentAuthor,
          authorEmail,
          content: commentContent,
          isApproved: false, // Requires admin moderation
        },
      });

      return NextResponse.json({ comment, message: 'Comment submitted for moderation' });
    }

    // POST /api/blog/[slug]/like - Like a blog post
    if (path.match(/^\/blog\/[^/]+\/like$/)) {
      const slug = pathSegments[1];
      const { visitorId } = body;

      if (!visitorId) {
        return NextResponse.json({ error: 'Visitor ID required' }, { status: 400 });
      }

      const post = await prisma.blogPost.findUnique({ where: { slug } });
      if (!post || !post.isPublished) {
        return NextResponse.json({ error: 'Post not found' }, { status: 404 });
      }

      // Check if already liked
      const existingLike = await prisma.blogLike.findUnique({
        where: { postId_visitorId: { postId: post.id, visitorId } },
      });

      if (existingLike) {
        // Unlike
        await prisma.blogLike.delete({ where: { id: existingLike.id } });
        return NextResponse.json({ liked: false });
      }

      // Add like
      await prisma.blogLike.create({
        data: { postId: post.id, visitorId },
      });

      return NextResponse.json({ liked: true });
    }

    // POST /api/guest-posts - Submit guest post
    if (path === '/guest-posts') {
      const {
        title: guestTitle,
        content: guestContent,
        writerName,
        email: guestEmail,
        phone: guestPhone,
        socialLinks: guestSocialLinks,
      } = body;

      if (!guestTitle || !guestContent || !writerName || !guestEmail) {
        return NextResponse.json(
          { error: 'Title, content, writer name, and email are required' },
          { status: 400 }
        );
      }

      const guestPost = await prisma.guestPost.create({
        data: {
          title: guestTitle,
          content: guestContent,
          writerName,
          email: guestEmail,
          phone: guestPhone,
          socialLinks: guestSocialLinks,
          status: 'pending',
        },
      });

      return NextResponse.json({ guestPost, message: 'Guest post submitted for review' });
    }

    // POST /api/admin/blog/comments/[id]/approve - Approve comment
    if (path.match(/^\/admin\/blog\/comments\/[^/]+\/approve$/)) {
      const commentId = pathSegments[3];
      const { approved } = body;

      const comment = await prisma.blogComment.update({
        where: { id: commentId },
        data: { isApproved: approved !== false },
      });

      return NextResponse.json({ comment });
    }

    // POST /api/admin/guest-posts/[id]/review - Review guest post
    if (path.match(/^\/admin\/guest-posts\/[^/]+\/review$/)) {
      const guestPostId = pathSegments[2];
      const { status: reviewStatus, rejectReason, reviewedBy } = body;

      if (!['approved', 'rejected'].includes(reviewStatus)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }

      const guestPost = await prisma.guestPost.update({
        where: { id: guestPostId },
        data: {
          status: reviewStatus,
          rejectReason: reviewStatus === 'rejected' ? rejectReason : null,
          reviewedBy,
          reviewedAt: new Date(),
        },
      });

      // If approved, create a blog post
      if (reviewStatus === 'approved') {
        let slug = guestPost.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-');
        let counter = 1;
        while (await prisma.blogPost.findUnique({ where: { slug } })) {
          slug = `${guestPost.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${counter}`;
          counter++;
        }

        await prisma.blogPost.create({
          data: {
            title: guestPost.title,
            slug,
            content: guestPost.content,
            excerpt: guestPost.content.substring(0, 200) + '...',
            authorName: guestPost.writerName,
            category: 'Guest Post',
            isPublished: true,
            publishedAt: new Date(),
          },
        });
      }

      return NextResponse.json({ guestPost });
    }

    // POST /api/addons
    if (path === '/addons') {
      const { name: addonName, description: addonDesc, serviceType: addonService, basePrice, pricingType, pricingTiers } = body;

      if (!addonName || !addonService || basePrice === undefined) {
        return NextResponse.json({ error: 'Name, service type, and base price are required' }, { status: 400 });
      }

      const addOn = await prisma.serviceAddOn.create({
        data: {
          name: addonName,
          description: addonDesc,
          serviceType: addonService,
          basePrice,
          pricingType: pricingType || 'fixed',
          pricingTiers,
        },
      });

      return NextResponse.json({ addOn });
    }

    // POST /api/reviews
    if (path === '/reviews') {
      const { bookId: reviewBookId, authorName: reviewAuthor, bookTitle: reviewBookTitle, rating, content: reviewContent, source, displayOn } = body;

      if (!reviewAuthor || !rating || !reviewContent) {
        return NextResponse.json({ error: 'Author name, rating, and content are required' }, { status: 400 });
      }

      const review = await prisma.review.create({
        data: {
          bookId: reviewBookId,
          authorName: reviewAuthor,
          bookTitle: reviewBookTitle,
          rating,
          content: reviewContent,
          source,
          displayOn,
          isApproved: false, // Needs admin approval
        },
      });

      return NextResponse.json({ review });
    }

    // POST /api/discounts
    if (path === '/discounts') {
      const { name: discName, code: discCode, discountType, discountValue, appliesTo, startsAt, expiresAt, showTimer, maxUses } = body;

      if (!discName || !discountValue || !appliesTo) {
        return NextResponse.json({ error: 'Name, discount value, and applies to are required' }, { status: 400 });
      }

      const discount = await prisma.discount.create({
        data: {
          name: discName,
          code: discCode,
          discountType: discountType || 'percentage',
          discountValue,
          appliesTo,
          startsAt: startsAt ? new Date(startsAt) : null,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          showTimer: showTimer || false,
          maxUses,
        },
      });

      return NextResponse.json({ discount });
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (error) {
    console.error('API POST Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request, context) {
  const params = await context.params;
  const pathSegments = params?.path || [];
  const path = '/' + pathSegments.join('/');

  try {
    // Parse body
    let body = {};
    try {
      body = await request.json();
    } catch (e) {
      // Body might be empty
    }

    // ==================== AUTHOR PUT ROUTES ====================

    // PUT /api/author/settings/profile - Update author profile
    if (path === '/author/settings/profile') {
      const userId = request.headers.get('x-user-id');
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const { name, phone, alternateEmail, alternatePhone, bio, website, publicUrl, socialLinks } = body;

      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (phone !== undefined) updateData.phone = phone;
      if (alternateEmail !== undefined) updateData.alternateEmail = alternateEmail;
      if (alternatePhone !== undefined) updateData.alternatePhone = alternatePhone;
      if (bio !== undefined) updateData.bio = bio;
      if (website !== undefined) updateData.website = website;
      if (publicUrl !== undefined) updateData.publicUrl = publicUrl;
      if (socialLinks !== undefined) updateData.socialLinks = socialLinks;

      const user = await prisma.user.update({
        where: { id: userId },
        data: updateData,
      });

      return NextResponse.json({ success: true, user });
    }

    // PUT /api/author/settings/bank - Update author bank details
    if (path === '/author/settings/bank') {
      const userId = request.headers.get('x-user-id');
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const { accountName, accountNumber, bankName, ifscCode, branchName } = body;

      const existing = await prisma.bankDetails.findUnique({ where: { userId } });

      if (existing) {
        await prisma.bankDetails.update({
          where: { userId },
          data: { accountName, accountNumber, bankName, ifscCode, branchName },
        });
      } else {
        await prisma.bankDetails.create({
          data: { userId, accountName, accountNumber, bankName, ifscCode, branchName },
        });
      }

      return NextResponse.json({ success: true });
    }

    // PUT /api/author/manuscripts - Update manuscript status
    if (path === '/author/manuscripts') {
      const userId = request.headers.get('x-user-id');
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const { id, status, content, fileName, fileUrl, isWordUpload } = body;

      if (!id) {
        return NextResponse.json({ error: 'Manuscript ID required' }, { status: 400 });
      }

      const updateData = {};
      if (status !== undefined) updateData.status = status;
      if (content !== undefined) updateData.content = content;
      if (fileName !== undefined) updateData.fileName = fileName;
      if (fileUrl !== undefined) updateData.fileUrl = fileUrl;
      if (isWordUpload !== undefined) updateData.isWordUpload = isWordUpload;

      const manuscript = await prisma.manuscript.update({
        where: { id },
        data: updateData,
      });

      return NextResponse.json({ manuscript });
    }

    // PUT /api/author/settings/notifications - Update notification preferences
    if (path === '/author/settings/notifications') {
      // For now, just acknowledge - these would normally be stored in a settings table
      return NextResponse.json({ success: true });
    }

    // ==================== ADMIN LEADS PUT ROUTES ====================

    // PUT /api/admin/leads/[id] - Update lead
    if (path.startsWith('/admin/leads/') && pathSegments.length === 3) {
      const leadId = pathSegments[2];
      const { stage, status, contractAmount, deadline, deadlineSeverity, assignedToId, interestArea, name, email, phone } = body;

      const lead = await prisma.lead.findUnique({ where: { id: leadId } });
      if (!lead) {
        return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
      }

      const updateData = {};
      
      // Track stage/status change (accept both 'stage' and 'status' for compatibility)
      const newStatus = stage || status;
      if (newStatus !== undefined && newStatus !== lead.status) {
        updateData.status = newStatus;
        if (newStatus === 'CONVERTED') {
          updateData.convertedAt = new Date();
        }
      }

      if (name !== undefined) updateData.name = name;
      if (email !== undefined) updateData.email = email;
      if (phone !== undefined) updateData.phone = phone;
      if (contractAmount !== undefined) updateData.contractAmount = contractAmount ? parseFloat(contractAmount) : null;
      if (deadline !== undefined) updateData.deadline = deadline ? new Date(deadline) : null;
      if (deadlineSeverity !== undefined) updateData.deadlineSeverity = deadlineSeverity;
      if (assignedToId !== undefined) updateData.assignedToId = assignedToId && assignedToId.trim() !== '' ? assignedToId : null;
      if (interestArea !== undefined) updateData.interestArea = interestArea;

      const updatedLead = await prisma.lead.update({
        where: { id: leadId },
        data: updateData,
        include: {
          assignedTo: { select: { id: true, name: true } },
          notes: { orderBy: { createdAt: 'desc' }, take: 10 },
        },
      });

      return NextResponse.json({ 
        lead: {
          ...updatedLead,
          stage: updatedLead.status,
        }
      });
    }

    // ==================== ADMIN CATEGORIES PUT ROUTES ====================

    // Update category (admin)
    if (path.startsWith('/admin/categories/') && pathSegments.length === 3) {
      const categoryId = pathSegments[2];
      const { name, description, parentId, isActive, seoTitle, seoDesc, sortOrder } = body;

      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (parentId !== undefined) updateData.parentId = parentId || null;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (seoTitle !== undefined) updateData.seoTitle = seoTitle;
      if (seoDesc !== undefined) updateData.seoDesc = seoDesc;
      if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

      const category = await prisma.category.update({
        where: { id: categoryId },
        data: updateData,
      });

      return NextResponse.json({ category });
    }

    // ==================== ADMIN STAGE TEMPLATES PUT ROUTES ====================

    // PUT /api/admin/stage-templates/[id] - Update a stage template
    if (path.startsWith('/admin/stage-templates/') && pathSegments.length === 3) {
      const templateId = pathSegments[2];
      const { name, description, isDefault, sortOrder, isActive } = body;

      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (isDefault !== undefined) updateData.isDefault = isDefault;
      if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
      if (isActive !== undefined) updateData.isActive = isActive;

      const template = await prisma.stageTemplate.update({
        where: { id: templateId },
        data: updateData,
      });

      return NextResponse.json({ template });
    }

    // ==================== ADMIN USERS PUT ROUTES ====================

    // PUT /api/admin/users/[id] - Update user
    if (path.startsWith('/admin/users/') && pathSegments.length === 3) {
      const userId = pathSegments[2];
      const { name, phone, role, isActive, isBlogWriter, alternateEmail, alternatePhone, bio, website, socialLinks } = body;

      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (phone !== undefined) updateData.phone = phone;
      if (role !== undefined) updateData.role = role;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (isBlogWriter !== undefined) updateData.isBlogWriter = isBlogWriter;
      if (alternateEmail !== undefined) updateData.alternateEmail = alternateEmail;
      if (alternatePhone !== undefined) updateData.alternatePhone = alternatePhone;
      if (bio !== undefined) updateData.bio = bio;
      if (website !== undefined) updateData.website = website;
      if (socialLinks !== undefined) updateData.socialLinks = socialLinks;

      const user = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true, authorUid: true, email: true, name: true, role: true, phone: true, isActive: true, isBlogWriter: true,
        },
      });

      return NextResponse.json({ user });
    }

    // ==================== ADMIN ORDERS PUT ROUTES ====================

    // PUT /api/admin/orders/stages/[id] - Update order stage
    if (path.match(/^\/admin\/orders\/stages\/[^/]+$/) && pathSegments.length === 4) {
      const stageId = pathSegments[3];
      const { name, description, color, sortOrder, isActive } = body;

      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (color !== undefined) updateData.color = color;
      if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
      if (isActive !== undefined) updateData.isActive = isActive;

      const stage = await prisma.orderStage.update({
        where: { id: stageId },
        data: updateData,
      });

      return NextResponse.json({ stage });
    }

    // PUT /api/admin/orders/[id] - Update order
    if (path.startsWith('/admin/orders/') && pathSegments.length === 3 && pathSegments[2] !== 'stages') {
      const orderId = pathSegments[2];
      const { status, currentStageId, shippingName, shippingEmail, shippingPhone, shippingAddress, shippingCity, shippingState, shippingZipCode } = body;

      const updateData = {};
      if (status !== undefined) updateData.status = status;
      if (currentStageId !== undefined) updateData.currentStageId = currentStageId;
      if (shippingName !== undefined) updateData.shippingName = shippingName;
      if (shippingEmail !== undefined) updateData.shippingEmail = shippingEmail;
      if (shippingPhone !== undefined) updateData.shippingPhone = shippingPhone;
      if (shippingAddress !== undefined) updateData.shippingAddress = shippingAddress;
      if (shippingCity !== undefined) updateData.shippingCity = shippingCity;
      if (shippingState !== undefined) updateData.shippingState = shippingState;
      if (shippingZipCode !== undefined) updateData.shippingZipCode = shippingZipCode;

      // Update timestamps based on status
      if (status === 'SHIPPED' && !updateData.shippedAt) updateData.shippedAt = new Date();
      if (status === 'DELIVERED' && !updateData.deliveredAt) updateData.deliveredAt = new Date();

      const order = await prisma.order.update({
        where: { id: orderId },
        data: updateData,
      });

      return NextResponse.json({ order });
    }

    // ==================== ADMIN BOOKS PUT ROUTES ====================

    // PUT /api/admin/books/[id] - Update book (including ISBN, deadline, severity)
    if (path.startsWith('/admin/books/') && pathSegments.length === 3 && !path.includes('/stages')) {
      const bookId = pathSegments[2];
      const { 
        title, isbnPaperback, isbnHardcover, isbnEbook, 
        category, status, description,
        deadline, deadlineSeverity,
        // Store listing fields
        isPublic, isAuthorCopy, price, discountPrice,
        paperbackPrice, hardcoverPrice, ebookPrice,
        hasPaperback, hasHardcover, hasEbook, authorCopyPrice, authorCopyMOQ, authorCopyTiers, shippingEnabled,
        // Store display overrides
        storeDisplayTitle, storeDisplayAuthor, storeDisplayDescription, storeDisplayCover
      } = body;

      const updateData = {};
      if (title !== undefined) updateData.title = title;
      if (category !== undefined) updateData.category = category;
      if (description !== undefined) updateData.description = description;
      if (status !== undefined) updateData.status = status;
      if (deadline !== undefined) updateData.deadline = deadline ? new Date(deadline) : null;
      if (deadlineSeverity !== undefined) updateData.deadlineSeverity = deadlineSeverity;

      // Handle ISBN updates - important for canonical linking
      if (isbnPaperback !== undefined) {
        updateData.isbnPaperback = isbnPaperback || null;
        // Paperback ISBN synced to legacy isbn field
        updateData.isbn = isbnPaperback || null;
      }
      if (isbnHardcover !== undefined) updateData.isbnHardcover = isbnHardcover || null;
      if (isbnEbook !== undefined) updateData.isbnEbook = isbnEbook || null;

      // Store listing fields
      if (isPublic !== undefined) updateData.isPublic = isPublic;
      if (isAuthorCopy !== undefined) updateData.isAuthorCopy = isAuthorCopy;
      if (price !== undefined) updateData.price = parseFloat(price) || 0;
      if (discountPrice !== undefined) updateData.discountPrice = discountPrice ? parseFloat(discountPrice) : null;
      if (paperbackPrice !== undefined) updateData.paperbackPrice = paperbackPrice ? parseFloat(paperbackPrice) : null;
      if (hardcoverPrice !== undefined) updateData.hardcoverPrice = hardcoverPrice ? parseFloat(hardcoverPrice) : null;
      if (ebookPrice !== undefined) updateData.ebookPrice = ebookPrice ? parseFloat(ebookPrice) : null;
      if (hasPaperback !== undefined) updateData.hasPaperback = hasPaperback;
      if (hasHardcover !== undefined) updateData.hasHardcover = hasHardcover;
      if (hasEbook !== undefined) updateData.hasEbook = hasEbook;
      if (authorCopyPrice !== undefined) updateData.authorCopyPrice = authorCopyPrice ? parseFloat(authorCopyPrice) : null;
      if (authorCopyMOQ !== undefined) updateData.authorCopyMOQ = parseInt(authorCopyMOQ) || 1;
      if (authorCopyTiers !== undefined) updateData.authorCopyTiers = authorCopyTiers;
      if (shippingEnabled !== undefined) updateData.shippingEnabled = shippingEnabled;

      // Store display overrides
      if (storeDisplayTitle !== undefined) updateData.storeDisplayTitle = storeDisplayTitle || null;
      if (storeDisplayAuthor !== undefined) updateData.storeDisplayAuthor = storeDisplayAuthor || null;
      if (storeDisplayDescription !== undefined) updateData.storeDisplayDescription = storeDisplayDescription || null;
      if (storeDisplayCover !== undefined) updateData.storeDisplayCover = storeDisplayCover || null;
      
      // Word upload toggle
      if (body.allowWordUpload !== undefined) updateData.allowWordUpload = body.allowWordUpload;

      const book = await prisma.book.update({
        where: { id: bookId },
        data: updateData,
        include: {
          author: { select: { id: true, name: true, authorUid: true } },
        },
      });

      return NextResponse.json({ book });
    }

    // PUT /api/admin/books/[bookId]/stages/[stageId] - Update stage status/assignment
    if (path.match(/\/admin\/books\/[^/]+\/stages\/[^/]+$/) && pathSegments.length === 5) {
      const bookId = pathSegments[2];
      const stageId = pathSegments[4];
      const { status, assignedToId, notes, dueDate, fileLink, isVisible, changedById } = body;

      // Get current stage for history
      const currentStage = await prisma.publishingStage.findUnique({
        where: { id: stageId },
      });

      if (!currentStage || currentStage.bookId !== bookId) {
        return NextResponse.json({ error: 'Stage not found' }, { status: 404 });
      }

      // Validate changedById if provided
      let validChangedById = null;
      if (changedById) {
        const changedByUser = await prisma.user.findUnique({ where: { id: changedById } });
        if (changedByUser) {
          validChangedById = changedById;
        }
      }

      const updateData = {};
      const historyEntries = [];

      // Handle visibility change
      if (isVisible !== undefined) {
        updateData.isVisible = isVisible;
        if (validChangedById) {
          historyEntries.push({
            stageId,
            action: isVisible ? 'STAGE_ENABLED' : 'STAGE_HIDDEN',
            notes: isVisible ? 'Stage enabled and visible to author' : 'Stage hidden from author view',
            changedById: validChangedById,
          });
        }
      }

      // Handle status change
      if (status !== undefined && status !== currentStage.status) {
        updateData.status = status;
        
        // Set timestamps based on status
        if (status === 'IN_PROGRESS' && !currentStage.startedAt) {
          updateData.startedAt = new Date();
        }
        if (status === 'COMPLETED' || status === 'APPROVED') {
          updateData.completedAt = new Date();
        }
        // Reset completedAt if moving back to in-progress statuses
        if (status === 'IN_PROGRESS' || status === 'PENDING' || status === 'QUERY_RAISED') {
          updateData.completedAt = null;
        }

        if (validChangedById) {
          historyEntries.push({
            stageId,
            action: 'STATUS_CHANGE',
            fromStatus: currentStage.status,
            toStatus: status,
            changedById: validChangedById,
          });
        }
      }

      // Handle assignment change
      if (assignedToId !== undefined && assignedToId !== currentStage.assignedToId) {
        updateData.assignedToId = assignedToId || null;
        if (validChangedById) {
          historyEntries.push({
            stageId,
            action: 'ASSIGNED',
            fromUserId: currentStage.assignedToId,
            toUserId: assignedToId || null,
            changedById: validChangedById,
          });
        }
      }

      // Handle notes
      if (notes !== undefined) {
        updateData.notes = notes;
        if (notes && notes !== currentStage.notes && validChangedById) {
          historyEntries.push({
            stageId,
            action: 'NOTE_ADDED',
            notes: notes,
            changedById: validChangedById,
          });
        }
      }

      // Handle file link
      if (fileLink !== undefined) {
        updateData.fileLink = fileLink || null;
        if (validChangedById) {
          historyEntries.push({
            stageId,
            action: 'FILE_ADDED',
            notes: fileLink ? `File link added: ${fileLink}` : 'File link removed',
            changedById: validChangedById,
          });
        }
      }

      // Handle due date
      if (dueDate !== undefined) {
        updateData.dueDate = dueDate ? new Date(dueDate) : null;
        if (validChangedById) {
          historyEntries.push({
            stageId,
            action: 'DUE_DATE_SET',
            notes: dueDate ? `Due date set to ${new Date(dueDate).toLocaleDateString()}` : 'Due date removed',
            changedById: validChangedById,
          });
        }
      }

      // Update stage (even if no history entries)
      const updatedStage = await prisma.publishingStage.update({
        where: { id: stageId },
        data: updateData,
        include: {
          assignedTo: { select: { id: true, name: true } },
        },
      });

      // Create history entries only if we have valid entries
      if (historyEntries.length > 0) {
        try {
          await prisma.publishingStageHistory.createMany({
            data: historyEntries,
          });
        } catch (historyError) {
          // History creation failed but stage was updated - log but don't fail
          console.error('Failed to create stage history:', historyError);
        }
      }

      return NextResponse.json({ stage: updatedStage });
    }

    // ==================== ADMIN PACKAGES PUT ROUTES ====================

    // PUT /api/admin/packages/[id] - Update package
    if (path.startsWith('/admin/packages/') && pathSegments.length === 3) {
      const packageId = pathSegments[2];
      const { name, description, price, features, isPopular, isActive, sortOrder } = body;

      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (price !== undefined) updateData.price = price;
      if (features !== undefined) updateData.features = features;
      if (isPopular !== undefined) updateData.isPopular = isPopular;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

      const pkg = await prisma.publishingPackage.update({
        where: { id: packageId },
        data: updateData,
      });

      return NextResponse.json({ package: pkg });
    }

    // Update blog post (admin)
    if (path.startsWith('/admin/blog/') && pathSegments.length === 3) {
      const postId = pathSegments[2];
      const {
        title,
        content,
        excerpt,
        coverImage,
        authorName,
        category: blogCategory,
        tags,
        isPublished,
        linkedBookId,
        seoTitle,
        seoDesc,
      } = body;

      const updateData = {};
      if (title !== undefined) updateData.title = title;
      if (content !== undefined) updateData.content = content;
      if (excerpt !== undefined) updateData.excerpt = excerpt;
      if (coverImage !== undefined) updateData.coverImage = coverImage;
      if (authorName !== undefined) updateData.authorName = authorName;
      if (blogCategory !== undefined) updateData.category = blogCategory;
      if (tags !== undefined) updateData.tags = Array.isArray(tags) ? tags : tags?.split(',').map(t => t.trim());
      if (linkedBookId !== undefined) updateData.linkedBookId = linkedBookId || null;
      if (seoTitle !== undefined) updateData.seoTitle = seoTitle;
      if (seoDesc !== undefined) updateData.seoDesc = seoDesc;

      // Handle publishing
      if (isPublished !== undefined) {
        updateData.isPublished = isPublished;
        if (isPublished) {
          const existingPost = await prisma.blogPost.findUnique({ where: { id: postId } });
          if (!existingPost.publishedAt) {
            updateData.publishedAt = new Date();
          }
        }
      }

      const post = await prisma.blogPost.update({
        where: { id: postId },
        data: updateData,
      });

      return NextResponse.json({ post });
    }

    // Update user blog writer status (admin)
    if (path.startsWith('/admin/users/') && pathSegments.length === 4 && pathSegments[3] === 'blog-writer') {
      const userId = pathSegments[2];
      const { isBlogWriter } = body;

      const user = await prisma.user.update({
        where: { id: userId },
        data: { isBlogWriter: isBlogWriter === true },
        select: { id: true, name: true, email: true, isBlogWriter: true },
      });

      return NextResponse.json({ user });
    }

    // Update book
    if (path.startsWith('/books/') && pathSegments.length === 2) {
      const bookId = pathSegments[1];

      const book = await prisma.book.update({
        where: { id: bookId },
        data: body,
      });

      return NextResponse.json({ book });
    }

    // Update stage
    if (path.startsWith('/stages/') && pathSegments.length === 2) {
      const stageId = pathSegments[1];

      const stage = await prisma.publishingStage.update({
        where: { id: stageId },
        data: body,
      });

      return NextResponse.json({ stage });
    }

    // Update query
    if (path.startsWith('/queries/') && pathSegments.length === 2) {
      const queryId = pathSegments[1];

      const query = await prisma.query.update({
        where: { id: queryId },
        data: body,
      });

      return NextResponse.json({ query });
    }

    // Update lead
    if (path.startsWith('/leads/') && pathSegments.length === 2) {
      const leadId = pathSegments[1];

      const lead = await prisma.lead.update({
        where: { id: leadId },
        data: body,
      });

      return NextResponse.json({ lead });
    }

    // Update order status (admin)
    if (path.startsWith('/orders/') && pathSegments.length === 2) {
      const orderId = pathSegments[1];

      const order = await prisma.order.update({
        where: { id: orderId },
        data: body,
      });

      return NextResponse.json({ order });
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (error) {
    console.error('API PUT Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request, context) {
  const params = await context.params;
  const pathSegments = params?.path || [];
  const path = '/' + pathSegments.join('/');

  try {
    // Delete category (admin)
    if (path.startsWith('/admin/categories/') && pathSegments.length === 3) {
      const categoryId = pathSegments[2];
      
      // Check if category has books
      const bookCount = await prisma.bookCategory.count({
        where: { categoryId },
      });
      
      if (bookCount > 0) {
        return NextResponse.json(
          { error: 'Cannot delete category with associated books' },
          { status: 400 }
        );
      }
      
      await prisma.category.delete({ where: { id: categoryId } });
      return NextResponse.json({ success: true });
    }

    // Delete stage template (soft delete - set isActive to false)
    if (path.startsWith('/admin/stage-templates/') && pathSegments.length === 3) {
      const templateId = pathSegments[2];
      
      await prisma.stageTemplate.update({
        where: { id: templateId },
        data: { isActive: false },
      });
      
      return NextResponse.json({ success: true });
    }

    // Delete stage from a book
    if (path.match(/\/admin\/books\/[^/]+\/stages\/[^/]+$/) && pathSegments.length === 5) {
      const bookId = pathSegments[2];
      const stageId = pathSegments[4];
      
      const stage = await prisma.publishingStage.findUnique({ where: { id: stageId } });
      if (!stage || stage.bookId !== bookId) {
        return NextResponse.json({ error: 'Stage not found' }, { status: 404 });
      }
      
      // Don't allow deleting completed or locked stages
      if (stage.isLocked || stage.status === 'COMPLETED' || stage.status === 'APPROVED') {
        return NextResponse.json({ error: 'Cannot delete a completed or locked stage' }, { status: 400 });
      }
      
      await prisma.publishingStage.delete({ where: { id: stageId } });
      return NextResponse.json({ success: true });
    }

    // Delete blog post (admin)
    if (path.startsWith('/admin/blog/') && pathSegments.length === 3) {
      const postId = pathSegments[2];
      await prisma.blogPost.delete({ where: { id: postId } });
      return NextResponse.json({ success: true });
    }

    // Delete blog comment (admin)
    if (path.startsWith('/admin/blog/comments/') && pathSegments.length === 4) {
      const commentId = pathSegments[3];
      await prisma.blogComment.delete({ where: { id: commentId } });
      return NextResponse.json({ success: true });
    }

    // Delete guest post (admin)
    if (path.startsWith('/admin/guest-posts/') && pathSegments.length === 3) {
      const guestPostId = pathSegments[2];
      await prisma.guestPost.delete({ where: { id: guestPostId } });
      return NextResponse.json({ success: true });
    }

    // ==================== ADMIN DELETE ROUTES ====================

    // DELETE /api/admin/users/[id] - Delete user (soft delete by deactivating)
    if (path.startsWith('/admin/users/') && pathSegments.length === 3) {
      const userId = pathSegments[2];
      // Soft delete - just deactivate
      await prisma.user.update({
        where: { id: userId },
        data: { isActive: false },
      });
      return NextResponse.json({ success: true });
    }

    // DELETE /api/admin/orders/stages/[id] - Delete order stage
    if (path.match(/^\/admin\/orders\/stages\/[^/]+$/) && pathSegments.length === 4) {
      const stageId = pathSegments[3];
      await prisma.orderStage.update({
        where: { id: stageId },
        data: { isActive: false },
      });
      return NextResponse.json({ success: true });
    }

    // DELETE /api/admin/packages/[id] - Delete package (soft delete)
    if (path.startsWith('/admin/packages/') && pathSegments.length === 3) {
      const packageId = pathSegments[2];
      await prisma.publishingPackage.update({
        where: { id: packageId },
        data: { isActive: false },
      });
      return NextResponse.json({ success: true });
    }

    // Delete book
    if (path.startsWith('/books/') && pathSegments.length === 2) {
      const bookId = pathSegments[1];
      await prisma.book.delete({ where: { id: bookId } });
      return NextResponse.json({ success: true });
    }

    // Delete query
    if (path.startsWith('/queries/') && pathSegments.length === 2) {
      const queryId = pathSegments[1];
      await prisma.query.delete({ where: { id: queryId } });
      return NextResponse.json({ success: true });
    }

    // Delete lead
    if (path.startsWith('/leads/') && pathSegments.length === 2) {
      const leadId = pathSegments[1];
      await prisma.lead.delete({ where: { id: leadId } });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (error) {
    console.error('API DELETE Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
