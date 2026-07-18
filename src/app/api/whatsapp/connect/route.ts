// ============================================
// WhatsApp Connect — Embedded Signup Token Exchange
// Handles the OAuth code exchange + WABA subscription
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

const META_APP_ID = process.env.NEXT_PUBLIC_META_APP_ID || '';
const META_APP_SECRET = process.env.META_APP_SECRET || '';
const GRAPH_API = 'https://graph.facebook.com/v21.0';

// Admin client for DB writes
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

// ─── Get authenticated user ──────────────────
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

// ─── POST: Exchange code for token + subscribe WABA ──
export async function POST(req: NextRequest) {
  try {
    // 1. Verify authenticated user
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { code, waba_id, phone_number_id } = body;

    // Validate required fields
    if (!waba_id || !phone_number_id) {
      return NextResponse.json(
        { error: 'Missing required fields: waba_id and phone_number_id are required' },
        { status: 400 }
      );
    }

    // 2. Get user's restaurant
    const { data: restaurant } = await supabaseAdmin
      .from('restaurants')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    if (!restaurant) {
      return NextResponse.json({ error: 'No restaurant found for this user' }, { status: 404 });
    }

    let accessToken = '';

    // 3. Exchange code for long-lived access token (if code provided)
    if (code) {
      try {
        const tokenUrl = new URL(`${GRAPH_API}/oauth/access_token`);
        tokenUrl.searchParams.set('client_id', META_APP_ID);
        tokenUrl.searchParams.set('client_secret', META_APP_SECRET);
        tokenUrl.searchParams.set('code', code);

        const tokenResp = await fetch(tokenUrl.toString(), { method: 'GET' });
        const tokenData = await tokenResp.json();

        if (tokenData.error) {
          console.error('[WhatsApp Connect] Token exchange failed:', tokenData.error);
          return NextResponse.json(
            { error: `Token exchange failed: ${tokenData.error.message || 'Unknown error'}` },
            { status: 400 }
          );
        }

        accessToken = tokenData.access_token;
      } catch (err) {
        console.error('[WhatsApp Connect] Token exchange error:', err);
        return NextResponse.json({ error: 'Failed to exchange code for token' }, { status: 500 });
      }
    } else if (body.access_token) {
      // Direct token provided (manual entry fallback)
      accessToken = body.access_token;
    } else {
      return NextResponse.json(
        { error: 'Either code or access_token is required' },
        { status: 400 }
      );
    }

    // 4. Subscribe app to WABA (critical — without this, webhooks don't route)
    try {
      const subResp = await fetch(`${GRAPH_API}/${waba_id}/subscribed_apps`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const subData = await subResp.json();

      if (subData.error) {
        console.error('[WhatsApp Connect] WABA subscription failed:', subData.error);
        // Non-fatal — continue saving credentials, subscription can be retried
      } else {
        console.log(`[WhatsApp Connect] App subscribed to WABA ${waba_id}`);
      }
    } catch (err) {
      console.error('[WhatsApp Connect] WABA subscription error:', err);
    }

    // 5. Register phone number for Cloud API
    try {
      const regResp = await fetch(`${GRAPH_API}/${phone_number_id}/register`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messaging_product: 'whatsapp', pin: '000000' }),
      });
      const regData = await regResp.json();

      if (regData.error && regData.error.code !== 133005) {
        // 133005 = PIN mismatch (already registered) — not a real error
        console.error('[WhatsApp Connect] Phone registration failed:', regData.error);
      }
    } catch (err) {
      console.error('[WhatsApp Connect] Phone registration error:', err);
    }

    // 6. Save credentials to restaurant record
    const { error: dbError } = await supabaseAdmin
      .from('restaurants')
      .update({
        whatsapp_phone_id: phone_number_id,
        whatsapp_waba_id: waba_id,
        whatsapp_access_token: accessToken,
        updated_at: new Date().toISOString(),
      })
      .eq('id', restaurant.id);

    if (dbError) {
      console.error('[WhatsApp Connect] DB update failed:', dbError);
      return NextResponse.json({ error: 'Failed to save credentials' }, { status: 500 });
    }

    // 7. Log activity (fire-and-forget)
    void (async () => {
      try {
        await supabaseAdmin.from('activity_log').insert({
          restaurant_id: restaurant.id,
          actor_type: 'owner',
          actor_id: user.id,
          action: 'whatsapp.connected',
          details: { phone_number_id, waba_id },
        });
      } catch { /* non-critical */ }
    })();

    console.log(`[WhatsApp Connect] Restaurant ${restaurant.id} connected to WABA ${waba_id}`);

    return NextResponse.json({
      success: true,
      phone_number_id,
      waba_id,
    });

  } catch (error) {
    console.error('[WhatsApp Connect] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
