"use client";

import { useEffect, useState, use } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { format, addHours, isBefore, startOfToday, parseISO } from "date-fns";
import { Calendar as CalendarIcon, Clock, User, CheckCircle, Loader2, AlertCircle } from "lucide-react";

export default function BookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const doctorId = id;

  const supabase = createClient();
  const router = useRouter();

  // Data State
  const [doctor, setDoctor] = useState<any>(null);
  const [availability, setAvailability] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Selection State
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  
  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Fetch Doctor & Availability on Load
  useEffect(() => {
    async function fetchData() {
      // Fetch Doctor Profile
      const { data: doc } = await supabase.from("profiles").select("*").eq("id", doctorId).single();
      setDoctor(doc);

      // Fetch Doctor Schedule
      const { data: avail } = await supabase.from("doctor_availability").select("*").eq("doctor_id", doctorId);
      setAvailability(avail || []);
      
      setLoading(false);
    }
    fetchData();
  }, [doctorId, supabase]);

  // 2. Generate Slots when Date Changes
  useEffect(() => {
    if (!selectedDate || !availability.length) return;

    // Get the day of the week (e.g., "Monday") from the selected date
    const dateObj = new Date(selectedDate);
    const dayName = format(dateObj, 'EEEE'); // 'Monday', 'Tuesday'...

    // Find schedule for this day
    const daySchedule = availability.find(s => s.day_of_week === dayName);

    if (daySchedule) {
      const slots = [];
      let current = parseInt(daySchedule.start_time.split(':')[0]); // e.g., 9
      const end = parseInt(daySchedule.end_time.split(':')[0]);     // e.g., 17

      // Generate 1-hour slots
      while (current < end) {
        const timeString = `${current.toString().padStart(2, '0')}:00`; // "09:00"
        slots.push(timeString);
        current++;
      }
      setAvailableSlots(slots);
    } else {
      setAvailableSlots([]); // No schedule for this day
    }
    setSelectedTime(null); // Reset selection
  }, [selectedDate, availability]);

  const handleBook = async () => {
    if (!selectedDate || !selectedTime) return;
    setSubmitting(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("Please log in first");
      router.push("/login");
      return;
    }

    // Combine Date + Time into ISO String
    const dateTimeString = `${selectedDate}T${selectedTime}:00`;
    const appointmentDate = new Date(dateTimeString).toISOString();

    // Call our Secure Database Function (RPC)
    const { error: rpcError } = await supabase.rpc('book_appointment', {
      p_patient_id: user.id,
      p_doctor_id: doctorId,
      p_start_time: appointmentDate
    });

    if (rpcError) {
      setError(rpcError.message);
      setSubmitting(false);
    } else {
      // --- NEW CODE START ---
      // Send Confirmation Email (Fire and forget - don't await)
      fetch('/api/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: user.email,
          patientName: user.user_metadata?.full_name || "Patient",
          doctorName: doctor.full_name,
          time: appointmentDate
        })
      }).catch(err => console.error('Email send failed:', err));  // Optional: Log errors without blocking

      alert("Appointment Booked Successfully!");
      router.push("/patient/dashboard");
      setSubmitting(false);  // Reset spinner on success
    }
  };

  if (loading) return <div className="p-10 text-center flex justify-center"><Loader2 className="animate-spin" /></div>;
  if (!doctor) return <div className="p-10 text-center">Doctor not found.</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white max-w-2xl w-full rounded-xl shadow-lg border border-gray-100 overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Side: Doctor Info */}
        <div className="bg-blue-600 p-8 text-white md:w-1/3 flex flex-col justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Book Appointment</h2>
            <div className="w-12 h-1 bg-white/30 rounded mb-6"></div>
            
            <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm mb-4">
              <User className="h-8 w-8 mb-2" />
              <p className="font-bold text-lg">{doctor.full_name}</p>
              <p className="opacity-90 text-sm">{doctor.specialization}</p>
            </div>
            
            <p className="text-3xl font-bold">${doctor.consultation_price}<span className="text-sm font-normal opacity-70">/hr</span></p>
          </div>
          <p className="text-xs opacity-60 mt-4">Safe & Secure Booking</p>
        </div>

        {/* Right Side: Selection */}
        <div className="p-8 md:w-2/3">
          {error && (
            <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-lg flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}

          <div className="space-y-6">
            
            {/* 1. Date Selection */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-blue-600" /> Select Date
              </label>
              <input 
                type="date" 
                required
                min={new Date().toISOString().split("T")[0]}
                className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>

            {/* 2. Time Slots */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" /> Available Slots
              </label>
              
              {!selectedDate ? (
                <p className="text-sm text-gray-400 italic">Please pick a date first.</p>
              ) : availableSlots.length === 0 ? (
                <div className="p-4 bg-gray-50 border border-dashed rounded-lg text-center text-sm text-gray-500">
                  No slots available on this day. <br/> Try another date.
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {availableSlots.map((slot) => (
                    <button
                      key={slot}
                      onClick={() => setSelectedTime(slot)}
                      className={`py-2 px-4 rounded-lg text-sm font-semibold transition border ${
                        selectedTime === slot
                          ? "bg-blue-600 text-white border-blue-600 shadow-md transform scale-105"
                          : "bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button 
              onClick={handleBook}
              disabled={submitting || !selectedDate || !selectedTime}
              className="w-full py-4 bg-gray-900 text-white font-bold rounded-lg hover:bg-gray-800 transition flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? <Loader2 className="animate-spin" /> : <CheckCircle className="w-5 h-5" />}
              Confirm Booking
            </button>

            <button onClick={() => router.back()} className="w-full text-center text-sm text-gray-500 hover:underline">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );  
}