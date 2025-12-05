"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link"; // <--- Added Link
import { User, Stethoscope, DollarSign, FileText, Save, Loader2, Calendar, CheckCircle, XCircle, Clock, Video } from "lucide-react"; // <--- Added Video icon

export default function DoctorDashboard() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  // Profile Form Fields
  const [fullName, setFullName] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [consultationPrice, setConsultationPrice] = useState("");
  const [bio, setBio] = useState("");

  // Appointment Data
  const [appointments, setAppointments] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      // 1. Get current logged in user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        router.push("/login");
        return;
      }

      // 2. Fetch their profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profile) {
        if (profile.role !== "doctor") {
          router.push("/");
          return;
        }
        setUser(user);
        setFullName(profile.full_name || "");
        setSpecialization(profile.specialization || "");
        setConsultationPrice(profile.consultation_price || "");
        setBio(profile.bio || "");
      }

      // 3. FETCH APPOINTMENTS FOR THIS DOCTOR
      const { data: appts, error: apptsError } = await supabase
        .from("appointments")
        .select("*")
        .eq("doctor_id", user.id)
        .order("start_time", { ascending: true }); // Show earliest first

      if (appts && appts.length > 0) {
        // Get all unique patient IDs from the appointments
        const patientIds = appts.map(a => a.patient_id);
        
        // Fetch profiles for those patients
        const { data: patients } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", patientIds);

        // Merge the data: Add 'patient_name' to each appointment object
        const mergedAppointments = appts.map(appt => {
          const patient = patients?.find(p => p.id === appt.patient_id);
          return {
            ...appt,
            patient_name: patient?.full_name || patient?.email || "Unknown Patient"
          };
        });

        setAppointments(mergedAppointments);
      }

      setLoading(false);
    }

    fetchData();
  }, [router, supabase]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        specialization: specialization,
        consultation_price: consultationPrice,
        bio: bio,
      })
      .eq("id", user.id);

    if (error) alert("Error updating profile!");
    else alert("Profile updated successfully!");
    setSaving(false);
  };

  // Function to Accept or Cancel appointments
  const handleStatusChange = async (appointmentId: string, newStatus: string) => {
    // 1. Update Database
    const { error } = await supabase
      .from("appointments")
      .update({ status: newStatus })
      .eq("id", appointmentId);

    if (error) {
      alert("Error updating status");
    } else {
      // 2. Update UI instantly (Optimistic update)
      setAppointments(prev => 
        prev.map(a => a.id === appointmentId ? { ...a, status: newStatus } : a)
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
             <h1 className="text-3xl font-bold text-gray-900">Doctor Dashboard</h1>
             <button 
                onClick={async () => { await supabase.auth.signOut(); router.push("/login"); }}
                className="text-red-500 hover:underline"
             >
                Sign Out
             </button>
        </div>

        {/* SECTION 1: PROFILE SETTINGS */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600" />
            Profile Settings
          </h2>

          <form onSubmit={handleUpdateProfile} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Specialization</label>
                <div className="relative">
                  <Stethoscope className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    className="w-full pl-10 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Consultation Price ($)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                  <input
                    type="number"
                    value={consultationPrice}
                    onChange={(e) => setConsultationPrice(e.target.value)}
                    className="w-full pl-10 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">About Me</label>
              <div className="relative">
                <FileText className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  className="w-full pl-10 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
            >
              {saving ? <Loader2 className="animate-spin h-5 w-5" /> : <Save className="h-5 w-5" />}
              Save Changes
            </button>
          </form>
        </div>

        {/* SECTION 2: APPOINTMENT MANAGER */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Incoming Appointments
          </h2>

          {appointments.length === 0 ? (
            <p className="text-gray-500 italic">No appointments booked yet.</p>
          ) : (
            <div className="space-y-4">
              {appointments.map((appt) => (
                <div key={appt.id} className="flex flex-col md:flex-row justify-between items-center p-5 border rounded-lg bg-gray-50 hover:bg-white transition hover:shadow-md">
                  
                  {/* Left Side: Info */}
                  <div className="mb-4 md:mb-0">
                    <h3 className="font-bold text-lg text-gray-800">{appt.patient_name}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {new Date(appt.start_time).toLocaleDateString()} at {new Date(appt.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide
                        ${appt.status === 'confirmed' ? 'bg-green-100 text-green-700' : 
                          appt.status === 'cancelled' ? 'bg-red-100 text-red-700' : 
                          'bg-yellow-100 text-yellow-700'}`}>
                        {appt.status}
                      </span>
                    </div>
                  </div>

                  {/* Right Side: Actions */}
                  {appt.status === 'pending' && (
                    <div className="flex gap-3">
                      <button 
                        onClick={() => handleStatusChange(appt.id, "confirmed")}
                        className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition text-sm font-medium"
                      >
                        <CheckCircle className="w-4 h-4" /> Accept
                      </button>
                      <button 
                          onClick={() => handleStatusChange(appt.id, "cancelled")}
                          className="flex items-center gap-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition text-sm font-medium"
                      >
                        <XCircle className="w-4 h-4" /> Reject
                      </button>
                    </div>
                  )}
                  
                  {/* If already decided, show status AND Join Button if confirmed */}
                  {appt.status !== 'pending' && (
                     <div className="flex items-center gap-4">
                       <span className="text-sm text-gray-400 font-medium">
                         {appt.status === 'confirmed' ? 'Confirmed' : 'Cancelled'}
                       </span>
                       
                       {/* JOIN BUTTON - Only shows if Confirmed */}
                       {appt.status === 'confirmed' && (
                         <Link 
                           href={`/call/${appt.id}`}
                           className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 transition text-sm"
                         >
                           <Video className="w-4 h-4" /> Join Call
                         </Link>
                       )}
                     </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}