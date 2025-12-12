"use client";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, MapPin, Star, Clock, Video, Calendar, User } from "lucide-react";
import { formatLocalTime } from "@/utils/date";
export default function PatientDashboard() {
  const supabase = createClient();
  const router = useRouter();

  const [doctors, setDoctors] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    async function fetchData() {
      // 1. Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUser(user);

      // 2. Fetch All Doctors for the "Find a Doctor" section
      const { data: doctorList } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "doctor");
      setDoctors(doctorList || []);

      // 3. Fetch My Appointments (Simple Query)
      const { data: apptList, error: apptError } = await supabase
        .from("appointments")
        .select("*")
        .eq("patient_id", user.id)
        .order("start_time", { ascending: true });

      if (apptList && apptList.length > 0) {
        // 4. Manually fetch doctor details for these appointments
        const doctorIds = apptList.map(a => a.doctor_id);
        const { data: doctorProfiles } = await supabase
          .from("profiles")
          .select("id, full_name, specialization")
          .in("id", doctorIds);

        // 5. Combine the data
        const mergedAppointments = apptList.map(appt => {
          const doc = doctorProfiles?.find(d => d.id === appt.doctor_id);
          return {
            ...appt,
            doctor: doc || { full_name: "Unknown Doctor", specialization: "General" }
          };
        });
        
        setAppointments(mergedAppointments);
      } else {
        setAppointments([]);
      }

      setLoading(false);
    }

    fetchData();
  }, [router, supabase]);

  // --- REALTIME SUBSCRIPTION ---
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('patient-appointments')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE', // Patients mainly care if status changes
          schema: 'public',
          table: 'appointments',
          filter: `patient_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("Appointment Updated:", payload);
          // Update the list immediately
          setAppointments((prev) =>
            prev.map((a) => a.id === payload.new.id ? { ...a, status: payload.new.status } : a)
          );
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, user]);

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <nav className="bg-white shadow-sm p-4 sticky top-0 z-10 mb-8">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-blue-600">HealthCare Telemed</h1>
          <button onClick={async () => { await supabase.auth.signOut(); router.push("/login"); }} className="text-sm text-red-500 hover:underline">Sign Out</button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 space-y-12">
        
        {/* SECTION 1: MY APPOINTMENTS */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-blue-600" /> My Appointments
          </h2>
          
          {loading ? (
             <div className="text-gray-500">Loading...</div>
          ) : appointments.length === 0 ? (
             <div className="bg-white p-8 rounded-xl border border-dashed border-gray-300 text-center text-gray-500">
                You have no upcoming appointments. Find a doctor below!
             </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {appointments.map((appt) => (
                <div key={appt.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg text-gray-900">Dr. {appt.doctor?.full_name}</h3>
                      <p className="text-blue-600 text-sm font-medium">{appt.doctor?.specialization}</p>
                      
                      <div className="flex items-center gap-2 text-gray-500 text-sm mt-3">
                        <Clock className="w-4 h-4" />
                        {formatLocalTime(appt.start_time)}
                      </div>
                    </div>
                    
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide
                      ${appt.status === 'confirmed' ? 'bg-green-100 text-green-700' : 
                        appt.status === 'cancelled' ? 'bg-red-100 text-red-700' : 
                        'bg-yellow-100 text-yellow-700'}`}>
                      {appt.status}
                    </span>
                  </div>

                  {/* JOIN BUTTON - Only shows if Confirmed */}
                  {appt.status === 'confirmed' && (
                    <div className="mt-6 pt-4 border-t border-gray-100">
                      <Link 
                        href={`/call/${appt.id}`}
                        className="flex items-center justify-center gap-2 w-full bg-green-600 text-white px-4 py-3 rounded-lg font-bold hover:bg-green-700 transition"
                      >
                        <Video className="w-5 h-5" /> Join Video Call
                      </Link>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 2: FIND A DOCTOR */}
        <div>
           <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
             <User className="w-6 h-6 text-blue-600" /> Find a Doctor
           </h2>
           <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {doctors.map((doctor) => (
              <div key={doctor.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{doctor.full_name}</h3>
                    <p className="text-blue-600 font-medium">{doctor.specialization}</p>
                  </div>
                  <div className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold">${doctor.consultation_price}/hr</div>
                </div>
                <Link href={`/patient/book/${doctor.id}`} className="block w-full py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 text-center">
                  Book Appointment
                </Link>
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}