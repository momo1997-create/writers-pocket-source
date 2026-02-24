// New API Routes for Writer's Pocket Phase 1
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSetting, getSettings, getSettingsByCategory, setSetting } from '@/lib/site-settings';
import { syncLeadToSheets, syncAnthologyToSheets } from '@/lib/google-sheets';
import { emailEvents } from '@/lib/email';

// GET /api/settings
export async function getSettingsHandler(request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const key = searchParams.get('key');

  try {
    if (key) {
      const value = await getSetting(key);
      return NextResponse.json({ key, value });
    }

    if (category) {
      const settings = await getSettingsByCategory(category);
      return NextResponse.json({ settings });
    }

    // Return all settings
    const allSettings = await prisma.siteSetting.findMany();
    return NextResponse.json({ settings: allSettings });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/settings
export async function setSettingsHandler(request) {
  try {
    const body = await request.json();
    const { key, value, settings } = body;

    if (settings) {
      // Batch update
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
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET /api/addons
export async function getAddOnsHandler(request) {
  const { searchParams } = new URL(request.url);
  const serviceType = searchParams.get('serviceType');

  try {
    const where = { isActive: true };
    if (serviceType) {
      where.serviceType = serviceType;
    }

    const addOns = await prisma.serviceAddOn.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({ addOns });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET /api/reviews
export async function getReviewsHandler(request) {
  const { searchParams } = new URL(request.url);
  const displayOn = searchParams.get('displayOn');
  const bookId = searchParams.get('bookId');
  const featured = searchParams.get('featured');

  try {
    const where = { isApproved: true };
    
    if (bookId) {
      where.bookId = bookId;
    }
    
    if (featured === 'true') {
      where.isFeatured = true;
    }

    let reviews = await prisma.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // Filter by displayOn if specified
    if (displayOn) {
      reviews = reviews.filter(r => {
        const displays = r.displayOn || [];
        return displays.includes(displayOn);
      });
    }

    return NextResponse.json({ reviews });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/enrollments
export async function createEnrollmentHandler(request) {
  try {
    const body = await request.json();
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

    // Calculate total with add-ons
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

    // Apply discount if code provided
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

    // Also create a lead for CRM tracking
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

    // Sync to Google Sheets (mocked)
    await syncLeadToSheets({
      name,
      email,
      phone,
      source: 'WEBSITE',
      interestArea: serviceType,
      status: 'NEW',
    });

    // TODO: Create Razorpay order if payment mode
    // For now, return enrollment without payment

    return NextResponse.json({
      enrollment,
      paymentRequired: totalAmount > 0,
      amount: totalAmount,
    });
  } catch (error) {
    console.error('Enrollment error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET /api/categories
export async function getCategoriesHandler(request) {
  try {
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

    // Filter to only top-level categories
    const topLevel = categories.filter(c => !c.parentId);

    return NextResponse.json({ categories: topLevel });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/categories (admin)
export async function createCategoryHandler(request) {
  try {
    const body = await request.json();
    const { name, description, parentId, seoTitle, seoDesc } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Generate slug
    let slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-');
    let counter = 1;
    while (await prisma.category.findUnique({ where: { slug } })) {
      slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${counter}`;
      counter++;
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug,
        description,
        parentId,
        seoTitle: seoTitle || name,
        seoDesc,
      },
    });

    return NextResponse.json({ category });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/anthology
export async function createAnthologySubmissionHandler(request) {
  try {
    const body = await request.json();
    const {
      name,
      phone,
      isWhatsApp,
      whatsAppNumber,
      email,
      instagramUsername,
      poetryTitle,
      poetryContent,
      bio,
      contactPreference,
    } = body;

    if (!name || !phone || !email || !poetryTitle || !poetryContent || !contactPreference) {
      return NextResponse.json(
        { error: 'All required fields must be filled' },
        { status: 400 }
      );
    }

    const submission = await prisma.anthologySubmission.create({
      data: {
        name,
        phone,
        isWhatsApp: isWhatsApp !== false,
        whatsAppNumber: isWhatsApp === false ? whatsAppNumber : null,
        email,
        instagramUsername,
        poetryTitle,
        poetryContent,
        bio,
        contactPreference,
      },
    });

    // Sync to Google Sheets (mocked)
    await syncAnthologyToSheets(submission);

    return NextResponse.json({ submission, success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET /api/anthology/count - Get today's submission count
export async function getAnthologyCountHandler(request) {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const count = await prisma.anthologySubmission.count({
      where: {
        createdAt: { gte: twentyFourHoursAgo },
      },
    });

    return NextResponse.json({ count, period: '24h' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET /api/discounts
export async function getDiscountsHandler(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const appliesTo = searchParams.get('appliesTo');

  try {
    if (code) {
      const discount = await prisma.discount.findUnique({
        where: { code },
      });

      if (!discount || !discount.isActive) {
        return NextResponse.json({ valid: false, error: 'Invalid or expired code' });
      }

      // Check expiry
      if (discount.expiresAt && new Date() > discount.expiresAt) {
        return NextResponse.json({ valid: false, error: 'Code has expired' });
      }

      // Check max uses
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
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET /api/homepage - Homepage data
export async function getHomepageDataHandler(request) {
  try {
    // Get settings
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

    // Recent releases
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

    // Best sellers
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

    // Live counter
    if (showLiveCounter) {
      data.booksPublished = await prisma.book.count({
        where: { status: 'PUBLISHED' },
      });
    }

    // Featured reviews
    data.reviews = await prisma.review.findMany({
      where: {
        isApproved: true,
        isFeatured: true,
      },
      take: 6,
    });

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Export handlers map
export const newApiHandlers = {
  'settings': { GET: getSettingsHandler, POST: setSettingsHandler },
  'addons': { GET: getAddOnsHandler },
  'reviews': { GET: getReviewsHandler },
  'enrollments': { POST: createEnrollmentHandler },
  'categories': { GET: getCategoriesHandler, POST: createCategoryHandler },
  'anthology': { POST: createAnthologySubmissionHandler },
  'anthology/count': { GET: getAnthologyCountHandler },
  'discounts': { GET: getDiscountsHandler },
  'homepage': { GET: getHomepageDataHandler },
};
