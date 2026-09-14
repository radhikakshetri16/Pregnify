import { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000/api";
const DOCTOR_COLORS = ["#be185d", "#15803d", "#6d28d9", "#b45309", "#1d4ed8", "#0e7490", "#be123c"];
const STATUS_COLORS = {
  Pending: "#d97706",
  Confirmed: "#2563eb",
  Completed: "#16a34a",
  Cancelled: "#e11d48",
};

const formatNpr = (value) => `NPR ${Number(value || 0).toLocaleString()}`;

function AdminDashboard() {
  const admin = JSON.parse(localStorage.getItem("admin"));
  const [stats, setStats] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const response = await fetch(`${API_BASE}/admin/stats`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load dashboard.");
        setStats(data.stats);
        setDoctors(data.doctor_performance || []);
      } catch (err) {
        console.error(err);
        setError(err.message || "Unable to connect to the server.");
      } finally {
        setLoading(false);
      }
    };
    loadDashboard();
  }, []);

  if (loading) {
    return <div className="min-h-[50vh] flex items-center justify-center text-sm text-gray-500">Loading dashboard...</div>;
  }

  const totalScheduled = doctors.reduce((sum, doctor) => sum + doctor.scheduled_appointments, 0);
  const totalEarnings = doctors.reduce((sum, doctor) => sum + Number(doctor.earnings || 0), 0);
  const pieSegments = doctors.reduce((chart, doctor, index) => {
    if (!doctor.scheduled_appointments) return chart;
    const end = chart.end + (doctor.scheduled_appointments / totalScheduled) * 100;
    return {
      end,
      segments: [...chart.segments, `${DOCTOR_COLORS[index % DOCTOR_COLORS.length]} ${chart.end}% ${end}%`],
    };
  }, { end: 0, segments: [] }).segments;
  const pieBackground = pieSegments.length ? `conic-gradient(${pieSegments.join(", ")})` : "#e5e7eb";

  const statuses = [
    { label: "Pending", value: stats?.pending_appointments ?? 0 },
    { label: "Confirmed", value: stats?.confirmed_appointments ?? 0 },
    { label: "Completed", value: stats?.completed_appointments ?? 0 },
    { label: "Cancelled", value: stats?.cancelled_appointments ?? 0 },
  ];
  const metrics = [
    ["Users", stats?.total_users ?? 0],
    ["Patients", stats?.total_patients ?? 0],
    ["Doctors", stats?.total_doctors ?? 0],
    ["Appointments", stats?.total_appointments ?? 0],
  ];

  return (
    <div className="max-w-7xl mx-auto text-gray-800">
      <header className="pb-4 border-b border-gray-200">
        <h1 className="text-2xl font-semibold">Admin dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Welcome back, {admin?.name || "Administrator"}.</p>
      </header>

      {error && <div className="my-4 border-l-2 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <section className="grid grid-cols-2 lg:grid-cols-4 border-b border-gray-200">
        {metrics.map(([label, value], index) => (
          <div key={label} className={`py-4 ${index > 0 ? "pl-4 sm:pl-6 border-l border-gray-100" : ""}`}>
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-2xl font-semibold mt-1 tabular-nums">{value}</p>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] gap-8 py-6 border-b border-gray-200">
        <section>
          <div className="flex items-baseline justify-between gap-4 mb-5">
            <div>
              <h2 className="text-base font-semibold">Appointments by doctor</h2>
              <p className="text-xs text-gray-500 mt-1">Non-cancelled appointments</p>
            </div>
            <span className="text-sm font-semibold tabular-nums">{totalScheduled} total</span>
          </div>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="relative h-36 w-36 shrink-0 rounded-full" style={{ background: pieBackground }} role="img" aria-label="Appointments distributed across doctors">
              <div className="absolute inset-7 bg-white rounded-full flex items-center justify-center">
                <span className="text-xl font-semibold tabular-nums">{totalScheduled}</span>
              </div>
            </div>
            <div className="w-full divide-y divide-gray-100">
              {doctors.map((doctor, index) => (
                <div key={doctor.doctor_id} className="flex items-center justify-between gap-4 py-2 first:pt-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: DOCTOR_COLORS[index % DOCTOR_COLORS.length] }} />
                    <span className="text-sm truncate">Dr. {doctor.name}</span>
                  </div>
                  <span className="text-sm font-medium tabular-nums">{doctor.scheduled_appointments}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="lg:border-l lg:border-gray-200 lg:pl-8">
          <h2 className="text-base font-semibold">Appointment status</h2>
          <p className="text-xs text-gray-500 mt-1 mb-5">All appointments in the system</p>

          <div className="h-2 flex overflow-hidden bg-gray-100 mb-5">
            {statuses.map((status) => (
              <div
                key={status.label}
                style={{
                  width: `${stats?.total_appointments ? (status.value / stats.total_appointments) * 100 : 0}%`,
                  backgroundColor: STATUS_COLORS[status.label],
                }}
              />
            ))}
          </div>

          <div className="divide-y divide-gray-100">
            {statuses.map((status) => (
              <div key={status.label} className="flex items-center justify-between py-2.5 first:pt-0">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[status.label] }} />
                  <span className="text-sm text-gray-600">{status.label}</span>
                </div>
                <span className="text-sm font-semibold tabular-nums">{status.value}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="pt-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base font-semibold">Doctor performance</h2>
            <p className="text-xs text-gray-500 mt-1">Earnings are estimated from non-cancelled bookings.</p>
          </div>
          <p className="text-sm text-gray-500">Total earnings <span className="ml-2 font-semibold text-gray-800">{formatNpr(totalEarnings)}</span></p>
        </div>

        <div className="overflow-x-auto border-t border-gray-200">
          <table className="w-full min-w-[650px] text-left">
            <thead>
              <tr className="border-b border-gray-200 text-xs text-gray-500">
                <th className="py-3 pr-4 font-medium">Doctor</th>
                <th className="py-3 px-4 font-medium">Scheduled</th>
                <th className="py-3 px-4 font-medium">Completed</th>
                <th className="py-3 px-4 font-medium">Progress</th>
                <th className="py-3 pl-4 font-medium text-right">Earnings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {doctors.map((doctor) => (
                <tr key={doctor.doctor_id} className="text-sm hover:bg-gray-50/70">
                  <td className="py-3 pr-4"><p className="font-medium">Dr. {doctor.name}</p><p className="text-xs text-gray-400 mt-0.5">{doctor.specialization}</p></td>
                  <td className="py-3 px-4 tabular-nums">{doctor.scheduled_appointments}</td>
                  <td className="py-3 px-4 tabular-nums">{doctor.completed_appointments}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-1.5 bg-gray-100 overflow-hidden"><div className="h-full bg-green-600" style={{ width: `${doctor.progress_percent}%` }} /></div>
                      <span className="text-xs text-gray-500 tabular-nums">{doctor.completed_appointments}/{doctor.progress_goal}</span>
                    </div>
                  </td>
                  <td className="py-3 pl-4 text-right font-medium tabular-nums">{formatNpr(doctor.earnings)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default AdminDashboard;
