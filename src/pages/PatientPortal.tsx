import React, { useState, useEffect } from "react";
import { 
  Calendar, 
  Clock, 
  FileText, 
  Activity, 
  User as UserIcon,
  ShoppingBag,
  ChevronRight,
  Eye
} from "lucide-react";
import { motion } from "motion/react";
import { format, parseISO } from "date-fns";

export default function PatientPortal() {
  const [user, setUser] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem("visionx_user");
    if (savedUser) setUser(JSON.parse(savedUser));

    const fetchData = async () => {
      try {
        const token = localStorage.getItem("visionx_token");
        const [apptRes, testRes] = await Promise.all([
          fetch("/api/patient/appointments", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/patient/tests", { headers: { Authorization: `Bearer ${token}` } })
        ]);

        if (apptRes.ok) setAppointments(await apptRes.json());
        if (testRes.ok) setTestResults(await testRes.json());
      } catch (err) {
        console.error("Failed to fetch patient data", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading || !user) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Patient Portal</h1>
          <p className="text-slate-400 mt-1">Welcome back, {user.name}. View your eye health records and appointments.</p>
        </div>
        <div className="flex gap-3">
          <button className="gradient-bg px-6 py-3 rounded-xl font-bold shadow-lg shadow-cyan-500/20 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Request Appointment
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Profile & Stats */}
        <div className="space-y-6">
          <div className="glass-card p-6 text-center">
            <div className="w-24 h-24 gradient-bg rounded-full mx-auto mb-4 flex items-center justify-center text-3xl font-bold text-white shadow-xl shadow-cyan-500/20">
              {user.name.charAt(0)}
            </div>
            <h2 className="text-xl font-bold">{user.name}</h2>
            <p className="text-slate-400 text-sm mb-6">{user.email}</p>
            <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-6">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Member Since</p>
                <p className="text-sm font-bold">Feb 2024</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Patient ID</p>
                <p className="text-sm font-bold">#VX-9921</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              Quick Actions
            </h3>
            <div className="space-y-3">
              <button 
                onClick={() => window.location.href = '/ai-test'}
                className="w-full flex items-center justify-between p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl transition-all group"
              >
                <div className="flex items-center gap-3">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm font-bold text-cyan-400">Start AI Eye Test</span>
                </div>
                <ChevronRight className="w-4 h-4 text-cyan-400" />
              </button>
              <button 
                onClick={() => window.location.href = '/inventory'}
                className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all group"
              >
                <div className="flex items-center gap-3">
                  <ShoppingBag className="w-4 h-4 text-slate-400 group-hover:text-white" />
                  <span className="text-sm font-medium">Browse Eyewear</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-all" />
              </button>
              <button className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all group">
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-slate-400 group-hover:text-white" />
                  <span className="text-sm font-medium">Download Prescription</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-all" />
              </button>
            </div>
          </div>
        </div>

        {/* Middle & Right Column: Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Upcoming Appointments */}
          <section>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Clock className="w-6 h-6 text-amber-400" />
              Upcoming Appointments
            </h3>
            <div className="space-y-4">
              {appointments.length > 0 ? (
                appointments.map((appt: any) => (
                  <div key={appt.id} className="glass-card flex items-center justify-between p-6">
                    <div className="flex items-center gap-6">
                      <div className="text-center min-w-[60px]">
                        <p className="text-xs font-bold text-slate-500 uppercase">{format(parseISO(appt.date), 'MMM')}</p>
                        <p className="text-2xl font-black text-cyan-400">{format(parseISO(appt.date), 'dd')}</p>
                      </div>
                      <div>
                        <h4 className="font-bold text-lg">Eye Examination</h4>
                        <p className="text-sm text-slate-400 flex items-center gap-2">
                          <Clock className="w-4 h-4" /> {appt.time}
                        </p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                      appt.status === 'approved' ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' : 'bg-amber-400/10 text-amber-400 border-amber-400/20'
                    }`}>
                      {appt.status}
                    </span>
                  </div>
                ))
              ) : (
                <div className="glass-card p-12 text-center opacity-50">
                  <Calendar className="w-12 h-12 mx-auto mb-4" />
                  <p>No upcoming appointments scheduled.</p>
                </div>
              )}
            </div>
          </section>

          {/* Recent Test Results */}
          <section>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <FileText className="w-6 h-6 text-violet-400" />
              Recent Eye Test Results
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {testResults.length > 0 ? (
                testResults.map((test: any) => (
                  <div key={test.id} className="glass-card p-6 hover:border-cyan-500/30 transition-all cursor-pointer group">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 bg-violet-500/10 rounded-xl flex items-center justify-center text-violet-400">
                        <Eye className="w-6 h-6" />
                      </div>
                      <span className="text-xs text-slate-500">{format(parseISO(test.date), 'MMM dd, yyyy')}</span>
                    </div>
                    <h4 className="font-bold mb-2">AI Diagnosis Report</h4>
                    <p className="text-xs text-slate-400 line-clamp-2 mb-4">
                      {JSON.parse(test.results).summary || "Detailed analysis of your eye health and refractive power."}
                    </p>
                    <button className="text-cyan-400 text-xs font-bold flex items-center gap-1 group-hover:gap-2 transition-all">
                      View Full Report <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="col-span-full glass-card p-12 text-center opacity-50">
                  <Activity className="w-12 h-12 mx-auto mb-4" />
                  <p>No test results available yet.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
