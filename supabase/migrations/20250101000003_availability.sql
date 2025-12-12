-- 1. Create the availability table
create table if not exists public.doctor_availability (
  id uuid default gen_random_uuid() primary key,
  doctor_id uuid references auth.users not null,
  day_of_week text not null check (day_of_week in ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
  start_time time without time zone not null,
  end_time time without time zone not null,
  created_at timestamp with time zone default now(),

  -- Basic sanity check: End time must be after start time
  constraint valid_time_range check (end_time > start_time)
);

-- 2. Enable RLS
alter table public.doctor_availability enable row level security;

-- 3. Policies
-- Doctors can manage their own availability
create policy "Doctors can insert own availability" 
  on public.doctor_availability for insert 
  with check ( auth.uid() = doctor_id );

create policy "Doctors can update own availability" 
  on public.doctor_availability for update 
  using ( auth.uid() = doctor_id );

create policy "Doctors can delete own availability" 
  on public.doctor_availability for delete 
  using ( auth.uid() = doctor_id );

-- Everyone (Patients) can view availability to book slots
create policy "Availability is viewable by everyone" 
  on public.doctor_availability for select 
  using ( true );

-- 4. Index for performance
create index if not exists idx_availability_doctor_id on public.doctor_availability(doctor_id);