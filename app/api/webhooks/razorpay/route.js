// Razorpay Webhook Handler
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyWebhookSignature, isRazorpayConfigured } from '@/lib/razorpay';

export async function POST(request) {
  try {
    // Check if Razorpay is configured
    if (!isRazorpayConfigured()) {
      return NextResponse.json(
        { error: 'Razorpay webhook not configured' },
        { status: 400 }
      );
    }

    // Get raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing signature header' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    const isValid = verifyWebhookSignature(body, signature);
    if (!isValid) {
      console.warn('Invalid Razorpay webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse event
    const event = JSON.parse(body);
    const { event: eventType, payload } = event;

    console.log(`Razorpay webhook received: ${eventType}`);

    // Handle different webhook events
    switch (eventType) {
      case 'payment.captured':
        await handlePaymentCaptured(payload);
        break;

      case 'payment.failed':
        await handlePaymentFailed(payload);
        break;

      case 'payment.authorized':
        await handlePaymentAuthorized(payload);
        break;

      case 'refund.created':
        await handleRefundCreated(payload);
        break;

      case 'order.paid':
        await handleOrderPaid(payload);
        break;

      default:
        console.log(`Unhandled webhook event: ${eventType}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handlePaymentCaptured(payload) {
  const payment = payload.payment.entity;
  
  const order = await prisma.order.findFirst({
    where: { razorpayOrderId: payment.order_id },
    include: { items: { include: { book: true } }, user: true },
  });

  if (!order) {
    console.warn(`Order not found for payment: ${payment.id}`);
    return;
  }

  // Update order status
  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: 'PAID',
      razorpayPaymentId: payment.id,
      paymentMethod: payment.method,
      paidAt: new Date(),
    },
  });

  // Create royalty records
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

  // Send notification to user
  await prisma.notification.create({
    data: {
      userId: order.userId,
      type: 'PAYMENT_RECEIVED',
      title: 'Payment Successful',
      message: `Your payment for order ${order.orderNumber} has been received.`,
      link: `/orders/${order.id}`,
    },
  });

  console.log(`Payment captured for order: ${order.orderNumber}`);
}

async function handlePaymentFailed(payload) {
  const payment = payload.payment.entity;
  
  const order = await prisma.order.findFirst({
    where: { razorpayOrderId: payment.order_id },
  });

  if (!order) {
    console.warn(`Order not found for failed payment: ${payment.id}`);
    return;
  }

  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: 'PAYMENT_FAILED',
      razorpayPaymentId: payment.id,
    },
  });

  // Send notification
  await prisma.notification.create({
    data: {
      userId: order.userId,
      type: 'ORDER_STATUS',
      title: 'Payment Failed',
      message: `Payment for order ${order.orderNumber} failed. Please try again.`,
      link: `/orders/${order.id}`,
    },
  });

  console.log(`Payment failed for order: ${order.orderNumber}`);
}

async function handlePaymentAuthorized(payload) {
  const payment = payload.payment.entity;
  
  const order = await prisma.order.findFirst({
    where: { razorpayOrderId: payment.order_id },
  });

  if (!order) return;

  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: 'PAYMENT_PENDING',
      razorpayPaymentId: payment.id,
    },
  });

  console.log(`Payment authorized for order: ${order.orderNumber}`);
}

async function handleRefundCreated(payload) {
  const refund = payload.refund.entity;
  
  const order = await prisma.order.findFirst({
    where: { razorpayPaymentId: refund.payment_id },
  });

  if (!order) {
    console.warn(`Order not found for refund: ${refund.id}`);
    return;
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { status: 'REFUNDED' },
  });

  // Send notification
  await prisma.notification.create({
    data: {
      userId: order.userId,
      type: 'ORDER_STATUS',
      title: 'Refund Processed',
      message: `Refund for order ${order.orderNumber} has been initiated.`,
      link: `/orders/${order.id}`,
    },
  });

  console.log(`Refund created for order: ${order.orderNumber}`);
}

async function handleOrderPaid(payload) {
  const orderData = payload.order.entity;
  
  const order = await prisma.order.findFirst({
    where: { razorpayOrderId: orderData.id },
  });

  if (!order) return;

  if (order.status !== 'PAID') {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: 'PAID', paidAt: new Date() },
    });
  }

  console.log(`Order paid: ${order.orderNumber}`);
}
