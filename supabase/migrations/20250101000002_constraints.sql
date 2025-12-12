-- 1. Enable the extension required for range queries
create extension if not exists "btree_gist";

-- 2. Create a helper function to make time addition "Immutable"
-- This tells Postgres: "Adding 1 hour to a timestamp will ALWAYS result in the same time."
create or replace function public.add_one_hour(ts timestamptz) 
returns timestamptz 
language sql 
immutable 
as $$
  select ts + interval '1 hour';
$$;

-- 3. Add the EXCLUSION constraint using our new helper function
alter table public.appointments
add constraint no_double_booking
exclude using gist (
  doctor_id with =,
  tstzrange(start_time, public.add_one_hour(start_time)) with &&
)
where (status != 'cancelled');

-- 4. Add Indexes for faster dashboard loading
create index if not exists idx_appointments_doctor_id on public.appointments(doctor_id);
create index if not exists idx_appointments_patient_id on public.appointments(patient_id);
create index if not exists idx_profiles_role on public.profiles(role);