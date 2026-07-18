// ============================================
// WhatsApp Disconnect — Clear WhatsApp credentials
// ============================================

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

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

export async function POST() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's restaurant
    const { data: restaurant } = await supabaseAdmin
      .from('restaurants')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    if (!restaurant) {
      return NextResponse.json({ error: 'No restaurant found' }, { status: 404 });
    }

    // Clear WhatsApp credentials
    const { error: dbError } = await supabaseAdmin
      .from('restaurants')
      .update({
        whatsapp_phone_id: null,
        whatsapp_waba_id: null,
        whatsapp_access_token: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', restaurant.id);

    if (dbError) {
      return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 });
    }

    // Log activity (fire-and-forget)
    void (async () => {
      try {
        await supabaseAdmin.from('activity_log').insert({
          restaurant_id: restaurant.id,
          actor_type: 'owner',
          actor_id: user.id,
          action: 'whatsapp.disconnected',
          details: {},
        });
      } catch { /* non-critical */ }
    })();

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[WhatsApp Disconnect] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
