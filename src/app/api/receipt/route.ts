// ============================================
// AssistMint — Receipt PDF API Route
// Generates and returns order receipt as PDF
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateInvoicePDF, type InvoiceData, type InvoiceItem } from '@/lib/services/invoice-generator';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get('orderId');
  if (!orderId) {
    return NextResponse.json({ error: 'orderId required' }, { status: 400 });
  }

  // Fetch order
  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select('*, restaurants(name, phone)')
    .eq('id', orderId)
    .single();

  if (error || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const o = order as Record<string, unknown>;
  const restaurant = o.restaurants as Record<string, unknown> | null;

  const invoiceData: InvoiceData = {
    orderId: o.id as string,
    orderNumber: (o.order_number as string) || (o.id as string).substring(0, 8).toUpperCase(),
    restaurantName: (restaurant?.name as string) || 'Restaurant',
    restaurantPhone: (restaurant?.phone as string) || undefined,
    customerName: (o.customer_name as string) || 'Guest',
    customerPhone: (o.customer_phone as string) || '',
    deliveryAddress: (o.delivery_address as Record<string, string>)?.raw || undefined,
    deliveryType: (o.delivery_type as 'delivery' | 'pickup' | 'dine_in') || 'delivery',
    items: ((o.items as InvoiceItem[]) || []).map(item => ({
      item_name: item.item_name,
      variant_name: item.variant_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      special_instructions: item.special_instructions,
    })),
    subtotal: (o.subtotal as number) || 0,
    tax: (o.tax as number) || 0,
    deliveryFee: (o.delivery_fee as number) || 0,
    discount: (o.discount as number) || 0,
    total: (o.total as number) || 0,
    paymentMethod: (o.payment_method as string) || 'cod',
    createdAt: (o.created_at as string) || new Date().toISOString(),
  };

  const pdfBuffer = generateInvoicePDF(invoiceData);
  const fileName = `receipt-${invoiceData.orderNumber}.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'private, max-age=3600',
    },
  });
}
