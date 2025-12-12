import { Resend } from 'resend';

// Initialize Resend with API Key (if present)
const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY) 
  : null;

// Helper to send emails (Falls back to console if no key)
export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  if (!resend) {
    console.log(`\n📧 [MOCK EMAIL] To: ${to} | Subject: ${subject}\n${html}\n`);
    return { success: true, type: 'mock' };
  }

  try {
    const data = await resend.emails.send({
      from: 'HealthCare Telemed <onboarding@resend.dev>', // Default testing sender
      to,
      subject,
      html,
    });
    return { success: true, data };
  } catch (error) {
    console.error("Email Error:", error);
    return { success: false, error };
  }
}

// TEMPLATE: Appointment Confirmation
export function getConfirmationTemplate(patientName: string, doctorName: string, time: string, link: string) {
  return `
    <div style="font-family: sans-serif; padding: 20px; color: #333;">
      <h1 style="color: #2563eb;">Appointment Confirmed</h1>
      <p>Hello <strong>${patientName}</strong>,</p>
      <p>Your appointment with <strong>Dr. ${doctorName}</strong> has been booked.</p>
      <p style="font-size: 18px; font-weight: bold;">📅 ${new Date(time).toLocaleString()}</p>
      <p>Please wait for the doctor to accept your request.</p>
      <br />
      <a href="${link}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Dashboard</a>
    </div>
  `;
}

// TEMPLATE: Reminder
export function getReminderTemplate(patientName: string, time: string, link: string) {
  return `
    <div style="font-family: sans-serif; padding: 20px; color: #333;">
      <h1 style="color: #d97706;">Appointment Reminder</h1>
      <p>Hello <strong>${patientName}</strong>,</p>
      <p>This is a reminder for your appointment coming up soon.</p>
      <p style="font-size: 18px; font-weight: bold;">📅 ${new Date(time).toLocaleString()}</p>
      <br />
      <a href="${link}" style="background-color: #d97706; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Join Video Call</a>
    </div>
  `;
}