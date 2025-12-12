import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function runSecurityAudit() {
  console.log("🕵️‍♂️ Starting Security Audit...");

  // 1. Log in as a "Stranger" (Not the doctor, not the patient)
  // We will use a random new account for this test.
  const strangerEmail = `hacker-${Date.now()}@test.com`;
  const strangerPass = "password123";

  const { data: { user }, error: signUpError } = await supabase.auth.signUp({
    email: strangerEmail,
    password: strangerPass
  });

  if (signUpError) {
    console.error("❌ Setup failed: Could not create test user.", signUpError.message);
    return;
  }
  
  if (!user) {
    console.error("❌ Setup failed: User is null.");
    return;
  }

  console.log(`🔹 Logged in as Stranger: ${strangerEmail} (ID: ${user.id})`);

  // 2. Attempt to read ALL Medical Records
  // (In a secure system, this should return 0 rows because of RLS)
  console.log("🔹 Attempting to steal medical records...");
  
  const { data, error } = await supabase
    .from('medical_records')
    .select('*');

  if (error) {
    console.log("⚠️ Database Error (This is usually good for security):", error.message);
  } else {
    console.log(`🔹 Query finished. Rows returned: ${data.length}`);
    
    if (data.length === 0) {
      console.log("✅ PASSED: The stranger found 0 records. RLS is working.");
    } else {
      console.error("❌ FAILED: The stranger read sensitive records!");
      console.table(data); // Show what was leaked
    }
  }

  // 3. Cleanup (Delete the test user to avoid clutter - strictly requires Service Key, 
  // but we can just leave them or delete manually for this simple test)
  console.log("🏁 Audit Complete.");
}

runSecurityAudit();