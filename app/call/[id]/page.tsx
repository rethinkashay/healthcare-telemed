"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { PhoneOff } from "lucide-react";

export default function VideoCall({ params }: { params: Promise<{ id: string }> }) {
  // 1. Unwrap params for Next.js 15
  const { id } = use(params);
  const router = useRouter();

  // Create a clean room name
  const roomName = `telemed-room-${id}`; 

  return (
    <div className="h-screen w-screen bg-black flex flex-col overflow-hidden">
      {/* Custom Header */}
      <div className="bg-gray-900 text-white p-4 flex justify-between items-center shadow-md z-10 shrink-0">
        <div className="flex items-center gap-2">
           <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
           <h1 className="font-semibold text-lg">Secure Consultation</h1>
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
          src={`https://meet.jit.si/${roomName}?config.prejoinPageEnabled=false`}
          allow="camera *; microphone *; fullscreen; display-capture"
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="Video Call"
        />
      </div>
    </div>
  );
}