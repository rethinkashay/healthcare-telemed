import { NextResponse } from 'next/server';
import { sendEmail, getReminderTemplate } from '@/utils/email';
// Remove top-level import and instantiation – we'll lazy-load below

export async function GET(request: Request) {
  // 1. Lazy-load Supabase client (only at runtime, after env vars are available)
  let supabaseAdmin;
  try {
    const { createClient } = await import('@supabase/supabase-js');
    supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
    );

    // Guard: Fail fast if keys are missing (shouldn't happen with Vercel envs set)
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Supabase env vars missing');
      return NextResponse.json({ error: 'Configuration error' }, { status: 500 });
    }
  } catch (error) {
    console.error('Supabase client init failed:', error);
    return NextResponse.json({ error: 'Supabase unavailable' }, { status: 500 });
  }

  // 2. Security Check (Simple Bearer Token)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in1h = new Date(now.getTime() + 60 * 60 * 1000);

  // Buffer window (e.g. check slots +/- 10 mins)
  const buffer = 15 * 60 * 1000; 

  // 3. Find 24h Reminders
  let reminders24;
  try {
    const { data } = await supabaseAdmin
      .from('appointments')
      .select('*, patient:profiles!patient_id(email, full_name)')
      .eq('status', 'confirmed')
      .eq('reminder_24h_sent', false)
      .gte('start_time', new Date(in24h.getTime() - buffer).toISOString())
      .lte('start_time', new Date(in24h.getTime() + buffer).toISOString());

    reminders24 = data;
  } catch (error) {
    console.error('24h reminders query failed:', error);
    return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
  }

  // 4. Find 1h Reminders
  let reminders1;
  try {
    const { data } = await supabaseAdmin
      .from('appointments')
      .select('*, patient:profiles!patient_id(email, full_name)')
      .eq('status', 'confirmed')
      .eq('reminder_1h_sent', false)
      .gte('start_time', new Date(in1h.getTime() - buffer).toISOString())
      .lte('start_time', new Date(in1h.getTime() + buffer).toISOString());

    reminders1 = data;
  } catch (error) {
    console.error('1h reminders query failed:', error);
    return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
  }

  // 5. Process (Real Email Sending)
  const updates = [];
  const dashboardUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('.supabase.co', '.vercel.app') || 'http://localhost:3000'}/patient/dashboard`;

  try {
    if (reminders24?.length) {
      for (const appt of reminders24) {
        const html = getReminderTemplate(appt.patient.full_name || 'Patient', appt.start_time, dashboardUrl);
        // Send Email
        await sendEmail({ to: appt.patient.email, subject: "Appointment Reminder (24h)", html });
        // Mark as sent in DB
        updates.push(supabaseAdmin.from('appointments').update({ reminder_24h_sent: true }).eq('id', appt.id));
      }
    }

    if (reminders1?.length) {
      for (const appt of reminders1) {
        const html = getReminderTemplate(appt.patient.full_name || 'Patient', appt.start_time, dashboardUrl);
        // Send Email
        await sendEmail({ to: appt.patient.email, subject: "Appointment Reminder (1h)", html });
        // Mark as sent in DB
        updates.push(supabaseAdmin.from('appointments').update({ reminder_1h_sent: true }).eq('id', appt.id));
      }
    }

    await Promise.all(updates);
  } catch (error) {
    console.error('Email/update processing failed:', error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }

  return NextResponse.json({ 
    success: true, 
    sent_24h: reminders24?.length || 0,
    sent_1h: reminders1?.length || 0 
  });
}