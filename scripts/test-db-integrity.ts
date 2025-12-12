import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function testDoubleBooking() {
  console.log("🧪 Starting Double Booking Integrity Test...");

  // 1. Sign in to get a valid user ID to act as the "Patient"
  const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
    email: "patienttest@gmail.com", 
    password: "ashay90" // <--- Update if your password is different
  });

  if (!user || authError) {
    console.error("❌ Auth failed. Please check email/password in script.");
    console.error(authError);
    return;
  }

  // 2. We will try to book a slot with OURSELVES as the doctor just for testing 
  // (or any valid UUID if you have one, but using self is easiest for a constraint test)
  const doctorId = user.id; 
  
  // Set a specific time for tomorrow
  const testTime = new Date();
  testTime.setHours(testTime.getHours() + 24);
  const isoTime = testTime.toISOString();

  console.log(`🔹 Attempting Booking 1 at ${isoTime}...`);
  const { error: error1 } = await supabase
    .from('appointments')
    .insert({
      patient_id: user.id,
      doctor_id: doctorId,
      start_time: isoTime,
      status: 'confirmed'
    });

  if (error1) {
    console.log("ℹ️ Booking 1 failed (might already exist):", error1.message);
  } else {
    console.log("✅ Booking 1 succeeded.");
  }

  console.log(`🔹 Attempting Booking 2 (The Double Book) at ${isoTime}...`);
  const { error: error2 } = await supabase
    .from('appointments')
    .insert({
      patient_id: user.id,
      doctor_id: doctorId,
      start_time: isoTime, // EXACT SAME TIME
      status: 'pending'
    });

  if (error2 && error2.message.includes('conflicting key value')) {
    console.log("✅ SUCCESS: Database blocked the double booking!");
    console.log("   Error message received:", error2.message);
  } else if (error2) {
    console.log("⚠️ Failed with unexpected error:", error2.message);
  } else {
    console.error("❌ FAILURE: Database ALLOWED a double booking. Constraint missing.");
  }

  // Cleanup
  console.log("🧹 Cleaning up...");
  await supabase.from('appointments').delete().eq('start_time', isoTime);
}

testDoubleBooking();