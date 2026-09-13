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
const GRAPH_API = 'https://graph.facebook.com/v25.0';

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

    // 5. Register phone number for Cloud API — ONLY on first connect of this
    //    number. Re-registering an already-registered number can re-trigger
    //    Meta's display-name review (error 131037 blocks sending until
    //    approved), so a reconnect of the SAME phone_number_id must skip this.
    const { data: existingPhone } = await supabaseAdmin
      .from('restaurants')
      .select('whatsapp_phone_id')
      .eq('id', restaurant.id)
      .single();
    const sameNumberReconnect =
      (existingPhone as Record<string, string> | null)?.whatsapp_phone_id === phone_number_id;

    if (!sameNumberReconnect) {
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
    } else {
      console.log('[WhatsApp Connect] Same number reconnect — skipping re-register (protects display-name approval)');
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

    // 6.5 Auto-fill the WhatsApp business profile from the restaurant record
    // (onboarding polish — the number looks professional from day one).
    // Fire-and-forget: never blocks or fails the connect.
    void (async () => {
      try {
        const { data: profile } = await supabaseAdmin
          .from('restaurants')
          .select('name, address, description, business_type, slug, cuisine_type')
          .eq('id', restaurant.id)
          .single();
        if (!profile) return;
        const p = profile as Record<string, string | null>;

        const VERTICALS: Record<string, string> = {
          food_beverage: 'Restaurant',
          salon_spa: 'Beauty',
          healthcare: 'Health',
          education: 'Education',
          retail: 'Retail',
          services: 'Services',
        };

        const { updateBusinessProfile } = await import('@/lib/whatsapp/business-profile');
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://assistmint.novamintnetworks.in';
        await updateBusinessProfile({
          phoneNumberId: phone_number_id,
          accessToken,
          about: `AI assistant — replies in seconds, 24×7. Powered by AssistMint`,
          description: p.description || undefined,
          address: p.address || undefined,
          vertical: VERTICALS[p.business_type || 'food_beverage'],
          websites: p.slug ? [`${appUrl}/${p.slug}`] : undefined,
        });
        console.log('[WhatsApp Connect] Business profile auto-filled');
      } catch (err) {
        console.warn('[WhatsApp Connect] Business profile auto-fill skipped:', err);
      }
    })();

    // 6.6 Auto-provision WhatsApp Flows (app-wide keypair, public key
    // registration, "AssistMint Booking" flow create + publish). Same
    // fire-and-forget pattern as the profile autofill — never blocks or
    // fails the connect. The owner never touches keys or Meta dashboards.
    void (async () => {
      try {
        const { ensureFlowsProvisioned } = await import('@/lib/flows/auto-setup');
        const report = await ensureFlowsProvisioned(restaurant.id);
        if (report.errors.length > 0) {
          console.warn('[WhatsApp Connect] Flows auto-provisioning report:', JSON.stringify(report));
        } else {
          console.log('[WhatsApp Connect] Flows auto-provisioning report:', JSON.stringify(report));
        }
      } catch (err) {
        console.warn('[WhatsApp Connect] Flows auto-provisioning skipped:', err);
      }
    })();

    // 6.7 Auto-create the WhatsApp catalog + sync the menu (fire-and-forget —
    // never blocks or fails the connect). Tries the Commerce API
    // (ensureCatalog); when Meta requires manual creation the dashboard's
    // catalog sync card guides the owner through Commerce Manager.
    void (async () => {
      try {
        const { ensureCatalog, upsertCatalogItem, setCommerceSettings } = await import(
          '@/lib/whatsapp/catalog'
        );

        const { data: r } = await supabaseAdmin
          .from('restaurants')
          .select('name, business_config')
          .eq('id', restaurant.id)
          .single();
        const rec = (r ?? {}) as { name?: string | null; business_config?: Record<string, unknown> | null };
        const currentConfig =
          rec.business_config && typeof rec.business_config === 'object' && !Array.isArray(rec.business_config)
            ? rec.business_config
            : {};
        const catalogName = (rec.name || 'Our Business').trim();

        const ensured = await ensureCatalog({
          wabaId: waba_id,
          accessToken,
          name: catalogName,
          phoneNumberId: phone_number_id,
        });
        if (ensured.error) {
          console.warn('[WhatsApp Connect] Catalog auto-creation issue:', ensured.error);
        }
        if (!ensured.catalogId) {
          // Flag it so the dashboard shows the step-by-step guide immediately.
          await supabaseAdmin
            .from('restaurants')
            .update({
              business_config: { ...currentConfig, catalog_setup_needed: true },
              updated_at: new Date().toISOString(),
            })
            .eq('id', restaurant.id);
          console.log('[WhatsApp Connect] Catalog needs manual creation — dashboard will guide the owner');
          return;
        }
        if (ensured.created) {
          console.log(`[WhatsApp Connect] Catalog auto-created: ${ensured.catalogId}`);
        }

        // Sync the active menu into the catalog (prices are stored in paise —
        // exactly what Meta wants for INR).
        const { data: items } = await supabaseAdmin
          .from('menu_items')
          .select('id, name, description, price, image_url')
          .eq('restaurant_id', restaurant.id)
          .eq('is_available', true)
          .order('display_order', { ascending: true });

        let synced = 0;
        let failed = 0;
        for (const raw of (items || []) as unknown[]) {
          const item =
            raw && typeof raw === 'object' && !Array.isArray(raw)
              ? (raw as Record<string, unknown>)
              : {};
          const id = typeof item.id === 'string' ? item.id : '';
          const name = typeof item.name === 'string' ? item.name : '';
          if (!id || !name) continue;
          try {
            await upsertCatalogItem({
              catalogId: ensured.catalogId,
              accessToken,
              item: {
                retailerId: id,
                name,
                description: (typeof item.description === 'string' && item.description) || name,
                price: Math.round(Number(item.price || 0)),
                currency: 'INR',
                imageUrl: typeof item.image_url === 'string' && item.image_url ? item.image_url : undefined,
                availability: 'IN_STOCK',
              },
            });
            synced++;
          } catch {
            failed++;
          }
        }

        // Best-effort: enable the in-chat cart + catalog visibility.
        try {
          await setCommerceSettings({
            phoneNumberId: phone_number_id,
            accessToken,
            cartEnabled: true,
            catalogVisible: true,
          });
        } catch {
          // Not fatal
        }

        // Store catalog id + last sync in business_config (merge, never clobber).
        await supabaseAdmin
          .from('restaurants')
          .update({
            business_config: {
              ...currentConfig,
              catalog_id: ensured.catalogId,
              catalog_setup_needed: false,
              last_catalog_sync_at: new Date().toISOString(),
              last_catalog_sync_summary: { total: synced + failed, synced, failed },
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', restaurant.id);

        console.log(
          `[WhatsApp Connect] Auto-catalog sync done — ${synced} synced, ${failed} failed (catalog ${ensured.catalogId})`
        );
      } catch (err) {
        console.warn('[WhatsApp Connect] Auto-catalog sync skipped:', err);
      }
    })();

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
