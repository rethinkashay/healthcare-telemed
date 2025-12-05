import Link from "next/link";
import { Stethoscope, Calendar, Shield, Video } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Navbar */}
      <nav className="p-6 bg-white shadow-sm flex justify-between items-center">
        <div className="flex items-center gap-2 font-bold text-xl text-blue-600">
          <Stethoscope className="w-6 h-6" />
          <span>HealthCare Telemed</span>
        </div>
        <div className="flex gap-4">
          <Link 
            href="/login" 
            className="px-4 py-2 text-gray-600 hover:text-blue-600 transition"
          >
            Login
          </Link>
          <Link 
            href="/signup" 
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
          >
            Sign Up
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-6 py-20 text-center">
        <h1 className="text-5xl font-extrabold mb-6 leading-tight text-gray-900">
          Healthcare <span className="text-blue-600">Simplified.</span>
        </h1>
        <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
          Book appointments with top doctors, manage your prescriptions, and join video consultations from the comfort of your home.
        </p>
        
        <div className="flex justify-center gap-4">
          <button className="px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-lg shadow-lg hover:bg-blue-700 transition">
            Book an Appointment
          </button>
          <button className="px-8 py-4 bg-white text-blue-600 border border-blue-200 text-lg font-semibold rounded-lg shadow-sm hover:border-blue-400 transition">
            For Doctors
          </button>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mt-24 text-left">
          <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mb-4">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">Easy Scheduling</h3>
            <p className="text-gray-600">View doctor availability and book slots instantly.</p>
          </div>
          
          <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-lg flex items-center justify-center mb-4">
              <Video className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">Video Consultations</h3>
            <p className="text-gray-600">Connect with doctors remotely via secure HD video.</p>
          </div>

          <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center mb-4">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">Secure Records</h3>
            <p className="text-gray-600">Your prescriptions and history are safe with us.</p>
          </div>
        </div>
      </main>
    </div>
  );
}