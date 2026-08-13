// ============================================
// AssistMint — Invoice PDF Generator
// Generates India GST-compliant order receipts
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
  restaurantAddress?: string;
  restaurantGstin?: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress?: string;
  deliveryType: 'delivery' | 'pickup' | 'dine_in';
  items: InvoiceItem[];
  subtotal: number; // paise
  tax: number; // paise
  taxRate?: number; // percentage (e.g. 5)
  deliveryFee: number; // paise
  discount: number; // paise
  total: number; // paise
  paymentMethod: string;
  createdAt: string;
  stateCode?: string; // e.g. "29" for Karnataka
  stateName?: string; // e.g. "Karnataka"
}

/**
 * Sanitize text for jsPDF — strip emojis and non-Latin characters
 * that jsPDF's default Helvetica font cannot render.
 * Keeps: ASCII printable, common accented Latin chars, Indian Rupee sign.
 */
function sanitizeForPdf(text: string): string {
  if (!text) return '';
  // Remove emoji and non-BMP characters (surrogate pairs)
  // Keep ASCII printable (0x20-0x7E), extended Latin (0xA0-0xFF), and Rupee sign (₹ = 0x20B9)
  return text
    .replace(/[\u{1F600}-\u{1F9FF}]/gu, '') // Emoticons & Supplemental symbols
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // Misc Symbols & Pictographs
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // Transport & Map symbols
    .replace(/[\u{2600}-\u{26FF}]/gu, '')   // Misc Symbols
    .replace(/[\u{2700}-\u{27BF}]/gu, '')   // Dingbats
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')   // Variation selectors
    .replace(/[\u{200D}]/gu, '')             // Zero width joiner
    .replace(/[\u{20E3}]/gu, '')             // Combining enclosing keycap
    .replace(/[\u{E0020}-\u{E007F}]/gu, '')  // Tags
    .replace(/[\uD800-\uDFFF]/g, '')         // Lone surrogates
    .replace(/[^\x20-\x7E\xA0-\xFF₹]/g, '') // Strip anything else non-Latin
    .replace(/\s+/g, ' ')                    // Collapse whitespace
    .trim();
}

function toRupee(paise: number): string {
  const val = (paise / 100).toFixed(2);
  // Indian number formatting: 1,23,456.00
  const [intPart, decPart] = val.split('.');
  const intNum = parseInt(intPart, 10);
  const formatted = intNum.toLocaleString('en-IN');
  return `${formatted}.${decPart}`;
}

function numberToWords(num: number): string {
  if (num === 0) return 'Zero';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convert(n: number): string {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + convert(n % 100) : '');
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '');
  }

  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);
  let result = 'Rupees ' + convert(rupees);
  if (paise > 0) {
    result += ' and ' + convert(paise) + ' Paise';
  }
  result += ' Only';
  return result;
}

/**
 * Draw a horizontal dashed line.
 */
function drawDashedLine(doc: jsPDF, x1: number, x2: number, y: number, dashLen = 1.5, gapLen = 1) {
  let x = x1;
  while (x < x2) {
    const end = Math.min(x + dashLen, x2);
    doc.line(x, y, end, y);
    x = end + gapLen;
  }
}

/**
 * Generate a professional, India GST-compliant PDF invoice/receipt.
 * Fully sanitizes customer names to prevent emoji corruption in jsPDF.
 * Returns a Buffer of the PDF file.
 */
export function generateInvoicePDF(data: InvoiceData): Buffer {
  const doc = new jsPDF({ unit: 'mm', format: 'a5' }); // A5 receipt-size

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;
  const contentWidth = pageWidth - margin * 2;
  const rightCol = margin + contentWidth;
  let y = margin;

  // Colors
  const black = [0, 0, 0] as const;
  const darkGray = [60, 60, 60] as const;
  const gray = [120, 120, 120] as const;
  const lightGray = [200, 200, 200] as const;
  const accentGreen = [16, 124, 65] as const; // Indian tax green

  // Sanitize customer name (removes emojis that crash jsPDF)
  const customerName = sanitizeForPdf(data.customerName) || 'Guest';
  const restaurantName = sanitizeForPdf(data.restaurantName) || 'Business';

  // ─── Header: Business Name ──────────────────
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...black);
  doc.text(restaurantName.toUpperCase(), pageWidth / 2, y, { align: 'center' });
  y += 5;

  // Business address (if available)
  if (data.restaurantAddress) {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...darkGray);
    const addr = sanitizeForPdf(data.restaurantAddress);
    if (addr) {
      const addrLines = doc.splitTextToSize(addr, contentWidth - 10);
      addrLines.forEach((line: string) => {
        doc.text(line, pageWidth / 2, y, { align: 'center' });
        y += 3;
      });
    }
  }

  // Phone
  if (data.restaurantPhone) {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...gray);
    doc.text(`Tel: ${data.restaurantPhone}`, pageWidth / 2, y, { align: 'center' });
    y += 3;
  }

  // GSTIN
  if (data.restaurantGstin) {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkGray);
    doc.text(`GSTIN: ${data.restaurantGstin}`, pageWidth / 2, y, { align: 'center' });
    y += 3;
  }

  y += 1;

  // ─── Double line separator ──────────────────
  doc.setDrawColor(...black);
  doc.setLineWidth(0.5);
  doc.line(margin, y, rightCol, y);
  y += 1;
  doc.setLineWidth(0.2);
  doc.line(margin, y, rightCol, y);
  y += 4;

  // ─── Invoice Title ──────────────────────────
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...black);
  const invoiceTitle = data.restaurantGstin ? 'TAX INVOICE' : 'BILL OF SUPPLY';
  doc.text(invoiceTitle, pageWidth / 2, y, { align: 'center' });
  y += 5;

  // ─── Invoice Meta (two columns) ─────────────
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...darkGray);

  const dateStr = new Date(data.createdAt).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });

  const deliveryLabel =
    data.deliveryType === 'delivery' ? 'Delivery' :
    data.deliveryType === 'pickup' ? 'Takeaway' : 'Dine-In';

  // Left column
  const leftInfo = [
    { label: 'Invoice No:', value: `#${data.orderNumber}` },
    { label: 'Date:', value: dateStr },
    { label: 'Type:', value: deliveryLabel },
  ];

  // Right column
  const rightInfo = [
    { label: 'Customer:', value: customerName },
    { label: 'Phone:', value: data.customerPhone || '-' },
    { label: 'Payment:', value: data.paymentMethod === 'cod' ? 'Cash' : data.paymentMethod === 'online' ? 'Online (Paid)' : data.paymentMethod.toUpperCase() },
  ];

  const infoStartY = y;
  leftInfo.forEach((info, i) => {
    doc.setFont('helvetica', 'bold');
    doc.text(info.label, margin, infoStartY + i * 4);
    doc.setFont('helvetica', 'normal');
    doc.text(` ${info.value}`, margin + doc.getTextWidth(info.label) + 1, infoStartY + i * 4);
  });

  rightInfo.forEach((info, i) => {
    doc.setFont('helvetica', 'bold');
    const labelWidth = doc.getTextWidth(info.label);
    doc.text(info.label, pageWidth / 2 + 2, infoStartY + i * 4);
    doc.setFont('helvetica', 'normal');
    doc.text(` ${info.value.substring(0, 22)}`, pageWidth / 2 + 2 + labelWidth + 1, infoStartY + i * 4);
  });

  y = infoStartY + Math.max(leftInfo.length, rightInfo.length) * 4 + 1;

  // Delivery address
  if (data.deliveryAddress && data.deliveryType === 'delivery') {
    doc.setFont('helvetica', 'bold');
    doc.text('Delivery:', margin, y);
    doc.setFont('helvetica', 'normal');
    const addrText = sanitizeForPdf(data.deliveryAddress).substring(0, 70);
    doc.text(` ${addrText}`, margin + doc.getTextWidth('Delivery:') + 1, y);
    y += 4;
  }

  // Place of supply
  if (data.stateName) {
    doc.setFont('helvetica', 'bold');
    doc.text('Place of Supply:', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(` ${data.stateName}${data.stateCode ? ' (' + data.stateCode + ')' : ''}`, margin + doc.getTextWidth('Place of Supply:') + 1, y);
    y += 4;
  }

  y += 1;

  // ─── Items Table ────────────────────────────
  // Table header
  doc.setDrawColor(...black);
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, y - 1, contentWidth, 5, 'F');
  doc.setLineWidth(0.3);
  doc.line(margin, y - 1, rightCol, y - 1);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...black);

  const col1 = margin + 1;      // #
  const col2 = margin + 7;      // Item
  const col3 = rightCol - 30;   // Qty
  const col4 = rightCol - 18;   // Rate
  const col5 = rightCol - 1;    // Amount

  doc.text('#', col1, y + 2);
  doc.text('Item Description', col2, y + 2);
  doc.text('Qty', col3, y + 2, { align: 'right' });
  doc.text('Rate', col4, y + 2, { align: 'right' });
  doc.text('Amount', col5, y + 2, { align: 'right' });

  y += 4;
  doc.line(margin, y, rightCol, y);
  y += 3;

  // Item rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...darkGray);

  data.items.forEach((item, i) => {
    const itemTotal = item.unit_price * item.quantity;
    const name = sanitizeForPdf(
      item.variant_name
        ? `${item.item_name} (${item.variant_name})`
        : item.item_name
    );

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...darkGray);
    doc.text(`${i + 1}`, col1, y);
    doc.text(name.substring(0, 30), col2, y);
    doc.text(`${item.quantity}`, col3, y, { align: 'right' });
    doc.text(toRupee(item.unit_price), col4, y, { align: 'right' });
    doc.text(toRupee(itemTotal), col5, y, { align: 'right' });
    y += 4;

    // Special instructions
    if (item.special_instructions) {
      doc.setFontSize(6.5);
      doc.setTextColor(...gray);
      const note = sanitizeForPdf(item.special_instructions);
      doc.text(`  Note: ${note.substring(0, 45)}`, col2, y);
      doc.setFontSize(7.5);
      y += 3;
    }
  });

  // ─── Separator ──────────────────────────────
  y += 1;
  doc.setDrawColor(...lightGray);
  doc.setLineWidth(0.3);
  drawDashedLine(doc, margin, rightCol, y);
  y += 4;

  // ─── Totals Section ─────────────────────────
  const labelX = rightCol - 42;
  const valueX = rightCol - 1;

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...darkGray);

  // Subtotal
  doc.text('Subtotal', labelX, y, { align: 'right' });
  doc.text(toRupee(data.subtotal), valueX, y, { align: 'right' });
  y += 4;

  // GST breakdown (CGST + SGST)
  const taxRate = data.taxRate || 5;
  const halfRate = taxRate / 2;
  const halfTax = Math.round(data.tax / 2);

  if (data.tax > 0 && data.restaurantGstin) {
    doc.text(`CGST @ ${halfRate}%`, labelX, y, { align: 'right' });
    doc.text(toRupee(halfTax), valueX, y, { align: 'right' });
    y += 4;

    doc.text(`SGST @ ${halfRate}%`, labelX, y, { align: 'right' });
    doc.text(toRupee(data.tax - halfTax), valueX, y, { align: 'right' });
    y += 4;
  } else if (data.tax > 0) {
    doc.text(`Tax (${taxRate}%)`, labelX, y, { align: 'right' });
    doc.text(toRupee(data.tax), valueX, y, { align: 'right' });
    y += 4;
  }

  // Delivery fee
  if (data.deliveryFee > 0) {
    doc.text('Delivery Charges', labelX, y, { align: 'right' });
    doc.text(toRupee(data.deliveryFee), valueX, y, { align: 'right' });
    y += 4;
  }

  // Discount
  if (data.discount > 0) {
    doc.setTextColor(...accentGreen);
    doc.text('Discount', labelX, y, { align: 'right' });
    doc.text(`-${toRupee(data.discount)}`, valueX, y, { align: 'right' });
    doc.setTextColor(...darkGray);
    y += 4;
  }

  // ─── Grand Total ────────────────────────────
  doc.setDrawColor(...black);
  doc.setLineWidth(0.4);
  doc.line(rightCol - 55, y, rightCol, y);
  y += 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...black);
  doc.text('TOTAL', labelX, y, { align: 'right' });
  // Rupee symbol as "Rs." since jsPDF can't render ₹ reliably
  doc.text(`Rs. ${toRupee(data.total)}`, valueX, y, { align: 'right' });
  y += 1;
  doc.setLineWidth(0.4);
  doc.line(rightCol - 55, y, rightCol, y);
  y += 5;

  // Amount in words
  const totalInRupees = data.total / 100;
  const amountWords = numberToWords(totalInRupees);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...gray);
  const wordLines = doc.splitTextToSize(`Amount in words: ${amountWords}`, contentWidth);
  wordLines.forEach((line: string) => {
    doc.text(line, margin, y);
    y += 3;
  });
  y += 2;

  // ─── SAC Code & Terms ───────────────────────
  doc.setDrawColor(...lightGray);
  doc.setLineWidth(0.2);
  drawDashedLine(doc, margin, rightCol, y);
  y += 4;

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...gray);

  if (data.restaurantGstin) {
    doc.text('SAC Code: 9963 (Restaurant Services)', margin, y);
    y += 3;
  }

  doc.text('Terms: Goods once sold will not be taken back or exchanged.', margin, y);
  y += 3;
  doc.text('This is a computer-generated invoice and does not require a physical signature.', margin, y);
  y += 6;

  // ─── Footer ─────────────────────────────────
  doc.setDrawColor(...lightGray);
  drawDashedLine(doc, margin, rightCol, y);
  y += 4;

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkGray);
  doc.text('Thank you for your order!', pageWidth / 2, y, { align: 'center' });
  y += 4;

  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...gray);
  doc.text('Powered by AssistMint', pageWidth / 2, y, { align: 'center' });
  y += 3;
  doc.text(`Invoice Ref: ${data.orderId.substring(0, 8).toUpperCase()}`, pageWidth / 2, y, { align: 'center' });

  // Convert to Buffer
  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}

export type { InvoiceData, InvoiceItem };
