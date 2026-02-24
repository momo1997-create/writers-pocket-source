// Email Service for Writer's Pocket
// Currently mocked, designed for Amazon SES integration

import prisma from './prisma';

const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || 'mock';

// Check if SES is configured
export function isEmailConfigured() {
  return (
    EMAIL_PROVIDER === 'ses' &&
    process.env.AWS_SES_ACCESS_KEY_ID &&
    process.env.AWS_SES_SECRET_ACCESS_KEY &&
    process.env.AWS_SES_REGION &&
    process.env.AWS_SES_FROM_EMAIL
  );
}

// Send email (mocked for now)
export async function sendEmail({ to, subject, html, text, templateId = null }) {
  try {
    // Log the email attempt
    const emailLog = await prisma.emailLog.create({
      data: {
        to,
        from: process.env.AWS_SES_FROM_EMAIL || 'noreply@writerspocket.com',
        subject,
        templateId,
        status: 'pending',
        provider: EMAIL_PROVIDER,
      },
    });

    if (EMAIL_PROVIDER === 'ses' && isEmailConfigured()) {
      // TODO: Implement actual SES sending
      // const ses = new AWS.SES({ region: process.env.AWS_SES_REGION });
      // const result = await ses.sendEmail({...}).promise();
      
      console.log('[SES] Email would be sent:', { to, subject });
      
      await prisma.emailLog.update({
        where: { id: emailLog.id },
        data: { status: 'sent', sentAt: new Date() },
      });
      
      return { success: true, messageId: emailLog.id };
    }

    // Mock mode - just log
    console.log('[MOCK EMAIL]', {
      to,
      subject,
      provider: 'mock',
      timestamp: new Date().toISOString(),
    });

    await prisma.emailLog.update({
      where: { id: emailLog.id },
      data: { status: 'sent', sentAt: new Date(), provider: 'mock' },
    });

    return { success: true, messageId: emailLog.id, mocked: true };
  } catch (error) {
    console.error('[EMAIL ERROR]', error);
    return { success: false, error: error.message };
  }
}

// Send templated email
export async function sendTemplatedEmail(templateName, to, variables = {}) {
  try {
    const template = await prisma.emailTemplate.findUnique({
      where: { name: templateName },
    });

    if (!template || !template.isActive) {
      console.warn(`Email template '${templateName}' not found or inactive`);
      return { success: false, error: 'Template not found' };
    }

    // Replace variables in template
    let subject = template.subject;
    let html = template.htmlContent;
    let text = template.textContent || '';

    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      subject = subject.replace(regex, value);
      html = html.replace(regex, value);
      text = text.replace(regex, value);
    });

    return await sendEmail({
      to,
      subject,
      html,
      text,
      templateId: template.id,
    });
  } catch (error) {
    console.error('[TEMPLATED EMAIL ERROR]', error);
    return { success: false, error: error.message };
  }
}

// Email event hooks
export const emailEvents = {
  // User events
  async onUserRegistered(user) {
    return await sendTemplatedEmail('welcome', user.email, {
      name: user.name,
      email: user.email,
    });
  },

  // Service enrollment events
  async onEnrollmentPaid(enrollment) {
    return await sendTemplatedEmail('enrollment_confirmed', enrollment.email, {
      name: enrollment.name,
      service: enrollment.serviceType === 'free_publishing' ? 'Free Publishing' : 'Writing Challenge',
      amount: enrollment.finalAmount,
    });
  },

  // Publishing stage events
  async onStageUpdated(book, stage, user) {
    return await sendTemplatedEmail('stage_update', user.email, {
      name: user.name,
      bookTitle: book.title,
      stageName: stage.stageType.replace(/_/g, ' '),
      stageStatus: stage.status,
    });
  },

  // Query events
  async onQueryResponse(query, user) {
    return await sendTemplatedEmail('query_response', user.email, {
      name: user.name,
      querySubject: query.subject,
    });
  },

  // Order events
  async onOrderConfirmed(order, user) {
    return await sendTemplatedEmail('order_confirmed', user.email, {
      name: user.name,
      orderNumber: order.orderNumber,
      amount: order.totalAmount,
    });
  },

  // Guest post events
  async onGuestPostApproved(guestPost) {
    return await sendTemplatedEmail('guest_post_approved', guestPost.email, {
      name: guestPost.writerName,
      title: guestPost.title,
    });
  },

  async onGuestPostRejected(guestPost) {
    return await sendTemplatedEmail('guest_post_rejected', guestPost.email, {
      name: guestPost.writerName,
      title: guestPost.title,
      reason: guestPost.rejectReason || 'Not specified',
    });
  },
};
