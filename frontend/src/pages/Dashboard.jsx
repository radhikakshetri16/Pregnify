import { useAuth } from "../context/AuthContext";
import { usePregnancy } from "../context/PregnancyContext";
import { Link } from "react-router-dom";
import { CalendarDays, HeartPulse, Baby, Clock, Activity, Scale, Droplet } from "lucide-react";

function Dashboard() {
  const { user } = useAuth();
  const { profile, gestationalInfo, bmi } = usePregnancy();

  const userName = user?.firstName || user?.fullName || "User";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-zinc-200">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">
            Welcome back, {userName}
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Current status: {gestationalInfo.trimester} ({gestationalInfo.weeks} weeks and {gestationalInfo.days} days).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/info"
            className="px-4 py-2 text-xs font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition"
          >
            Edit Profile & Vitals
          </Link>
          <Link
            to="/health"
            className="px-4 py-2 text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg transition"
          >
            Log Health
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pregnancy Week */}
        <div className="bg-white rounded-xl p-5 border border-zinc-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Gestational Age
              </p>
              <h2 className="text-2xl font-bold text-zinc-900 mt-2">
                {gestationalInfo.weeks} Weeks {gestationalInfo.days > 0 ? `${gestationalInfo.days} Days` : ""}
              </h2>
              <p className="text-xs text-zinc-500 mt-1">
                {gestationalInfo.totalDays} days elapsed
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-700">
              <Baby size={20} />
            </div>
          </div>
        </div>

        {/* Expected Due Date */}
        <div className="bg-white rounded-xl p-5 border border-zinc-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Expected Due Date
              </p>
              <h2 className="text-2xl font-bold text-zinc-900 mt-2">
                {gestationalInfo.dueDateFormatted}
              </h2>
              <p className="text-xs text-zinc-500 mt-1">
                {gestationalInfo.daysRemaining > 0
                  ? `${gestationalInfo.daysRemaining} days remaining`
                  : "Estimated date reached"}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-700">
              <CalendarDays size={20} />
            </div>
          </div>
        </div>

        {/* Trimester */}
        <div className="bg-white rounded-xl p-5 border border-zinc-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Current Trimester
              </p>
              <h2 className="text-2xl font-bold text-zinc-900 mt-2">
                {gestationalInfo.trimester}
              </h2>
              <p className="text-xs text-zinc-500 mt-1">
                Type: {profile.pregnancyType || "Single"}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-700">
              <HeartPulse size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Progress and Appointment Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Progress Card */}
        <div className="bg-white rounded-xl p-5 border border-zinc-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-zinc-900">Pregnancy Progress</h3>
              <span className="text-xs font-semibold text-zinc-700">
                {gestationalInfo.progressPercent}%
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Calculated from LMP date ({profile.lmpDate || "Not set"}).
            </p>
          </div>

          <div className="my-5">
            <div className="w-full h-2.5 bg-zinc-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-zinc-900 rounded-full transition-all duration-300"
                style={{ width: `${gestationalInfo.progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-zinc-400 mt-2 font-medium">
              <span>Week 1</span>
              <span>Week 20</span>
              <span>Week 40</span>
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
            <span>Blood Group: <strong className="text-zinc-800">{profile.bloodGroup || "O+"}</strong></span>
            <span>Height: <strong className="text-zinc-800">{profile.height ? `${profile.height} cm` : "Not set"}</strong></span>
          </div>
        </div>

        {/* Appointment Card */}
        <div className="bg-white rounded-xl p-5 border border-zinc-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-zinc-900">Next Appointment</h3>
              <Clock size={16} className="text-zinc-400" />
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Scheduled clinical consultation.
            </p>
          </div>

          <div className="my-4 p-4 rounded-lg bg-zinc-50 border border-zinc-100">
            <h4 className="font-semibold text-zinc-900 text-base">
              {profile.appointmentDate || "No date scheduled"}
            </h4>
            <p className="text-xs text-zinc-600 mt-0.5">
              {profile.appointmentTime || "10:00 AM"} · {profile.doctorName || "Dr. Sharma"}
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              {profile.appointmentType || "Regular ANC Checkup"}
            </p>
          </div>

          <Link
            to="/appointments"
            className="w-full text-center py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg text-xs font-medium transition"
          >
            Manage Appointments
          </Link>
        </div>
      </div>

      {/* Vitals Overview */}
      <div className="bg-white rounded-xl p-6 border border-zinc-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm text-zinc-900">Latest Recorded Vitals</h3>
          <Link to="/health" className="text-xs font-medium text-zinc-600 hover:text-zinc-900">
            View Health Logs
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-zinc-50 border border-zinc-100">
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>Weight</span>
              <Scale size={16} />
            </div>
            <p className="text-xl font-bold text-zinc-900 mt-1.5">
              {profile.weight ? `${profile.weight} kg` : "--"}
            </p>
          </div>

          <div className="p-4 rounded-lg bg-zinc-50 border border-zinc-100">
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>Blood Pressure</span>
              <HeartPulse size={16} />
            </div>
            <p className="text-xl font-bold text-zinc-900 mt-1.5">
              {profile.bloodPressure || "--"}
            </p>
            <span className="text-[11px] text-zinc-400">mmHg</span>
          </div>

          <div className="p-4 rounded-lg bg-zinc-50 border border-zinc-100">
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>Heart Rate</span>
              <Activity size={16} />
            </div>
            <p className="text-xl font-bold text-zinc-900 mt-1.5">
              {profile.heartRate ? `${profile.heartRate} bpm` : "--"}
            </p>
          </div>

          <div className="p-4 rounded-lg bg-zinc-50 border border-zinc-100">
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>Body Mass Index</span>
              <Droplet size={16} />
            </div>
            <p className="text-xl font-bold text-zinc-900 mt-1.5">
              {bmi || "--"}
            </p>
            <span className="text-[11px] text-zinc-400">BMI</span>
          </div>
        </div>

        {profile.symptoms && (
          <div className="mt-4 p-3 rounded-lg bg-zinc-50 border border-zinc-100 text-xs text-zinc-700">
            <strong className="text-zinc-900">Logged Symptoms:</strong> {profile.symptoms} {profile.notes && `· ${profile.notes}`}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;