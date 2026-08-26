import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  Users,
  CheckCircle2,
  Clock,
  Phone,
} from "lucide-react";

function DoctorDashboard() {
  const [doctor, setDoctor] = useState(null);
  const [stats, setStats] = useState(null);
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const storedDoctor = localStorage.getItem("doctor");
    if (storedDoctor) {
      const doc = JSON.parse(storedDoctor);
      setDoctor(doc);
      fetchDashboardData(doc.doctor_id);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchDashboardData = async (doctorId) => {
    try {
      const response = await fetch(
        `http://127.0.0.1:5000/api/doctors/${doctorId}/dashboard-stats`
      );
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to load dashboard data.");
        return;
      }

      setStats(data.stats);
      setTodayAppointments(data.today_appointments || []);
      setUpcomingAppointments(data.upcoming_appointments || []);
    } catch (err) {
      console.error(err);
      setError("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (appointmentId, newStatus) => {
    if (!doctor?.doctor_id) return;

    try {
      const response = await fetch(
        `http://127.0.0.1:5000/api/doctors/${doctor.doctor_id}/appointments/${appointmentId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (response.ok) {
        fetchDashboardData(doctor.doctor_id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-500">Loading doctor dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">
          Welcome, {doctor?.name ? doctor.name : "Doctor"}
        </h1>
        <p className="text-gray-500 mt-2">
          {doctor?.specialization ? `${doctor.specialization} • ` : ""}
          Here's an overview of your schedule and patients.
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Today's Appointments */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-pink-50 rounded-xl">
              <Clock className="text-pink-600" size={23} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Today's Appointments</p>
              <p className="text-2xl font-bold text-gray-800">
                {stats?.today_appointments ?? 0}
              </p>
            </div>
          </div>
        </div>

        {/* Upcoming Appointments */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-50 rounded-xl">
              <CalendarDays className="text-purple-600" size={23} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Upcoming Consultations</p>
              <p className="text-2xl font-bold text-gray-800">
                {stats?.upcoming_appointments ?? 0}
              </p>
            </div>
          </div>
        </div>

        {/* Total Patients */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-xl">
              <Users className="text-blue-600" size={23} />
            </div>
            <div>
              <p className="text-sm text-gray-500">My Patients</p>
              <p className="text-2xl font-bold text-gray-800">
                {stats?.total_patients ?? 0}
              </p>
            </div>
          </div>
        </div>

        {/* Completed */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-50 rounded-xl">
              <CheckCircle2 className="text-green-600" size={23} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Completed</p>
              <p className="text-2xl font-bold text-gray-800">
                {stats?.completed_appointments ?? 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Schedule Section */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7 mt-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-pink-50 rounded-xl">
              <Clock className="text-pink-600" size={22} />
            </div>
            <div>
              <h2 className="font-semibold text-gray-800">
                Today's Schedule
              </h2>
              <p className="text-sm text-gray-500">
                {todayAppointments.length} appointment(s) today
              </p>
            </div>
          </div>
        </div>

        {todayAppointments.length === 0 ? (
          <p className="text-gray-500 py-4">
            No appointments scheduled for today.
          </p>
        ) : (
          <div className="space-y-3">
            {todayAppointments.map((apt) => (
              <div
                key={apt.appointment_id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-xl gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-800">
                      {apt.patient_name}
                    </span>
                    <span className="text-xs text-gray-500">
                      ({apt.appointment_time})
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Type: {apt.appointment_type}
                    {apt.reason ? ` • ${apt.reason}` : ""}
                  </p>
                  {apt.patient_phone && (
                    <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                      <Phone size={12} /> {apt.patient_phone}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-lg text-xs font-medium ${
                      apt.status === "Confirmed"
                        ? "bg-blue-50 text-blue-600"
                        : apt.status === "Completed"
                        ? "bg-green-50 text-green-600"
                        : apt.status === "Cancelled"
                        ? "bg-red-50 text-red-600"
                        : "bg-amber-50 text-amber-600"
                    }`}
                  >
                    {apt.status}
                  </span>

                  {apt.status !== "Completed" && apt.status !== "Cancelled" && (
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateStatus(apt.appointment_id, "Completed")
                      }
                      className="px-3 py-1 bg-pink-600 text-white text-xs font-medium rounded-lg hover:bg-pink-700 transition"
                    >
                      Mark Done
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming Consultations Section */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7 mt-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-50 rounded-xl">
              <CalendarDays className="text-purple-600" size={22} />
            </div>
            <div>
              <h2 className="font-semibold text-gray-800">
                Upcoming Appointments
              </h2>
              <p className="text-sm text-gray-500">
                Scheduled consultations
              </p>
            </div>
          </div>

          <Link
            to="/doctor/appointments"
            className="text-sm text-pink-600 font-medium hover:underline"
          >
            View all
          </Link>
        </div>

        {upcomingAppointments.length === 0 ? (
          <p className="text-gray-500 py-4">
            No upcoming appointments scheduled.
          </p>
        ) : (
          <div className="space-y-3">
            {upcomingAppointments.map((apt) => (
              <div
                key={apt.appointment_id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-xl gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-800">
                      {apt.patient_name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {apt.appointment_date} at {apt.appointment_time}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Type: {apt.appointment_type}
                    {apt.reason ? ` • ${apt.reason}` : ""}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-lg text-xs font-medium ${
                      apt.status === "Confirmed"
                        ? "bg-blue-50 text-blue-600"
                        : "bg-amber-50 text-amber-600"
                    }`}
                  >
                    {apt.status}
                  </span>

                  {apt.status === "Pending" && (
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateStatus(apt.appointment_id, "Confirmed")
                      }
                      className="px-3 py-1 bg-pink-600 text-white text-xs font-medium rounded-lg hover:bg-pink-700 transition"
                    >
                      Confirm
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default DoctorDashboard;