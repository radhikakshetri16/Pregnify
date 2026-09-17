import { useEffect, useState, useMemo } from "react";
import { Search, X } from "lucide-react";

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
 * If multiple doctors share the exact same name, appends NMC number or specialization to distinguish them.
 */
const getDoctorDisplayName = (doctor, allDoctors) => {
  if (!doctor) return "";
  const nameTrimmed = (doctor.name || "").trim().toLowerCase();
  const sameNameDoctors = allDoctors.filter(
    (d) => (d.name || "").trim().toLowerCase() === nameTrimmed
  );

  if (sameNameDoctors.length > 1) {
    if (doctor.nmc_number) {
      return `Dr. ${doctor.name} (NMC: ${doctor.nmc_number})`;
    }
    if (doctor.specialization) {
      return `Dr. ${doctor.name} (${doctor.specialization})`;
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
  const [searchTerm, setSearchTerm] = useState("");

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

  // Total scheduled appointments across all doctors in the system
  const totalScheduled = useMemo(() => {
    return doctors.reduce((sum, doctor) => sum + (Number(doctor.scheduled_appointments) || 0), 0);
  }, [doctors]);

  const totalEarnings = useMemo(() => {
    return doctors.reduce((sum, doctor) => sum + Number(doctor.earnings || 0), 0);
  }, [doctors]);

  // Compute percentage of scheduled appointments for each doctor
  const doctorsWithPerformance = useMemo(() => {
    return doctors.map((doctor) => {
      const scheduled = Number(doctor.scheduled_appointments) || 0;
      const perfPct =
        doctor.performance_percentage !== undefined
          ? Number(doctor.performance_percentage)
          : totalScheduled > 0
          ? Number(((scheduled / totalScheduled) * 100).toFixed(1))
          : 0;
      return {
        ...doctor,
        scheduled_appointments: scheduled,
        performance_percentage: perfPct,
      };
    });
  }, [doctors, totalScheduled]);

  // Sort doctors by performance percentage descending
  const sortedDoctors = useMemo(() => {
    return [...doctorsWithPerformance].sort((a, b) => {
      if (b.performance_percentage !== a.performance_percentage) {
        return b.performance_percentage - a.performance_percentage;
      }
      if (b.scheduled_appointments !== a.scheduled_appointments) {
        return b.scheduled_appointments - a.scheduled_appointments;
      }
      if (b.completed_appointments !== a.completed_appointments) {
        return b.completed_appointments - a.completed_appointments;
      }
      return (a.name || "").localeCompare(b.name || "");
    });
  }, [doctorsWithPerformance]);

  // Default view: Top 5 performing doctors
  const top5Doctors = useMemo(() => {
    return sortedDoctors.slice(0, 5);
  }, [sortedDoctors]);

  // Dynamically filtered doctors based on search query
  const displayedDoctors = useMemo(() => {
    const trimmed = searchTerm.trim().toLowerCase();
    if (!trimmed) {
      return top5Doctors;
    }
    return sortedDoctors.filter((doctor) => {
      const nameMatch = (doctor.name || "").toLowerCase().includes(trimmed);
      const nmcMatch = (doctor.nmc_number || "").toLowerCase().includes(trimmed);
      return nameMatch || nmcMatch;
    });
  }, [searchTerm, top5Doctors, sortedDoctors]);

  if (loading) {
    return <div className="min-h-[50vh] flex items-center justify-center text-sm text-gray-500">Loading dashboard...</div>;
  }

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
          {/* Section Header: Title & Doctor Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold">Doctor performance</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-pink-50 text-pink-700 font-medium border border-pink-100">
                  {searchTerm.trim() ? "Search results" : "Top 5"}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {searchTerm.trim()
                  ? `Found ${displayedDoctors.length} matching doctor${displayedDoctors.length === 1 ? "" : "s"}`
                  : "Top 5 performing doctors by % of scheduled appointments"}
              </p>
            </div>

            {/* Doctor Search Bar */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search doctor by name..."
                className="w-full pl-9 pr-8 py-1.5 text-xs sm:text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-pink-500 bg-white placeholder-gray-400 transition shadow-2xs"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Horizontal Bar Chart Container */}
          <div className="bg-gray-50/60 p-4 rounded-xl border border-gray-100 mb-5">
            {doctors.length === 0 ? (
              <p className="text-sm text-gray-400 py-8 text-center">No doctor performance data available.</p>
            ) : displayedDoctors.length === 0 ? (
              <div className="py-10 text-center px-4">
                <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                  <Search className="w-5 h-5" />
                </div>
                <p className="text-sm font-medium text-gray-700">No doctor found</p>
                <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                  No doctor matching &ldquo;{searchTerm}&rdquo;. Try searching by another name or NMC number.
                </p>
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="mt-3 text-xs font-medium text-pink-600 hover:text-pink-700 underline cursor-pointer"
                >
                  Clear search and show Top 5
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Scale guidelines */}
                <div className="flex justify-between text-[11px] text-gray-400 border-b border-gray-200 pb-1.5 px-1">
                  <span>0%</span>
                  <span>25%</span>
                  <span>50%</span>
                  <span>75%</span>
                  <span>100%</span>
                </div>

                {/* Horizontal Bars Container */}
                <div className="space-y-2.5">
                  {displayedDoctors.map((doctor) => {
                    const barColor = doctorColorMap[doctor.doctor_id] || DOCTOR_COLORS[0];
                    const displayName = getDoctorDisplayName(doctor, doctors);

                    return (
                      <div
                        key={doctor.doctor_id}
                        className="group relative rounded-lg p-2.5 bg-white/70 hover:bg-white hover:shadow-xs transition-all border border-gray-100/80"
                      >
                        {/* Hover Tooltip */}
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:flex flex-col items-center z-30 w-60 pointer-events-none">
                          <div className="bg-gray-900 text-white text-xs rounded-lg p-3 shadow-xl w-full space-y-1.5">
                            <div className="flex items-center justify-between gap-2 border-b border-gray-700 pb-1.5">
                              <p className="font-semibold text-white truncate">{displayName}</p>
                              {doctor.nmc_number && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 font-mono">
                                  NMC: {doctor.nmc_number}
                                </span>
                              )}
                            </div>
                            {doctor.specialization && (
                              <p className="text-[11px] text-gray-300">{doctor.specialization}</p>
                            )}
                            <div className="pt-1 flex justify-between text-[11px]">
                              <span className="text-gray-400">Scheduled:</span>
                              <span className="font-semibold text-emerald-400">
                                {doctor.scheduled_appointments} ({doctor.performance_percentage}%)
                              </span>
                            </div>
                            <div className="flex justify-between text-[11px]">
                              <span className="text-gray-400">Completed:</span>
                              <span className="font-semibold text-blue-300">{doctor.completed_appointments}</span>
                            </div>
                            <div className="flex justify-between text-[11px]">
                              <span className="text-gray-400">Earnings:</span>
                              <span className="font-semibold text-amber-300">{formatNpr(doctor.earnings)}</span>
                            </div>
                          </div>
                          <div className="w-2 h-2 bg-gray-900 rotate-45 -mt-1"></div>
                        </div>

                        {/* Doctor Row Info */}
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="h-2.5 w-2.5 rounded-full shrink-0 shadow-xs"
                              style={{ backgroundColor: barColor }}
                            />
                            <span className="text-sm font-medium text-gray-900 truncate">
                              Dr. {doctor.name}
                            </span>
                            {doctor.nmc_number && (
                              <span className="text-[11px] font-mono font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200 shrink-0">
                                NMC: {doctor.nmc_number}
                              </span>
                            )}
                            {doctor.specialization && (
                              <span className="text-xs text-gray-400 hidden sm:inline truncate">
                                • {doctor.specialization}
                              </span>
                            )}
                          </div>

                          {/* Performance Percentage & Appts count */}
                          <div className="flex items-baseline gap-1.5 shrink-0 tabular-nums">
                            <span className="text-sm font-semibold text-gray-900">
                              {doctor.performance_percentage}%
                            </span>
                            <span className="text-xs text-gray-400">
                              ({doctor.scheduled_appointments} {doctor.scheduled_appointments === 1 ? "appt" : "appts"})
                            </span>
                          </div>
                        </div>

                        {/* Horizontal Bar Track */}
                        <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden flex items-center">
                          <div
                            className="h-full rounded-full transition-all duration-500 ease-out group-hover:brightness-110 shadow-xs"
                            style={{
                              width:
                                doctor.performance_percentage > 0
                                  ? `${Math.max(doctor.performance_percentage, 2.5)}%`
                                  : "0%",
                              backgroundColor: barColor,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer summary inside chart container */}
                <div className="flex items-center justify-between text-[11px] text-gray-400 pt-2 border-t border-gray-100">
                  <span>
                    {searchTerm.trim()
                      ? `Showing ${displayedDoctors.length} of ${doctors.length} doctors`
                      : `Showing Top 5 of ${doctors.length} doctors`}
                  </span>
                  <span className="tabular-nums font-medium text-gray-600">
                    {totalScheduled} total scheduled appointments
                  </span>
                </div>
              </div>
            )}
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

