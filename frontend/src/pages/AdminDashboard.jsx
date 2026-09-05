import { useEffect, useState } from "react";
import {
  Users,
  Stethoscope,
  CalendarDays,
  UserCheck,
  UserX,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";

function AdminDashboard() {
  const admin = JSON.parse(localStorage.getItem("admin"));

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchStats = async () => {
    try {
      const response = await fetch("http://127.0.0.1:5000/api/admin/stats");
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to load system statistics.");
        return;
      }

      setStats(data.stats);
    } catch (err) {
      console.error(err);
      setError("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-500">
          Loading system overview...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">
          Welcome, {admin?.name || "Administrator"}
        </h1>

        <p className="text-gray-500 mt-2">
          Monitor system overview and administrative statistics.
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Users */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-pink-50 rounded-xl">
              <Users className="text-pink-600" size={23} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Users</p>
              <p className="text-2xl font-bold text-gray-800">
                {stats?.total_users ?? 0}
              </p>
            </div>
          </div>
        </div>

        {/* Total Patients */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-50 rounded-xl">
              <Users className="text-purple-600" size={23} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Patients</p>
              <p className="text-2xl font-bold text-gray-800">
                {stats?.total_patients ?? 0}
              </p>
            </div>
          </div>
        </div>

        {/* Total Doctors */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-xl">
              <Stethoscope className="text-blue-600" size={23} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Doctors</p>
              <p className="text-2xl font-bold text-gray-800">
                {stats?.total_doctors ?? 0}
              </p>
            </div>
          </div>
        </div>

        {/* Total Appointments */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-50 rounded-xl">
              <CalendarDays className="text-green-600" size={23} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Appointments</p>
              <p className="text-2xl font-bold text-gray-800">
                {stats?.total_appointments ?? 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown Summaries */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {/* Doctor Summary */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-3 bg-blue-50 rounded-xl">
              <Stethoscope className="text-blue-600" size={22} />
            </div>
            <div>
              <h2 className="font-semibold text-gray-800">
                Doctor Overview
              </h2>
              <p className="text-sm text-gray-500">
                Active and inactive doctor status
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <UserCheck className="text-green-600" size={18} />
                <span className="text-sm text-gray-700">Active Doctors</span>
              </div>
              <span className="font-bold text-gray-800">
                {stats?.active_doctors ?? 0}
              </span>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <UserX className="text-gray-500" size={18} />
                <span className="text-sm text-gray-700">Inactive Doctors</span>
              </div>
              <span className="font-bold text-gray-800">
                {stats?.inactive_doctors ?? 0}
              </span>
            </div>
          </div>
        </div>

        {/* Appointment Summary */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-3 bg-pink-50 rounded-xl">
              <CalendarDays className="text-pink-600" size={22} />
            </div>
            <div>
              <h2 className="font-semibold text-gray-800">
                Appointment Overview
              </h2>
              <p className="text-sm text-gray-500">
                Appointment statuses across system
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <Clock className="text-amber-600" size={18} />
                <span className="text-sm text-gray-700">Pending</span>
              </div>
              <span className="font-bold text-gray-800">
                {stats?.pending_appointments ?? 0}
              </span>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="text-green-600" size={18} />
                <span className="text-sm text-gray-700">Completed</span>
              </div>
              <span className="font-bold text-gray-800">
                {stats?.completed_appointments ?? 0}
              </span>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <XCircle className="text-red-500" size={18} />
                <span className="text-sm text-gray-700">Cancelled</span>
              </div>
              <span className="font-bold text-gray-800">
                {stats?.cancelled_appointments ?? 0}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
