// ============================================
// WhatsApp Business Profile — Read & Update via Meta API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

const GRAPH_API = 'https://graph.facebook.com/v21.0';

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

// ─── GET: Fetch current WhatsApp Business Profile ──
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const restaurant = await getRestaurantCreds(user.id);
    if (!restaurant?.whatsapp_phone_id || !restaurant?.whatsapp_access_token) {
      return NextResponse.json({ error: 'WhatsApp not connected' }, { status: 400 });
    }

    const resp = await fetch(
      `${GRAPH_API}/${restaurant.whatsapp_phone_id}/whatsapp_business_profile?fields=about,address,description,email,profile_picture_url,vertical,websites`,
      { headers: { Authorization: `Bearer ${restaurant.whatsapp_access_token}` } }
    );
    const data = await resp.json();

    if (data.error) {
      return NextResponse.json({ error: data.error.message }, { status: 400 });
    }

    // Meta returns { data: [{ about, address, ... }] }
    const profile = data.data?.[0] || {};
    return NextResponse.json({ profile });

  } catch (error) {
    console.error('[WhatsApp Profile] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

// ─── POST: Update WhatsApp Business Profile ──
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const restaurant = await getRestaurantCreds(user.id);
    if (!restaurant?.whatsapp_phone_id || !restaurant?.whatsapp_access_token) {
      return NextResponse.json({ error: 'WhatsApp not connected' }, { status: 400 });
    }

    const body = await req.json();

    // Build profile update payload — only include fields that are provided
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profileData: Record<string, any> = { messaging_product: 'whatsapp' };

    const allowedFields = ['about', 'address', 'description', 'email', 'vertical', 'websites'];
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        profileData[field] = body[field];
      }
    }

    const resp = await fetch(
      `${GRAPH_API}/${restaurant.whatsapp_phone_id}/whatsapp_business_profile`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${restaurant.whatsapp_access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      }
    );

    const data = await resp.json();
    if (data.error) {
      return NextResponse.json({ error: data.error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[WhatsApp Profile] POST error:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
