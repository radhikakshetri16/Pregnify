import { useEffect, useState, useMemo } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000/api";
const DOCTOR_COLORS = [
  "#be185d", // Pink / Rose
  "#15803d", // Green
  "#6d28d9", // Purple
  "#b45309", // Amber / Orange
  "#1d4ed8", // Blue
  "#0e7490", // Cyan / Teal
  "#be123c", // Crimson
  "#047857", // Emerald
  "#7c3aed", // Violet
  "#c2410c", // Dark Orange
  "#2563eb", // Royal Blue
  "#0891b2", // Teal
  "#4338ca", // Indigo
  "#db2777", // Bright Pink
];

const STATUS_COLORS = {
  Pending: "#d97706",
  Confirmed: "#2563eb",
  Completed: "#16a34a",
  Cancelled: "#e11d48",
};

const formatNpr = (value) => `NPR ${Number(value || 0).toLocaleString()}`;

/**
 * Returns a display string for a doctor.
 * If multiple doctors share the exact same name, appends specialization or ID to distinguish them.
 */
const getDoctorDisplayName = (doctor, allDoctors) => {
  if (!doctor) return "";
  const nameTrimmed = (doctor.name || "").trim().toLowerCase();
  const sameNameDoctors = allDoctors.filter(
    (d) => (d.name || "").trim().toLowerCase() === nameTrimmed
  );

  if (sameNameDoctors.length > 1) {
    if (doctor.specialization) {
      const sameNameAndSpec = sameNameDoctors.filter(
        (d) => (d.specialization || "").trim().toLowerCase() === (doctor.specialization || "").trim().toLowerCase()
      );
      if (sameNameAndSpec.length === 1) {
        return `Dr. ${doctor.name} (${doctor.specialization})`;
      }
      return `Dr. ${doctor.name} (${doctor.specialization} #${doctor.doctor_id})`;
    }
    return `Dr. ${doctor.name} (#${doctor.doctor_id})`;
  }

  return `Dr. ${doctor.name}`;
};

/**
 * Creates a mapping of doctor_id -> color.
 * Ensures that two doctors with the exact same name receive different assigned colors.
 */
const getDoctorColorMap = (allDoctors) => {
  const colorMap = {};
  const usedColorsByName = {};

  allDoctors.forEach((doctor, idx) => {
    const normalizedName = (doctor.name || "").trim().toLowerCase();
    let colorIdx = idx % DOCTOR_COLORS.length;

    if (usedColorsByName[normalizedName]) {
      // Find the next available color that hasn't been assigned to a doctor with this name
      let attempts = 0;
      while (
        usedColorsByName[normalizedName].includes(DOCTOR_COLORS[colorIdx]) &&
        attempts < DOCTOR_COLORS.length
      ) {
        colorIdx = (colorIdx + 1) % DOCTOR_COLORS.length;
        attempts++;
      }
    }

    const assignedColor = DOCTOR_COLORS[colorIdx];
    if (!usedColorsByName[normalizedName]) {
      usedColorsByName[normalizedName] = [];
    }
    usedColorsByName[normalizedName].push(assignedColor);
    colorMap[doctor.doctor_id] = assignedColor;
  });

  return colorMap;
};

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

  const doctorColorMap = useMemo(() => getDoctorColorMap(doctors), [doctors]);

  if (loading) {
    return <div className="min-h-[50vh] flex items-center justify-center text-sm text-gray-500">Loading dashboard...</div>;
  }

  const totalScheduled = doctors.reduce((sum, doctor) => sum + doctor.scheduled_appointments, 0);
  const totalEarnings = doctors.reduce((sum, doctor) => sum + Number(doctor.earnings || 0), 0);
  const maxScheduled = Math.max(...doctors.map((d) => d.scheduled_appointments), 1);

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
              <p className="text-xs text-gray-500 mt-1">Non-cancelled appointments per doctor</p>
            </div>
            <span className="text-sm font-semibold tabular-nums">{totalScheduled} total</span>
          </div>

          {/* Bar Graph Visualization */}
          <div className="bg-gray-50/60 p-4 rounded-xl border border-gray-100 mb-5">
            {doctors.length === 0 ? (
              <p className="text-sm text-gray-400 py-8 text-center">No doctor performance data available.</p>
            ) : (
              <div className="space-y-2">
                {/* Y-axis scale guidelines */}
                <div className="flex justify-between text-[11px] text-gray-400 border-b border-gray-200 pb-1 mb-3">
                  <span>0</span>
                  <span>{Math.round(maxScheduled / 2)}</span>
                  <span>{maxScheduled} max</span>
                </div>

                {/* Bars Container */}
                <div className="h-44 flex items-end justify-around gap-2 pt-4 px-2">
                  {doctors.map((doctor) => {
                    const heightPercent = (doctor.scheduled_appointments / maxScheduled) * 100;
                    const barColor = doctorColorMap[doctor.doctor_id];
                    const displayName = getDoctorDisplayName(doctor, doctors);

                    return (
                      <div
                        key={doctor.doctor_id}
                        className="group relative flex flex-col items-center flex-1 max-w-[64px] h-full justify-end"
                      >
                        {/* Hover Tooltip */}
                        <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-10 w-44 pointer-events-none">
                          <div className="bg-gray-900 text-white text-xs rounded-lg p-2.5 shadow-xl w-full text-center space-y-1">
                            <p className="font-semibold">{displayName}</p>
                            {doctor.specialization && (
                              <p className="text-[11px] text-gray-300">{doctor.specialization}</p>
                            )}
                            <div className="pt-1 border-t border-gray-700 flex justify-between text-[11px]">
                              <span>Appointments:</span>
                              <span className="font-semibold text-emerald-400">{doctor.scheduled_appointments}</span>
                            </div>
                            <div className="flex justify-between text-[11px]">
                              <span>Earnings:</span>
                              <span className="font-semibold text-amber-300">{formatNpr(doctor.earnings)}</span>
                            </div>
                          </div>
                          <div className="w-2 h-2 bg-gray-900 rotate-45 -mt-1"></div>
                        </div>

                        {/* Value Badge */}
                        <span className="text-[11px] font-medium text-gray-600 mb-1.5 tabular-nums">
                          {doctor.scheduled_appointments}
                        </span>

                        {/* Vertical Bar */}
                        <div
                          className="w-full rounded-t-md transition-all duration-300 group-hover:brightness-110 group-hover:scale-x-105 shadow-xs"
                          style={{
                            height: doctor.scheduled_appointments > 0 ? `${Math.max(heightPercent, 6)}%` : "4px",
                            backgroundColor: barColor,
                            opacity: doctor.scheduled_appointments > 0 ? 1 : 0.3,
                          }}
                        />

                        {/* Doctor Label under Bar */}
                        <div className="mt-2 w-full text-center">
                          <p className="text-[11px] font-medium text-gray-700 truncate" title={displayName}>
                            {doctor.name}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Doctor Color Legend List */}
          <div className="w-full divide-y divide-gray-100 mt-4">
            {doctors.map((doctor) => {
              const displayName = getDoctorDisplayName(doctor, doctors);
              const barColor = doctorColorMap[doctor.doctor_id];
              return (
                <div key={doctor.doctor_id} className="flex items-center justify-between gap-4 py-2 first:pt-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="h-3 w-3 rounded-full shrink-0 shadow-xs"
                      style={{ backgroundColor: barColor }}
                    />
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-gray-800 truncate block">{displayName}</span>
                      {doctor.specialization && (
                        <span className="text-xs text-gray-400 block">
                          {doctor.specialization} {doctor.nmc_number ? `• NMC: ${doctor.nmc_number}` : ""}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-semibold text-gray-700 tabular-nums">
                      {doctor.scheduled_appointments}
                    </span>
                    <span className="text-xs text-gray-400 ml-1">appts</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="lg:border-l lg:border-gray-200 lg:pl-8">
          <h2 className="text-base font-semibold">Appointment status</h2>
          <p className="text-xs text-gray-500 mt-1 mb-5">All appointments in the system</p>

          <div className="h-2 flex overflow-hidden bg-gray-100 mb-5 rounded-full">
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
              {doctors.map((doctor) => {
                const displayName = getDoctorDisplayName(doctor, doctors);
                const barColor = doctorColorMap[doctor.doctor_id];
                return (
                  <tr key={doctor.doctor_id} className="text-sm hover:bg-gray-50/70">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2.5">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: barColor }} />
                        <div>
                          <p className="font-medium text-gray-900">{displayName}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {doctor.specialization} {doctor.nmc_number ? `• NMC: ${doctor.nmc_number}` : ""}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 tabular-nums">{doctor.scheduled_appointments}</td>
                    <td className="py-3 px-4 tabular-nums">{doctor.completed_appointments}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-1.5 bg-gray-100 overflow-hidden rounded-full">
                          <div className="h-full bg-green-600 rounded-full" style={{ width: `${doctor.progress_percent}%` }} />
                        </div>
                        <span className="text-xs text-gray-500 tabular-nums">{doctor.completed_appointments}/{doctor.progress_goal}</span>
                      </div>
                    </td>
                    <td className="py-3 pl-4 text-right font-medium tabular-nums">{formatNpr(doctor.earnings)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default AdminDashboard;

