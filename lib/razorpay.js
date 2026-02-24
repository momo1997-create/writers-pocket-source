// Razorpay Integration for Writer's Pocket
import Razorpay from 'razorpay';
import crypto from 'crypto';

// Initialize Razorpay instance
let razorpayInstance = null;

export function getRazorpay() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.warn('Razorpay keys not configured. Payment features will be disabled.');
    return null;
  }

  if (process.env.RAZORPAY_KEY_ID.includes('YOUR_KEY')) {
    console.warn('Razorpay keys are placeholder values. Payment features will be disabled.');
    return null;
  }

  if (!razorpayInstance) {
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }

  return razorpayInstance;
}

export function isRazorpayConfigured() {
  return (
    process.env.RAZORPAY_KEY_ID &&
    process.env.RAZORPAY_KEY_SECRET &&
    !process.env.RAZORPAY_KEY_ID.includes('YOUR_KEY')
  );
}

export function verifyPaymentSignature(orderId, paymentId, signature) {
  if (!process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay key secret not configured');
  }

  const body = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(signature)
  );
}

export function verifyWebhookSignature(body, signature) {
  if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
    throw new Error('Razorpay webhook secret not configured');
  }

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(body)
    .digest('hex');

  return expectedSignature === signature;
}

export async function createOrder(amount, currency = 'INR', receipt, notes = {}) {
  const razorpay = getRazorpay();
  if (!razorpay) {
    throw new Error('Razorpay is not configured');
  }

  return await razorpay.orders.create({
    amount: Math.round(amount * 100), // Convert to paise
    currency,
    receipt,
    notes,
  });
}

export async function fetchPayment(paymentId) {
  const razorpay = getRazorpay();
  if (!razorpay) {
    throw new Error('Razorpay is not configured');
  }

  return await razorpay.payments.fetch(paymentId);
}

export async function refundPayment(paymentId, amount = null) {
  const razorpay = getRazorpay();
  if (!razorpay) {
    throw new Error('Razorpay is not configured');
  }

  const refundOptions = { payment_id: paymentId };
  if (amount) {
    refundOptions.amount = Math.round(amount * 100);
  }

  return await razorpay.refunds.create(refundOptions);
}
