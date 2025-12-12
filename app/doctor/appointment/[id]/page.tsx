"use client";

import { useEffect, useState, use } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { FileText, Upload, Save, Loader2, AlertCircle, ArrowLeft } from "lucide-react";

export default function AppointmentDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [appt, setAppt] = useState<any>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  
  // Form State
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    async function fetchDetails() {
      // 1. Get Appointment Basic Data (No Join - Safe Mode)
      const { data: apptData, error: apptError } = await supabase
        .from("appointments")
        .select("*")
        .eq("id", id)
        .single();
      
      if (apptError) {
        console.error("Error fetching appointment:", apptError);
        setFetchError("Could not load appointment. " + apptError.message);
        setLoading(false);
        return;
      }

      // 2. Manually Get Patient Name
      // This avoids the 'Foreign Key' error by doing a separate simple lookup
      let patientName = "Unknown Patient";
      if (apptData.patient_id) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", apptData.patient_id)
          .single();
        
        if (profileData) {
          patientName = profileData.full_name;
        }
      }

      // 3. Combine Data
      setAppt({ 
        ...apptData, 
        patient: { full_name: patientName } 
      });
      
      setLoading(false);
    }
    fetchDetails();
  }, [id, supabase]);

  const handleSave = async () => {
    if (!appt) {
      alert("Cannot save: Appointment details missing.");
      return;
    }

    setUploading(true);

    // 1. Upload File (if exists)
    let fileUrl = null;
    if (file) {
      // Sanitize filename
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const filePath = `${id}/${Date.now()}-${cleanFileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from("prescriptions")
        .upload(filePath, file);

      if (uploadError) {
        alert("Upload failed: " + uploadError.message);
        setUploading(false);
        return;
      }
      
      fileUrl = filePath; 
    }

    // 2. Save Record
    const { error } = await supabase.from("medical_records").insert({
      appointment_id: id,
      doctor_id: appt.doctor_id,
      patient_id: appt.patient_id,
      diagnosis: diagnosis,
      prescription_text: notes + (fileUrl ? `\n\n[FILE_ATTACHMENT]:${fileUrl}` : "")
    });

    if (error) {
      alert("Error saving record: " + error.message);
    } else {
      alert("Medical Record Saved!");
      router.back();
    }
    setUploading(false);
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600"/></div>;

  if (fetchError || !appt) {
    return (
      <div className="p-10 flex flex-col items-center text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-gray-900">Error Loading Record</h2>
        <p className="text-gray-600 mb-6">{fetchError || "Appointment not found."}</p>
        <button onClick={() => router.back()} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Go Back</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => router.back()} className="flex items-center text-gray-500 hover:text-gray-900 mb-6 transition">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </button>

        <div className="bg-white rounded-xl shadow p-8">
          <h1 className="text-2xl font-bold mb-2">Medical Record</h1>
          <p className="text-gray-500 mb-6 flex items-center gap-2">
            Patient: <span className="font-semibold text-gray-800">{appt.patient?.full_name}</span>
          </p>

          <div className="space-y-6">
            <div>
              <label className="block font-medium mb-2">Diagnosis</label>
              <input 
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                placeholder="e.g. Viral Fever"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
              />
            </div>

            <div>
              <label className="block font-medium mb-2">Prescription / Notes</label>
              <textarea 
                className="w-full p-3 border rounded-lg h-32 focus:ring-2 focus:ring-blue-500 outline-none" 
                placeholder="Rx: Paracetamol 500mg..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div>
              <label className="block font-medium mb-2">Attach Report/File (PDF/Image)</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 cursor-pointer relative transition">
                <input 
                  type="file" 
                  accept="image/*,.pdf"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-500 font-medium">
                  {file ? <span className="text-blue-600">{file.name}</span> : "Click to upload file"}
                </p>
              </div>
            </div>

            <button 
              onClick={handleSave}
              disabled={uploading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition flex justify-center items-center gap-2 disabled:opacity-50"
            >
              {uploading ? <Loader2 className="animate-spin w-5 h-5"/> : <Save className="w-5 h-5"/>}
              Save Medical Record
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}