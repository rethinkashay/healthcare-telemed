-- Enable necessary extensions
create extension if not exists "btree_gist"; 

-- 1. PROFILES
create table if not exists public.profiles (
  id uuid not null references auth.users on delete cascade,
  email text not null,
  full_name text,
  role text check (role in ('doctor', 'patient')),
  specialization text,
  consultation_price integer,
  bio text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (id)
);

alter table public.profiles enable row level security;

-- Policies for Profiles (Re-declaring them ensures they exist in our backup)
drop policy if exists "Public profiles are viewable by everyone." on public.profiles;
create policy "Public profiles are viewable by everyone." on public.profiles for select using ( true );

drop policy if exists "Users can update own profile." on public.profiles;
create policy "Users can update own profile." on public.profiles for update using ( auth.uid() = id );

-- 2. APPOINTMENTS
create table if not exists public.appointments (
  id uuid default gen_random_uuid() primary key,
  patient_id uuid references auth.users not null,
  doctor_id uuid references auth.users not null,
  start_time timestamp with time zone not null,
  status text check (status in ('pending', 'confirmed', 'cancelled', 'completed')) default 'pending',
  created_at timestamp with time zone default now()
);

alter table public.appointments enable row level security;

-- Policies for Appointments
drop policy if exists "Patients can insert their own appointments" on public.appointments;
create policy "Patients can insert their own appointments" on public.appointments for insert with check ( auth.uid() = patient_id );

drop policy if exists "Users can view their own appointments" on public.appointments;
create policy "Users can view their own appointments" on public.appointments for select using ( auth.uid() = patient_id or auth.uid() = doctor_id );

drop policy if exists "Doctors can update their own appointments" on public.appointments;
create policy "Doctors can update their own appointments" on public.appointments for update using ( auth.uid() = doctor_id );

drop policy if exists "Patients can update their own appointments" on public.appointments;
create policy "Patients can update their own appointments" on public.appointments for update using ( auth.uid() = patient_id );

-- 3. TRIGGERS
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, role, full_name)
  values (
    new.id, 
    new.email, 
    coalesce(new.raw_user_meta_data->>'role', 'patient'),
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$;