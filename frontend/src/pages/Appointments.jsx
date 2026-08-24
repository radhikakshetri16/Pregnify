import { useState } from "react";
import { usePregnancy } from "../context/PregnancyContext";

function Appointments() {
  const { profile, saveProfile } = usePregnancy();

  const [doctorName, setDoctorName] = useState(profile.doctorName || "Dr. Sharma");
  const [appointmentDate, setAppointmentDate] = useState(profile.appointmentDate || "2026-08-25");
  const [appointmentTime, setAppointmentTime] = useState(profile.appointmentTime || "10:00 AM");
  const [appointmentType, setAppointmentType] = useState(profile.appointmentType || "Regular ANC Checkup");
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    saveProfile({
      doctorName,
      appointmentDate,
      appointmentTime,
      appointmentType,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">
          Antenatal Appointments
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Schedule and manage doctor consultations and clinical follow-ups.
        </p>
      </div>

      {/* Active Scheduled Appointment */}
      <div className="bg-white rounded-xl p-6 border border-zinc-200">
        <h2 className="text-base font-semibold text-zinc-900 mb-2">
          Upcoming Scheduled Appointment
        </h2>
        <div className="p-4 rounded-lg bg-zinc-50 border border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
              Consultation Date & Time
            </span>
            <p className="text-lg font-bold text-zinc-900 mt-0.5">
              {profile.appointmentDate || "Not set"} at {profile.appointmentTime || "10:00 AM"}
            </p>
            <p className="text-xs text-zinc-600 mt-1">
              Physician: <strong>{profile.doctorName || "Dr. Sharma"}</strong> · {profile.appointmentType || "Regular ANC Checkup"}
            </p>
          </div>
          <span className="self-start sm:self-auto px-3 py-1 bg-zinc-200 text-zinc-800 text-xs font-medium rounded-full">
            Confirmed
          </span>
        </div>
      </div>

      {/* Schedule / Edit Form */}
      <div className="bg-white rounded-xl p-6 border border-zinc-200">
        <h2 className="text-base font-semibold text-zinc-900 mb-4">
          Update / Reschedule Appointment
        </h2>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1.5">
                Doctor / Clinic Name
              </label>
              <input
                type="text"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                required
                className="w-full border border-zinc-300 rounded-lg px-3.5 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1.5">
                Appointment Type
              </label>
              <input
                type="text"
                value={appointmentType}
                onChange={(e) => setAppointmentType(e.target.value)}
                placeholder="Regular ANC Checkup, Ultrasound, Blood Test"
                className="w-full border border-zinc-300 rounded-lg px-3.5 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1.5">
                Date
              </label>
              <input
                type="date"
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
                required
                className="w-full border border-zinc-300 rounded-lg px-3.5 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1.5">
                Time
              </label>
              <input
                type="text"
                value={appointmentTime}
                onChange={(e) => setAppointmentTime(e.target.value)}
                placeholder="10:00 AM"
                required
                className="w-full border border-zinc-300 rounded-lg px-3.5 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 pt-2">
            <button
              type="submit"
              className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-sm font-medium transition"
            >
              Save Appointment
            </button>

            {saved && (
              <span className="text-xs text-green-600 font-medium">
                Appointment updated and synced to dashboard.
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export default Appointments;