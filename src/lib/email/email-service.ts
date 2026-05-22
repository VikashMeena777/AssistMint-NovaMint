// ============================================
// AssistMint — Email Service (Resend)
// Reliable email notifications for restaurant owners
// ============================================

import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.DEFAULT_FROM_EMAIL || 'AssistMint <notifications@assistmint.com>';

// ─── Send New Order Email ───────────────────

interface OrderEmailData {
  restaurantName: string;
  ownerEmail: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  items: { item_name: string; quantity: number; price?: number }[];
  total: number; // in paise
  paymentMethod: string;
  deliveryAddress: string;
  orderId: string;
}

export async function sendNewOrderEmail(data: OrderEmailData): Promise<void> {
  if (!resend) {
    console.log('[Email] Resend not configured, skipping email');
    return;
  }

  const totalRupees = (data.total / 100).toFixed(0);
  const itemRows = data.items
    .map(
      (i) =>
        `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;">${i.quantity}x ${i.item_name}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;text-align:right;">${i.price ? '₹' + (i.price / 100).toFixed(0) : ''}</td>
        </tr>`
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#f7f7f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <div style="max-width:520px;margin:0 auto;padding:24px;">
        <!-- Header -->
        <div style="background:linear-gradient(135deg,#10b981,#059669);border-radius:16px 16px 0 0;padding:28px 24px;text-align:center;">
          <h1 style="margin:0;color:white;font-size:20px;font-weight:700;">🔔 New Order #${data.orderNumber}</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">${data.restaurantName}</p>
        </div>

        <!-- Body -->
        <div style="background:white;padding:24px;border-radius:0 0 16px 16px;border:1px solid #e5e7eb;border-top:none;">
          <!-- Customer Info -->
          <div style="background:#f9fafb;border-radius:12px;padding:16px;margin-bottom:20px;">
            <p style="margin:0 0 4px;font-size:13px;color:#6b7280;">Customer</p>
            <p style="margin:0;font-size:15px;font-weight:600;color:#111827;">${data.customerName}</p>
            <p style="margin:4px 0 0;font-size:13px;color:#6b7280;">${data.customerPhone}</p>
          </div>

          <!-- Items -->
          <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
            <thead>
              <tr style="background:#f9fafb;">
                <th style="padding:8px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;">Item</th>
                <th style="padding:8px 12px;text-align:right;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;">Price</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
          </table>

          <!-- Total -->
          <div style="display:flex;justify-content:space-between;align-items:center;background:#f0fdf4;border-radius:12px;padding:14px 16px;margin-bottom:16px;">
            <span style="font-size:14px;font-weight:600;color:#065f46;">Total</span>
            <span style="font-size:20px;font-weight:800;color:#059669;">₹${totalRupees}</span>
          </div>

          <!-- Details -->
          <div style="font-size:13px;color:#6b7280;space-y:6px;">
            <p style="margin:6px 0;">💳 <strong>Payment:</strong> ${data.paymentMethod}</p>
            <p style="margin:6px 0;">📍 <strong>Delivery:</strong> ${data.deliveryAddress}</p>
          </div>

          <!-- CTA -->
          <div style="margin-top:24px;text-align:center;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://assistmint.com'}/dashboard/orders"
               style="display:inline-block;background:#10b981;color:white;padding:12px 32px;border-radius:12px;font-size:14px;font-weight:600;text-decoration:none;">
              View in Dashboard →
            </a>
          </div>
        </div>

        <!-- Footer -->
        <p style="text-align:center;font-size:11px;color:#9ca3af;margin-top:16px;">
          AssistMint · AI-Powered Restaurant Automation
        </p>
      </div>
    </body>
    </html>
  `;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: data.ownerEmail,
      subject: `🔔 New Order #${data.orderNumber} — ₹${totalRupees}`,
      html,
    });
    console.log(`[Email] New order email sent to ${data.ownerEmail}`);
  } catch (error) {
    console.error('[Email] Failed to send new order email:', error);
  }
}

// ─── Send Daily Summary Email ───────────────

interface DailySummaryEmailData {
  restaurantName: string;
  ownerEmail: string;
  date: string;
  totalOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  revenue: number; // in paise
  uniqueCustomers: number;
}

export async function sendDailySummaryEmail(data: DailySummaryEmailData): Promise<void> {
  if (!resend) return;

  const revenueRupees = (data.revenue / 100).toFixed(0);

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#f7f7f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <div style="max-width:520px;margin:0 auto;padding:24px;">
        <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:16px 16px 0 0;padding:28px 24px;text-align:center;">
          <h1 style="margin:0;color:white;font-size:20px;font-weight:700;">📊 Daily Summary</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">${data.restaurantName} · ${data.date}</p>
        </div>

        <div style="background:white;padding:24px;border-radius:0 0 16px 16px;border:1px solid #e5e7eb;border-top:none;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">
            <div style="background:#f0fdf4;border-radius:12px;padding:16px;text-align:center;">
              <p style="margin:0;font-size:28px;font-weight:800;color:#059669;">₹${revenueRupees}</p>
              <p style="margin:4px 0 0;font-size:12px;color:#6b7280;">Revenue</p>
            </div>
            <div style="background:#eff6ff;border-radius:12px;padding:16px;text-align:center;">
              <p style="margin:0;font-size:28px;font-weight:800;color:#2563eb;">${data.totalOrders}</p>
              <p style="margin:4px 0 0;font-size:12px;color:#6b7280;">Orders</p>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
            <div style="background:#f9fafb;border-radius:10px;padding:12px;text-align:center;">
              <p style="margin:0;font-size:20px;font-weight:700;color:#16a34a;">${data.deliveredOrders}</p>
              <p style="margin:2px 0 0;font-size:11px;color:#6b7280;">Delivered</p>
            </div>
            <div style="background:#f9fafb;border-radius:10px;padding:12px;text-align:center;">
              <p style="margin:0;font-size:20px;font-weight:700;color:#dc2626;">${data.cancelledOrders}</p>
              <p style="margin:2px 0 0;font-size:11px;color:#6b7280;">Cancelled</p>
            </div>
            <div style="background:#f9fafb;border-radius:10px;padding:12px;text-align:center;">
              <p style="margin:0;font-size:20px;font-weight:700;color:#7c3aed;">${data.uniqueCustomers}</p>
              <p style="margin:2px 0 0;font-size:11px;color:#6b7280;">Customers</p>
            </div>
          </div>

          <div style="margin-top:24px;text-align:center;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://assistmint.com'}/dashboard/analytics"
               style="display:inline-block;background:#6366f1;color:white;padding:12px 32px;border-radius:12px;font-size:14px;font-weight:600;text-decoration:none;">
              View Analytics →
            </a>
          </div>
        </div>

        <p style="text-align:center;font-size:11px;color:#9ca3af;margin-top:16px;">
          AssistMint · AI-Powered Restaurant Automation
        </p>
      </div>
    </body>
    </html>
  `;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: data.ownerEmail,
      subject: `📊 Daily Summary — ₹${revenueRupees} revenue, ${data.totalOrders} orders`,
      html,
    });
    console.log(`[Email] Daily summary sent to ${data.ownerEmail}`);
  } catch (error) {
    console.error('[Email] Failed to send daily summary:', error);
  }
}

// ─── Send Payment Received Email ────────────

interface PaymentEmailData {
  restaurantName: string;
  ownerEmail: string;
  orderNumber: string;
  amount: number; // in paise
  paymentMethod: string;
  customerName: string;
}

export async function sendPaymentReceivedEmail(data: PaymentEmailData): Promise<void> {
  if (!resend) return;

  const amountRupees = (data.amount / 100).toFixed(0);

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#f7f7f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <div style="max-width:520px;margin:0 auto;padding:24px;">
        <div style="background:linear-gradient(135deg,#f59e0b,#d97706);border-radius:16px 16px 0 0;padding:28px 24px;text-align:center;">
          <h1 style="margin:0;color:white;font-size:20px;font-weight:700;">💰 Payment Received</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">${data.restaurantName}</p>
        </div>

        <div style="background:white;padding:24px;border-radius:0 0 16px 16px;border:1px solid #e5e7eb;border-top:none;">
          <div style="text-align:center;margin-bottom:20px;">
            <p style="margin:0;font-size:36px;font-weight:800;color:#16a34a;">₹${amountRupees}</p>
            <p style="margin:4px 0 0;font-size:13px;color:#6b7280;">Order #${data.orderNumber}</p>
          </div>

          <div style="background:#f9fafb;border-radius:12px;padding:16px;">
            <p style="margin:4px 0;font-size:13px;color:#6b7280;">👤 <strong>Customer:</strong> ${data.customerName}</p>
            <p style="margin:4px 0;font-size:13px;color:#6b7280;">💳 <strong>Method:</strong> ${data.paymentMethod}</p>
          </div>

          <div style="margin-top:24px;text-align:center;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://assistmint.com'}/dashboard/payments"
               style="display:inline-block;background:#f59e0b;color:white;padding:12px 32px;border-radius:12px;font-size:14px;font-weight:600;text-decoration:none;">
              View Payments →
            </a>
          </div>
        </div>

        <p style="text-align:center;font-size:11px;color:#9ca3af;margin-top:16px;">
          AssistMint · AI-Powered Restaurant Automation
        </p>
      </div>
    </body>
    </html>
  `;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: data.ownerEmail,
      subject: `💰 Payment ₹${amountRupees} received — Order #${data.orderNumber}`,
      html,
    });
  } catch (error) {
    console.error('[Email] Failed to send payment email:', error);
  }
}
