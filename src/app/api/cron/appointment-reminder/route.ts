// ============================================
// AssistMint — Appointment Reminder Cron
// Sends WhatsApp reminders 1 hour before appointments
// ============================================

import { NextResponse } from 'next/server';
import { getUpcomingReminders, markReminderSent } from '@/lib/services/appointment-service';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 45;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

export async function GET(req: Request) {
  // Verify CRON_SECRET
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const appointments = await getUpcomingReminders();

    let sent = 0;
    let failed = 0;

    for (const appt of appointments) {
      try {
        // Get restaurant's WhatsApp config
        const { data: restaurant } = await supabaseAdmin
          .from('restaurants')
          .select('whatsapp_phone_id, whatsapp_token, name')
          .eq('id', appt.restaurant_id)
          .single();

        if (!restaurant) continue;
        const r = restaurant as Record<string, unknown>;
        const phoneId = r.whatsapp_phone_id as string;
        const token = r.whatsapp_token as string;
        const bizName = r.name as string;

        if (!phoneId || !token || !appt.customer_phone) continue;

        // Format time for display
        const [h, m] = appt.start_time.split(':').map(Number);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
        const timeStr = `${h12}:${String(m).padStart(2, '0')} ${ampm}`;

        // Send WhatsApp reminder
        const message = `🔔 *Appointment Reminder*\n\n`
          + `Hi${appt.customer_name ? ` ${appt.customer_name}` : ''}! `
          + `Your appointment at *${bizName}* is coming up:\n\n`
          + `📋 ${appt.service_name}\n`
          + `⏰ Today at ${timeStr}\n`
          + (appt.staff_name ? `🧑‍💼 ${appt.staff_name}\n` : '')
          + `\nSee you soon! 😊`;

        const response = await fetch(
          `https://graph.facebook.com/v21.0/${phoneId}/messages`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: appt.customer_phone.replace(/\D/g, ''),
              type: 'text',
              text: { body: message },
            }),
          }
        );

        if (response.ok) {
          await markReminderSent(appt.id);
          sent++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    return NextResponse.json({
      success: true,
      total: appointments.length,
      sent,
      failed,
    });
  } catch (error) {
    console.error('[Cron] Appointment reminder error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal error',
    }, { status: 200 }); // Return 200 to prevent cron retry storms
  }
}
