import { useEffect, useState } from "react";
import {
  HeartPulse,
  CalendarDays,
  Activity,
  Weight,
  Clock,
  Stethoscope,
  Award,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000/api";

function Dashboard() {
  const user = JSON.parse(localStorage.getItem("user"));

  const [pregnancy, setPregnancy] = useState(null);
  const [healthLogs, setHealthLogs] = useState([]);
  const [nextAppointment, setNextAppointment] = useState(null);
  const [doctors, setDoctors] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboardData = async () => {
    if (!user?.id) {
      setError("You must be logged in.");
      setLoading(false);
      return;
    }

    try {
      const [pregnancyResponse, healthResponse, appointmentResponse, doctorResponse] =
        await Promise.all([
          fetch(`${API_BASE}/pregnancy?user_id=${user.id}`),
          fetch(`${API_BASE}/health?user_id=${user.id}`),
          fetch(`${API_BASE}/appointments`, { credentials: "include" }),
          fetch(`${API_BASE}/doctors`),
        ]);

      const pregnancyData = await pregnancyResponse.json();
      const healthData = await healthResponse.json();
      const appointmentData = await appointmentResponse.json();
      const doctorData = await doctorResponse.json();

      if (!pregnancyResponse.ok) {
        setError(pregnancyData.error || "Unable to load pregnancy information.");
        return;
      }

      if (!healthResponse.ok) {
        setError(healthData.error || "Unable to load health information.");
        return;
      }

      setPregnancy(pregnancyData.pregnancy);
      setHealthLogs(healthData.health_logs || []);

      if (appointmentResponse.ok && appointmentData.appointments) {
        const upcoming = appointmentData.appointments.find(
          (apt) => apt.status !== "Cancelled" && apt.status !== "Completed"
        );
        setNextAppointment(upcoming || null);
      }

      if (doctorResponse.ok && doctorData.doctors) {
        setDoctors(doctorData.doctors.filter((d) => d.status === "Active"));
      }
    } catch (err) {
      console.error(err);
      setError("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-500">Loading dashboard...</p>
      </div>
    );
  }

  const latestHealthLog = healthLogs.length > 0 ? healthLogs[0] : null;

  return (
    <div className="max-w-6xl mx-auto pb-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">
          Welcome, {user?.name || "User"}
        </h1>

        <p className="text-gray-500 mt-2">
          Here's a simple overview of your pregnancy and care team.
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {!pregnancy ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
          <HeartPulse size={48} className="mx-auto text-pink-400 mb-4" />

          <h2 className="text-xl font-semibold text-gray-800">
            Pregnancy information not added yet
          </h2>

          <p className="text-gray-500 mt-2">
            Add your pregnancy information to see your pregnancy overview here.
          </p>
        </div>
      ) : (
        <>
          {/* Pregnancy cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-pink-50 rounded-xl">
                  <HeartPulse className="text-pink-600" size={23} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Pregnancy Week</p>
                  <p className="text-2xl font-bold text-gray-800">
                    Week {pregnancy.pregnancy_week}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-50 rounded-xl">
                  <Activity className="text-purple-600" size={23} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Trimester</p>
                  <p className="text-lg font-bold text-gray-800">
                    {pregnancy.trimester}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-50 rounded-xl">
                  <Clock className="text-green-600" size={23} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Pregnancy Progress</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {pregnancy.progress_percentage}%
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 rounded-xl">
                  <CalendarDays className="text-blue-600" size={23} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Expected Due Date</p>
                  <p className="text-lg font-bold text-gray-800">
                    {pregnancy.due_date}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7 mt-6">
            <div className="flex justify-between mb-3">
              <h2 className="font-semibold text-gray-800">
                Pregnancy Progress
              </h2>
              <span className="text-sm text-gray-500">
                {pregnancy.progress_percentage}%
              </span>
            </div>

            <div className="w-full bg-gray-100 rounded-full h-3">
              <div
                className="bg-pink-500 h-3 rounded-full transition-all"
                style={{
                  width: `${pregnancy.progress_percentage}%`,
                }}
              />
            </div>
          </div>

          {/* Health summary & Next Appointment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-3 bg-orange-50 rounded-xl">
                  <Weight className="text-orange-600" size={22} />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-800">Latest Health</h2>
                  <p className="text-sm text-gray-500">
                    Most recently recorded weight
                  </p>
                </div>
              </div>

              {latestHealthLog ? (
                <div>
                  <p className="text-3xl font-bold text-gray-800">
                    {latestHealthLog.weight ?? "—"}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Latest recorded weight
                  </p>
                </div>
              ) : (
                <p className="text-gray-500">
                  No health information recorded yet.
                </p>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-3 bg-blue-50 rounded-xl">
                  <CalendarDays className="text-blue-600" size={22} />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-800">
                    Next Appointment
                  </h2>
                  <p className="text-sm text-gray-500">
                    Your upcoming appointment
                  </p>
                </div>
              </div>

              {nextAppointment ? (
                <div className="space-y-1">
                  <p className="text-base font-bold text-gray-800">
                    {nextAppointment.doctor_name
                      ? `Dr. ${nextAppointment.doctor_name}`
                      : "Doctor Appointment"}
                  </p>
                  {nextAppointment.specialization && (
                    <p className="text-xs text-gray-500">
                      {nextAppointment.specialization}
                    </p>
                  )}
                  {(nextAppointment.doctor_nmc || nextAppointment.nmc_number) && (
                    <p className="text-xs text-gray-400">
                      NMC: <span className="font-medium text-gray-700">{nextAppointment.doctor_nmc || nextAppointment.nmc_number}</span>
                    </p>
                  )}
                  <p className="text-xs text-pink-600 font-semibold pt-2">
                    {nextAppointment.appointment_date} at {nextAppointment.appointment_time}
                  </p>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">
                  No upcoming appointment available.
                </p>
              )}
            </div>
          </div>

          {/* Available Doctors Section on Dashboard */}
          {doctors.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-800">
                    Available Specialists
                  </h2>
                  <p className="text-xs text-gray-500">
                    Verified doctors available for consultations
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {doctors.slice(0, 3).map((doc) => (
                  <div
                    key={doc.doctor_id}
                    className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs hover:border-pink-200 transition"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center shrink-0">
                        <Stethoscope className="text-pink-600" size={20} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-gray-800 text-sm truncate">
                          Dr. {doc.name}
                        </h3>
                        <p className="text-xs text-gray-500 truncate">
                          {doc.specialization}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          NMC: <span className="font-medium text-gray-700">{doc.nmc_number}</span>
                        </p>
                        {doc.practice_at && (
                          <p className="text-[11px] text-gray-400 mt-1 truncate">
                            {doc.practice_at}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Dashboard;
