// ============================================
// WhatsApp Profile Picture Upload — Resumable Upload + Profile Update
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

// ─── POST: Upload profile picture via Resumable Upload API ──
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const restaurant = await getRestaurantCreds(user.id);
    if (!restaurant?.whatsapp_phone_id || !restaurant?.whatsapp_access_token) {
      return NextResponse.json({ error: 'WhatsApp not connected' }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      return NextResponse.json({ error: 'Only JPEG and PNG images are supported' }, { status: 400 });
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image must be under 5MB' }, { status: 400 });
    }

    const accessToken = restaurant.whatsapp_access_token;
    const appId = process.env.NEXT_PUBLIC_META_APP_ID;

    // Step 1: Create upload session via Resumable Upload API
    const sessionResp = await fetch(
      `${GRAPH_API}/${appId}/uploads?file_length=${file.size}&file_type=${file.type}&access_token=${accessToken}`,
      { method: 'POST' }
    );
    const sessionData = await sessionResp.json();

    if (sessionData.error) {
      console.error('[PFP Upload] Session create error:', sessionData.error);
      return NextResponse.json({ error: sessionData.error.message || 'Failed to create upload session' }, { status: 400 });
    }

    const uploadSessionId = sessionData.id;

    // Step 2: Upload the file binary data
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const uploadResp = await fetch(
      `${GRAPH_API}/${uploadSessionId}`,
      {
        method: 'POST',
        headers: {
          Authorization: `OAuth ${accessToken}`,
          'file_offset': '0',
          'Content-Type': file.type,
        },
        body: fileBuffer,
      }
    );
    const uploadData = await uploadResp.json();

    if (uploadData.error) {
      console.error('[PFP Upload] Upload error:', uploadData.error);
      return NextResponse.json({ error: uploadData.error.message || 'Failed to upload file' }, { status: 400 });
    }

    const fileHandle = uploadData.h;

    if (!fileHandle) {
      console.error('[PFP Upload] No file handle returned:', uploadData);
      return NextResponse.json({ error: 'Upload succeeded but no handle returned' }, { status: 500 });
    }

    // Step 3: Update WhatsApp Business Profile with the handle
    const profileResp = await fetch(
      `${GRAPH_API}/${restaurant.whatsapp_phone_id}/whatsapp_business_profile`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          profile_picture_handle: fileHandle,
        }),
      }
    );

    const profileData = await profileResp.json();

    if (profileData.error) {
      console.error('[PFP Upload] Profile update error:', profileData.error);
      return NextResponse.json({ error: profileData.error.message || 'Failed to update profile picture' }, { status: 400 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[PFP Upload] Error:', error);
    return NextResponse.json({ error: 'Failed to upload profile picture' }, { status: 500 });
  }
}
