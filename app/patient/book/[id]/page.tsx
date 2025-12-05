"use client";

import { useEffect, useState, use } from "react"; // <--- Added 'use' here
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation"; 
import { Calendar, Clock, User, CheckCircle, Loader2 } from "lucide-react";
import React from "react";

// NOTE: In Next.js 15, params is a Promise!
export default function BookingPage({ params }: { params: Promise<{ id: string }> }) {
  // 1. Unwrap the params Promise using React.use()
  const { id } = use(params); 
  const doctorId = id;

  const supabase = createClient();
  const router = useRouter();

  const [doctor, setDoctor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchDoctor() {
      // 2. Use the unwrapped doctorId here
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", doctorId)
        .single();
      
      if (error) {
        console.error("Supabase Error:", error);
      } else {
        setDoctor(data);
      }
      
      setLoading(false);
    }
    fetchDoctor();
  }, [doctorId, supabase]);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    // Get current user (Patient)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("Please log in first");
      setSubmitting(false);
      return;
    }

    // Combine date and time
    const appointmentDateTime = new Date(`${date}T${time}`).toISOString();

    // Save to Supabase
    const { error } = await supabase
      .from("appointments")
      .insert({
        patient_id: user.id,
        doctor_id: doctorId,
        start_time: appointmentDateTime,
        status: "pending"
      });

    if (error) {
      alert("Failed to book: " + error.message);
      setSubmitting(false);
    } else {
      alert("Appointment Booked Successfully!");
      router.push("/patient/dashboard");
    }
  };

  if (loading) return <div className="p-10 text-center">Loading Doctor Details...</div>;
  if (!doctor) return <div className="p-10 text-center">Doctor not found (ID: {doctorId})</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white max-w-lg w-full rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        
        {/* Header */}
        <div className="bg-blue-600 p-6 text-white text-center">
          <h2 className="text-xl font-bold mb-1">Book Appointment</h2>
          <p className="opacity-90">with Dr. {doctor.full_name}</p>
        </div>

        <div className="p-8">
          <div className="flex items-center gap-4 mb-8 bg-blue-50 p-4 rounded-lg">
            <div className="bg-white p-3 rounded-full shadow-sm">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium uppercase tracking-wide">Specialist</p>
              <p className="font-bold text-gray-900">{doctor.specialization}</p>
              <p className="text-sm text-blue-600 font-bold">${doctor.consultation_price}/hr</p>
            </div>
          </div>

          <form onSubmit={handleBook} className="space-y-6">
            
            {/* Date Picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input 
                  type="date" 
                  required
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full pl-10 p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>

            {/* Time Picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Time</label>
              <div className="relative">
                <Clock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input 
                  type="time" 
                  required
                  className="w-full pl-10 p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={submitting}
              className="w-full py-4 bg-gray-900 text-white font-bold rounded-lg hover:bg-gray-800 transition flex justify-center items-center gap-2"
            >
              {submitting ? <Loader2 className="animate-spin" /> : <CheckCircle />}
              Confirm Booking
            </button>
          </form>
          
          <button 
            onClick={() => router.back()}
            className="w-full mt-4 py-2 text-gray-500 font-medium hover:text-gray-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}