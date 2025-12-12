"use client";

import { useEffect, useState, use } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { PhoneOff, ShieldCheck, Loader2, AlertTriangle } from "lucide-react";

export default function VideoCall({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const appointmentId = id;
  
  const supabase = createClient();
  const router = useRouter();

  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [roomName, setRoomName] = useState("");

  useEffect(() => {
    async function checkAccess() {
      // 1. Get Current User
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/login"); // Kick out if not logged in
        return;
      }

      // 2. Fetch Appointment Details
      const { data: appointment, error } = await supabase
        .from("appointments")
        .select("doctor_id, patient_id, status")
        .eq("id", appointmentId)
        .single();

      if (error || !appointment) {
        alert("Appointment not found!");
        router.push("/");
        return;
      }

      // 3. Security Check: Are you the Doctor or the Patient?
      const isDoctor = user.id === appointment.doctor_id;
      const isPatient = user.id === appointment.patient_id;

      if (!isDoctor && !isPatient) {
        // INTRUDER DETECTED
        alert("⛔ Unauthorized: You are not a participant in this appointment.");
        router.push("/");
        return;
      }

      // 4. Status Check (Optional: Don't allow if cancelled)
      if (appointment.status === 'cancelled') {
        alert("This appointment was cancelled.");
        router.push("/");
        return;
      }

      // 5. Access Granted
      setAuthorized(true);
      // We use a specific format for Jitsi rooms to prevent collisions
      setRoomName(`telemed-secure-${appointmentId}`); 
      setLoading(false);
    }

    checkAccess();
  }, [appointmentId, router, supabase]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-gray-900 text-white">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
        <p>Verifying secure access...</p>
      </div>
    );
  }

  if (!authorized) return null; // Should have redirected already

  return (
    <div className="h-screen w-screen bg-black flex flex-col overflow-hidden">
      {/* Custom Header */}
      <div className="bg-gray-900 text-white p-4 flex justify-between items-center shadow-md z-10 shrink-0">
        <div className="flex items-center gap-2">
           <ShieldCheck className="w-5 h-5 text-green-400" />
           <span className="font-semibold text-lg">Secure Consultation</span>
           <span className="text-xs bg-gray-700 px-2 py-1 rounded text-gray-300 hidden md:inline">
             Encrypted • P2P
           </span>
        </div>
        <button 
          onClick={() => router.back()}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold transition"
        >
          <PhoneOff className="w-4 h-4" />
          End Call
        </button>
      </div>

      {/* The Video Embed */}
      <div className="flex-1 w-full h-full relative bg-gray-800">
        <iframe
          src={`https://meet.jit.si/${roomName}?config.prejoinPageEnabled=false&userInfo.displayName=User`}
          allow="camera *; microphone *; fullscreen; display-capture"
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="Video Call"
        />
      </div>
    </div>
  );
}