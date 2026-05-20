// Quick test endpoint to debug Cashfree payment link creation
// Hit GET /api/test-payment to see exact error from Cashfree
import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.CASHFREE_CLIENT_ID;
  const clientSecret = process.env.CASHFREE_CLIENT_SECRET;
  const apiVersion = process.env.CASHFREE_API_VERSION || '2023-08-01';
  const env = process.env.NEXT_PUBLIC_CASHFREE_ENV;
  const baseUrl = env === 'production'
    ? 'https://api.cashfree.com/pg'
    : 'https://sandbox.cashfree.com/pg';

  const testLinkId = `TEST-${Date.now().toString(36)}`;

  // Test 1: Try /pg/links
  let linksResult = null;
  let linksStatus = 0;
  try {
    const res = await fetch(`${baseUrl}/links`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': apiVersion,
        'x-client-id': clientId || '',
        'x-client-secret': clientSecret || '',
      },
      body: JSON.stringify({
        link_id: testLinkId,
        link_amount: 1.00,
        link_currency: 'INR',
        link_purpose: 'Test payment link',
        customer_details: {
          customer_name: 'Test User',
          customer_phone: '9999999999',
        },
        link_notify: { send_sms: false, send_email: false },
      }),
    });
    linksStatus = res.status;
    linksResult = await res.json();
  } catch (e) {
    linksResult = { error: String(e) };
  }

  // Test 2: Try /pg/orders
  let ordersResult = null;
  let ordersStatus = 0;
  try {
    const res = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': apiVersion,
        'x-client-id': clientId || '',
        'x-client-secret': clientSecret || '',
      },
      body: JSON.stringify({
        order_id: testLinkId + '-ord',
        order_amount: 1.00,
        order_currency: 'INR',
        customer_details: {
          customer_id: 'test_customer',
          customer_name: 'Test User',
          customer_phone: '9999999999',
        },
      }),
    });
    ordersStatus = res.status;
    ordersResult = await res.json();
  } catch (e) {
    ordersResult = { error: String(e) };
  }

  return NextResponse.json({
    config: {
      env,
      apiVersion,
      baseUrl,
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      clientIdPrefix: clientId?.substring(0, 10) + '...',
    },
    linksAPI: {
      status: linksStatus,
      response: linksResult,
      linkUrl: linksResult?.link_url || null,
    },
    ordersAPI: {
      status: ordersStatus,
      response: ordersResult,
      paymentLink: ordersResult?.payment_link || null,
      paymentSessionId: ordersResult?.payment_session_id ? 'present' : 'missing',
    },
  });
}
