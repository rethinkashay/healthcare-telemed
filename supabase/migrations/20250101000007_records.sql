-- 1. MEDICAL RECORDS (Text Notes)
create table if not exists public.medical_records (
  id uuid default gen_random_uuid() primary key,
  appointment_id uuid references public.appointments not null,
  doctor_id uuid references auth.users not null,
  patient_id uuid references auth.users not null,
  diagnosis text,
  prescription_text text,
  created_at timestamp with time zone default now()
);

alter table public.medical_records enable row level security;

-- Policies for Records
create policy "Doctors can insert records for their appointments" 
  on public.medical_records for insert 
  with check ( auth.uid() = doctor_id );

create policy "Users can view their own records" 
  on public.medical_records for select 
  using ( auth.uid() = doctor_id or auth.uid() = patient_id );

-- 2. STORAGE BUCKET (Files)
-- Note: Buckets are usually created via UI or API, but we can try SQL extension or do it manually.
-- For this step, we will rely on YOU creating the bucket in the Dashboard (Part B).
-- We just need the policy to allow uploads.

-- (We will handle Storage Policies in the Supabase Dashboard for simplicity, 
--  as SQL management of Storage can be tricky without the 'storage' schema enabled).