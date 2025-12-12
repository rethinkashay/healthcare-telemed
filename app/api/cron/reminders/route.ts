import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { sendEmail, getReminderTemplate } from '@/utils/email';
// We use the SERVICE_ROLE key because we need to read EVERYONE'S appointments
// to send reminders. This key bypasses RLS.
// WARNING: Never use this key in the frontend!
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

export async function GET(request: Request) {
  // 1. Security Check (Simple Bearer Token)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in1h = new Date(now.getTime() + 60 * 60 * 1000);

  // Buffer window (e.g. check slots +/- 10 mins)
  const buffer = 15 * 60 * 1000; 

  // 2. Find 24h Reminders
  const { data: reminders24 } = await supabaseAdmin
    .from('appointments')
    .select('*, patient:profiles!patient_id(email, full_name)')
    .eq('status', 'confirmed')
    .eq('reminder_24h_sent', false)
    .gte('start_time', new Date(in24h.getTime() - buffer).toISOString())
    .lte('start_time', new Date(in24h.getTime() + buffer).toISOString());

  // 3. Find 1h Reminders
  const { data: reminders1 } = await supabaseAdmin
    .from('appointments')
    .select('*, patient:profiles!patient_id(email, full_name)')
    .eq('status', 'confirmed')
    .eq('reminder_1h_sent', false)
    .gte('start_time', new Date(in1h.getTime() - buffer).toISOString())
    .lte('start_time', new Date(in1h.getTime() + buffer).toISOString());

  // 4. Process (Real Email Sending)
  const updates = [];
  const dashboardUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('.supabase.co', '.vercel.app') || 'http://localhost:3000'}/patient/dashboard`;

  if (reminders24) {
    for (const appt of reminders24) {
      const html = getReminderTemplate(appt.patient.full_name || 'Patient', appt.start_time, dashboardUrl);
      // Send Email
      await sendEmail({ to: appt.patient.email, subject: "Appointment Reminder (24h)", html });
      // Mark as sent in DB
      updates.push(supabaseAdmin.from('appointments').update({ reminder_24h_sent: true }).eq('id', appt.id));
    }
  }

  if (reminders1) {
    for (const appt of reminders1) {
      const html = getReminderTemplate(appt.patient.full_name || 'Patient', appt.start_time, dashboardUrl);
      // Send Email
      await sendEmail({ to: appt.patient.email, subject: "Appointment Reminder (1h)", html });
      // Mark as sent in DB
      updates.push(supabaseAdmin.from('appointments').update({ reminder_1h_sent: true }).eq('id', appt.id));
    }
  }
  await Promise.all(updates);

  return NextResponse.json({ 
    success: true, 
    sent_24h: reminders24?.length || 0,
    sent_1h: reminders1?.length || 0 
  });
}
