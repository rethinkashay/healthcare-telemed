import { NextResponse } from 'next/server';
import { sendEmail, getConfirmationTemplate } from '@/utils/email';

export async function POST(request: Request) {
  const { to, patientName, doctorName, time } = await request.json();

  if (!to || !patientName || !time) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Generate HTML
  const html = getConfirmationTemplate(
    patientName, 
    doctorName, 
    time, 
    `${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('.supabase.co', '.vercel.app') || 'http://localhost:3000'}/patient/dashboard`
  );

  // Send
  const result = await sendEmail({
    to,
    subject: "Appointment Confirmation - HealthCare Telemed",
    html
  });

  return NextResponse.json(result);
}