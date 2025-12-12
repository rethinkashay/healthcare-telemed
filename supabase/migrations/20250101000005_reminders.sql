alter table public.appointments 
add column reminder_24h_sent boolean default false,
add column reminder_1h_sent boolean default false;