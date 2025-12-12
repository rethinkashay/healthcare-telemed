"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Clock, Calendar as CalendarIcon, Loader2 } from "lucide-react";

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function AvailabilityPage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [slots, setSlots] = useState<any[]>([]);
  
  // Form State
  const [day, setDay] = useState("Monday");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAvailability();
  }, []);

  async function fetchAvailability() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push("/login");

    const { data, error } = await supabase
      .from('doctor_availability')
      .select('*')
      .eq('doctor_id', user.id)
      .order('day_of_week', { ascending: true }) // Note: sorting by text is alphabetical, we'll fix visual sort below
      .order('start_time', { ascending: true });

    if (!error && data) {
      setSlots(data);
    }
    setLoading(false);
  }

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    // 1. Basic Validation
    if (startTime >= endTime) {
      setError("End time must be after start time");
      setSaving(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 2. Insert into DB
    const { data, error } = await supabase
      .from('doctor_availability')
      .insert({
        doctor_id: user.id,
        day_of_week: day,
        start_time: startTime,
        end_time: endTime
      })
      .select()
      .single();

    if (error) {
      setError(error.message);
    } else {
      setSlots([...slots, data]);
    }
    setSaving(false);
  };

  const handleDeleteSlot = async (id: string) => {
    const { error } = await supabase
      .from('doctor_availability')
      .delete()
      .eq('id', id);

    if (!error) {
      setSlots(slots.filter(s => s.id !== id));
    }
  };

  // Helper to sort slots by day order Monday -> Sunday
  const sortedSlots = [...slots].sort((a, b) => {
    const dayA = DAYS.indexOf(a.day_of_week);
    const dayB = DAYS.indexOf(b.day_of_week);
    if (dayA !== dayB) return dayA - dayB;
    return a.start_time.localeCompare(b.start_time);
  });

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <button 
          onClick={() => router.back()} 
          className="flex items-center text-gray-600 hover:text-blue-600 mb-6 transition"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
        </button>

        <h1 className="text-3xl font-bold text-gray-900 mb-8">Manage Weekly Availability</h1>

        <div className="grid md:grid-cols-3 gap-6">
          
          {/* LEFT: Add Slot Form */}
          <div className="md:col-span-1">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 sticky top-6">
              <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" /> Add New Slot
              </h2>
              
              {error && <div className="bg-red-50 text-red-600 p-3 text-sm rounded-md mb-4">{error}</div>}

              <form onSubmit={handleAddSlot} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Day of Week</label>
                  <select 
                    value={day}
                    onChange={(e) => setDay(e.target.value)}
                    className="w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start</label>
                    <input 
                      type="time" 
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End</label>
                    <input 
                      type="time" 
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={saving}
                  className="w-full py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition flex justify-center"
                >
                  {saving ? <Loader2 className="animate-spin w-5 h-5" /> : "Add Slot"}
                </button>
              </form>
            </div>
          </div>

          {/* RIGHT: List of Slots */}
          <div className="md:col-span-2 space-y-4">
            {sortedSlots.length === 0 ? (
              <div className="bg-white p-10 rounded-xl border border-dashed text-center text-gray-500">
                <CalendarIcon className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p>No availability set. Patients won't be able to book you!</p>
              </div>
            ) : (
              sortedSlots.map((slot) => (
                <div key={slot.id} className="bg-white p-4 rounded-xl border border-gray-100 flex justify-between items-center shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center font-bold text-sm">
                      {slot.day_of_week.substring(0,3)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{slot.day_of_week}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock className="w-4 h-4" />
                        {slot.start_time.slice(0,5)} - {slot.end_time.slice(0,5)}
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDeleteSlot(slot.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                    title="Remove Slot"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))
            )}
          </div>

        </div>
      </div>
    </div>
  );
}