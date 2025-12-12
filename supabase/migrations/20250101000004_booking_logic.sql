-- Create a function to handle booking safely
create or replace function public.book_appointment(
  p_patient_id uuid,
  p_doctor_id uuid,
  p_start_time timestamptz
) returns uuid
language plpgsql
security definer -- Runs with admin privileges to ensure checks pass
as $$
declare
  v_day_of_week text;
  v_slot_time time;
  v_appt_id uuid;
begin
  -- 1. Extract Day and Time from the requested slot (UTC)
  -- Note: We use 'FMDay' to remove padding spaces (e.g., 'Monday' instead of 'Monday   ')
  v_day_of_week := trim(to_char(p_start_time, 'FMDay')); 
  v_slot_time := p_start_time::time;

  -- 2. Check if Doctor is actually available on this day/time
  if not exists (
    select 1 from public.doctor_availability
    where doctor_id = p_doctor_id
    and day_of_week = v_day_of_week
    and start_time <= v_slot_time
    and end_time > v_slot_time -- Slot must start before the shift ends
  ) then
    raise exception 'Doctor is not available at this time (Day: %, Time: %)', v_day_of_week, v_slot_time;
  end if;

  -- 3. Insert the appointment
  -- (The Exclusion Constraint from Step 1 will still catch double-bookings here!)
  insert into public.appointments (patient_id, doctor_id, start_time, status)
  values (p_patient_id, p_doctor_id, p_start_time, 'pending')
  returning id into v_appt_id;

  return v_appt_id;
end;
$$;