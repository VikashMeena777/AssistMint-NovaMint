// ============================================
// AssistMint — Invoice PDF Generator
// Generates order receipt PDFs using jsPDF
// ============================================

import { jsPDF } from 'jspdf';

interface InvoiceItem {
  item_name: string;
  variant_name?: string;
  quantity: number;
  unit_price: number; // in paise
  special_instructions?: string;
}

interface InvoiceData {
  orderId: string;
  orderNumber: string;
  restaurantName: string;
  restaurantPhone?: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress?: string;
  deliveryType: 'delivery' | 'pickup' | 'dine_in';
  items: InvoiceItem[];
  subtotal: number; // paise
  tax: number; // paise
  deliveryFee: number; // paise
  discount: number; // paise
  total: number; // paise
  paymentMethod: string;
  createdAt: string;
}

function toPriceStr(paise: number): string {
  return `Rs. ${(paise / 100).toFixed(2)}`;
}

/**
 * Generate a professional PDF invoice/receipt for an order.
 * Returns a Buffer of the PDF file.
 */
export function generateInvoicePDF(data: InvoiceData): Buffer {
  const doc = new jsPDF({ unit: 'mm', format: 'a5' }); // A5 = receipt-like size

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // ─── Header ─────────────────────────────
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(data.restaurantName.toUpperCase(), pageWidth / 2, y, { align: 'center' });
  y += 6;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  if (data.restaurantPhone) {
    doc.text(`Tel: ${data.restaurantPhone}`, pageWidth / 2, y, { align: 'center' });
    y += 4;
  }

  // Divider
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  // ─── Invoice Info ────────────────────────
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('TAX INVOICE', pageWidth / 2, y, { align: 'center' });
  y += 6;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');

  const dateStr = new Date(data.createdAt).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });

  // Two-column info
  const infoLeft = [
    `Order: #${data.orderNumber}`,
    `Date: ${dateStr}`,
    `Type: ${data.deliveryType === 'delivery' ? 'Delivery' : data.deliveryType === 'pickup' ? 'Pickup' : 'Dine-In'}`,
  ];
  const infoRight = [
    `Customer: ${data.customerName || 'Guest'}`,
    `Phone: ${data.customerPhone}`,
    `Payment: ${data.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online'}`,
  ];

  infoLeft.forEach((line, i) => {
    doc.text(line, margin, y + i * 4);
  });
  infoRight.forEach((line, i) => {
    doc.text(line, pageWidth / 2 + 4, y + i * 4);
  });
  y += Math.max(infoLeft.length, infoRight.length) * 4 + 2;

  if (data.deliveryAddress && data.deliveryType === 'delivery') {
    doc.text(`Delivery: ${data.deliveryAddress.substring(0, 60)}`, margin, y);
    y += 5;
  }

  // Divider
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  // ─── Items Table ────────────────────────
  // Header row
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('#', margin, y);
  doc.text('Item', margin + 6, y);
  doc.text('Qty', margin + contentWidth - 32, y, { align: 'right' });
  doc.text('Price', margin + contentWidth - 16, y, { align: 'right' });
  doc.text('Total', margin + contentWidth, y, { align: 'right' });
  y += 2;

  doc.setLineWidth(0.2);
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  // Item rows
  doc.setFont('helvetica', 'normal');
  data.items.forEach((item, i) => {
    const itemTotal = item.unit_price * item.quantity;
    const name = item.variant_name
      ? `${item.item_name} (${item.variant_name})`
      : item.item_name;

    doc.text(`${i + 1}`, margin, y);
    doc.text(name.substring(0, 28), margin + 6, y);
    doc.text(`${item.quantity}`, margin + contentWidth - 32, y, { align: 'right' });
    doc.text(toPriceStr(item.unit_price), margin + contentWidth - 16, y, { align: 'right' });
    doc.text(toPriceStr(itemTotal), margin + contentWidth, y, { align: 'right' });
    y += 4;

    if (item.special_instructions) {
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.text(`  Note: ${item.special_instructions.substring(0, 40)}`, margin + 6, y);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(8);
      y += 3.5;
    }
  });

  // Divider
  y += 1;
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  // ─── Totals ──────────────────────────────
  const totalsX = margin + contentWidth - 40;
  const totalsValX = margin + contentWidth;

  doc.text('Subtotal:', totalsX, y, { align: 'right' });
  doc.text(toPriceStr(data.subtotal), totalsValX, y, { align: 'right' });
  y += 4;

  doc.text('GST (5%):', totalsX, y, { align: 'right' });
  doc.text(toPriceStr(data.tax), totalsValX, y, { align: 'right' });
  y += 4;

  if (data.deliveryFee > 0) {
    doc.text('Delivery:', totalsX, y, { align: 'right' });
    doc.text(toPriceStr(data.deliveryFee), totalsValX, y, { align: 'right' });
    y += 4;
  }

  if (data.discount > 0) {
    doc.setTextColor(0, 150, 0);
    doc.text('Discount:', totalsX, y, { align: 'right' });
    doc.text(`-${toPriceStr(data.discount)}`, totalsValX, y, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    y += 4;
  }

  // Total line
  doc.setLineWidth(0.5);
  doc.line(margin + contentWidth - 55, y, pageWidth - margin, y);
  y += 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('TOTAL:', totalsX, y, { align: 'right' });
  doc.text(toPriceStr(data.total), totalsValX, y, { align: 'right' });
  y += 8;

  // ─── Footer ──────────────────────────────
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text('Thank you for your order!', pageWidth / 2, y, { align: 'center' });
  y += 3;
  doc.text('Powered by AssistMint', pageWidth / 2, y, { align: 'center' });
  y += 3;
  doc.text(`Invoice ID: ${data.orderId.substring(0, 8)}`, pageWidth / 2, y, { align: 'center' });

  // Convert to Buffer
  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}

export type { InvoiceData, InvoiceItem };
