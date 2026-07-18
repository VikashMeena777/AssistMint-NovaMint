// ============================================
// WhatsApp Ice Breakers — Manage via Meta API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

const GRAPH_API = 'https://graph.facebook.com/v25.0';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

async function getAuthUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

async function getRestaurantCreds(userId: string) {
  const { data } = await supabaseAdmin
    .from('restaurants')
    .select('id, whatsapp_phone_id, whatsapp_access_token')
    .eq('owner_id', userId)
    .single();
  return data;
}

// ─── GET: Fetch current ice breakers ──
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const restaurant = await getRestaurantCreds(user.id);
    if (!restaurant?.whatsapp_phone_id || !restaurant?.whatsapp_access_token) {
      return NextResponse.json({ error: 'WhatsApp not connected' }, { status: 400 });
    }

    const resp = await fetch(
      `${GRAPH_API}/${restaurant.whatsapp_phone_id}/whatsapp_business_profile?fields=ice_breakers`,
      { headers: { Authorization: `Bearer ${restaurant.whatsapp_access_token}` } }
    );
    const data = await resp.json();

    if (data.error) {
      return NextResponse.json({ error: data.error.message }, { status: 400 });
    }

    const profile = data.data?.[0] || {};
    return NextResponse.json({ ice_breakers: profile.ice_breakers || [] });

  } catch (error) {
    console.error('[Ice Breakers] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch ice breakers' }, { status: 500 });
  }
}

// ─── POST: Update ice breakers (max 4) ──
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const restaurant = await getRestaurantCreds(user.id);
    if (!restaurant?.whatsapp_phone_id || !restaurant?.whatsapp_access_token) {
      return NextResponse.json({ error: 'WhatsApp not connected' }, { status: 400 });
    }

    const body = await req.json();
    const { ice_breakers } = body;

    // Validate: max 4 ice breakers
    if (!Array.isArray(ice_breakers) || ice_breakers.length > 4) {
      return NextResponse.json(
        { error: 'Ice breakers must be an array with max 4 items' },
        { status: 400 }
      );
    }

    // Each ice breaker needs a "question" field
    const formatted = ice_breakers.map((ib: { question: string }) => ({
      question: String(ib.question || '').slice(0, 80), // Max 80 chars
    })).filter((ib: { question: string }) => ib.question.length > 0);

    const resp = await fetch(
      `${GRAPH_API}/${restaurant.whatsapp_phone_id}/whatsapp_business_profile`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${restaurant.whatsapp_access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          ice_breakers: formatted,
        }),
      }
    );

    const data = await resp.json();
    if (data.error) {
      return NextResponse.json({ error: data.error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, count: formatted.length });

  } catch (error) {
    console.error('[Ice Breakers] POST error:', error);
    return NextResponse.json({ error: 'Failed to update ice breakers' }, { status: 500 });
  }
}
