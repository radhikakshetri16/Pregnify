import { useCallback, useEffect, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  Plus,
  Trash2,
  X,
  Lock,
  AlertCircle,
  Stethoscope,
  ChevronRight,
} from "lucide-react";
import CalendarPicker from "../components/CalendarPicker";
import { dateKey, formatDisplayDate, localDateKey } from "../utils/dates";

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000/api";
const appointmentTypes = [
  "Routine check-up",
  "Ultrasound",
  "Blood test",
  "Vaccination",
  "Specialist consultation",
  "Follow-up",
];

const blankForm = {
  doctor_id: "",
  doctor_name: "",
  clinic_name: "",
  appointment_date: "",
  appointment_time: "",
  appointment_type: "Routine check-up",
  reason: "",
  reminder_enabled: false,
};

async function readApiResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const body = await response.text();
    const isHtml = body.trim().startsWith("<");
    throw new Error(
      isHtml
        ? "The appointment service returned an HTML page instead of data. Please make sure the backend server is running."
        : `The appointment service returned an unexpected response (${response.status}).`
    );
  }
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      data.error || "The appointment request could not be completed."
    );
  return data;
}

function Appointments() {
  const user = JSON.parse(localStorage.getItem("user"));
  const userId = user?.id;
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [form, setForm] = useState(blankForm);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Doctor schedule & slot states
  const [doctorSchedule, setDoctorSchedule] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [slotMessage, setSlotMessage] = useState("");

  const today = localDateKey();

  // Load patient's appointments
  const loadAppointments = useCallback(async () => {
    if (!userId) {
      setError("You must be logged in to view appointments.");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await readApiResponse(
        await fetch(`${API_BASE}/appointments?user_id=${userId}`)
      );
      setAppointments(data.appointments || []);
    } catch (requestError) {
      setError(requestError.message || "Unable to load appointments.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Load available doctors
  const loadDoctors = useCallback(async () => {
    try {
      const data = await readApiResponse(await fetch(`${API_BASE}/doctors`));
      const activeDocs = (data.doctors || []).filter(
        (d) => d.status === "Active"
      );
      setDoctors(activeDocs);
    } catch (err) {
      console.error("Failed to load doctors", err);
    }
  }, []);

  useEffect(() => {
    loadAppointments();
    loadDoctors();
  }, [loadAppointments, loadDoctors]);

  // When selected doctor changes, fetch their schedule
  const handleDoctorChange = async (e) => {
    const docId = e.target.value;
    const selectedDoc = doctors.find((d) => String(d.doctor_id) === String(docId));

    if (!selectedDoc) {
      setForm((prev) => ({
        ...prev,
        doctor_id: "",
        doctor_name: "",
        clinic_name: "",
        appointment_date: "",
        appointment_time: "",
      }));
      setDoctorSchedule(null);
      setAvailableSlots([]);
      setSlotMessage("");
      setLoadingSchedule(false);
      return;
    }

    setForm((prev) => ({
      ...prev,
      doctor_id: selectedDoc.doctor_id,
      doctor_name: selectedDoc.name,
      clinic_name: selectedDoc.practice_at,
      appointment_date: "",
      appointment_time: "",
    }));
    setDoctorSchedule(null);
    setAvailableSlots([]);
    setSlotMessage("");
    setLoadingSchedule(true);

    try {
      const data = await readApiResponse(
        await fetch(`${API_BASE}/doctors/${selectedDoc.doctor_id}/schedule`)
      );
      const dateSchedules = (data.date_schedules || []).map((item) => ({
        available_date: dateKey(item.available_date),
        time_slots: item.time_slots || [],
      }));
      const availableDates = (
        data.available_dates?.length
          ? data.available_dates
          : dateSchedules.map((item) => item.available_date)
      )
        .map(dateKey)
        .filter(Boolean);
      setDoctorSchedule({
        ...data,
        date_schedules: dateSchedules,
        available_dates: availableDates,
      });
      const firstAvailableDate = availableDates[0] || "";
      setForm((prev) => ({
        ...prev,
        appointment_date: firstAvailableDate,
        appointment_time: "",
      }));
      if (!firstAvailableDate) {
        setSlotMessage(`Dr. ${selectedDoc.name} has no upcoming dates available.`);
      }
    } catch (err) {
      console.error("Failed to fetch doctor schedule", err);
      setDoctorSchedule({ available_dates: [], date_schedules: [] });
      setAvailableSlots([]);
      setSlotMessage(err.message || "Unable to load this doctor's schedule.");
    } finally {
      setLoadingSchedule(false);
    }
  };

  // Fetch available slots when appointment_date or doctor_id changes
  useEffect(() => {
    if (!form.doctor_id) {
      setAvailableSlots([]);
      setSlotMessage("");
      return;
    }
    if (!form.appointment_date) {
      setAvailableSlots([]);
      return;
    }

    let isMounted = true;
    const fetchSlots = async () => {
      setLoadingSlots(true);
      setSlotMessage("");

      try {
        const requestedDate = dateKey(form.appointment_date);
        const data = await readApiResponse(
          await fetch(
            `${API_BASE}/doctors/${form.doctor_id}/available-slots?date=${requestedDate}`
          )
        );

        if (!isMounted) return;

        if (!data.is_working_day) {
          setSlotMessage(
            data.message ||
              `Dr. ${form.doctor_name} is not available on this date.`
          );
          setAvailableSlots([]);
          setForm((prev) => ({ ...prev, appointment_time: "" }));
        } else {
          setAvailableSlots(data.slots || []);
          if (data.slots && data.slots.length === 0) {
            setSlotMessage("No available time slots found for this date.");
          }
        }
      } catch (err) {
        if (isMounted) {
          setSlotMessage(err.message || "Failed to load slots.");
        }
      } finally {
        if (isMounted) {
          setLoadingSlots(false);
        }
      }
    };

    fetchSlots();
    return () => {
      isMounted = false;
    };
  }, [form.doctor_id, form.appointment_date]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setForm(blankForm);
    setDoctorSchedule(null);
    setAvailableSlots([]);
    setSlotMessage("");
    setLoadingSchedule(false);
  };

  const handleCloseModal = () => {
    setSelected(null);
    setDeleteTarget(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!form.doctor_id) {
      setError("Please select a doctor.");
      return;
    }

    if (!form.appointment_date) {
      setError("Please pick an available date on the calendar.");
      return;
    }

    if (!form.appointment_time) {
      setError("Please select an open time slot.");
      return;
    }

    setSaving(true);
    try {
      await readApiResponse(
        await fetch(`${API_BASE}/appointments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, user_id: userId }),
        })
      );
      setNotice("Appointment booked successfully!");
      handleCloseForm();
      await loadAppointments();
      setTimeout(() => setNotice(""), 3500);
    } catch (saveError) {
      setError(saveError.message || "Unable to save appointment.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (target) => {
    if (!target) return;
    setDeleting(true);
    setError("");
    try {
      await readApiResponse(
        await fetch(
          `${API_BASE}/appointments/${target.appointment_id}?user_id=${userId}`,
          {
            method: "DELETE",
          }
        )
      );
       setNotice("Appointment deleted successfully.");
      handleCloseModal();
      await loadAppointments();
      setTimeout(() => setNotice(""), 3500);
    } catch (deleteError) {
      setError(deleteError.message || "Unable to delete appointment.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Page Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-800">
            Appointments
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Book and track your prenatal check-ups with verified doctors.
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setError("");
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-pink-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-pink-700 transition cursor-pointer self-start sm:self-auto"
        >
          <Plus size={18} /> Book Appointment
        </button>
      </header>

      {/* Notifications */}
      {notice && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
          <span>{notice}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={18} className="shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* BOOK APPOINTMENT MODAL (BLUR BACKGROUND POPUP) */}
      {/* ========================================================= */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl max-h-[92vh] overflow-y-auto border border-gray-100">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <CalendarDays className="text-pink-600" size={22} />
                  Book Doctor Appointment
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Pick your doctor, choose an available date, and reserve an open time slot.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseForm}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

             <form onSubmit={handleSubmit} className="space-y-5">
              {/* Doctor Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Select Doctor *
                </label>
                <select
                  name="doctor_id"
                  value={form.doctor_id}
                  onChange={handleDoctorChange}
                  required
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100 bg-white"
                >
                  <option value="">-- Choose a Registered Doctor --</option>
                  {doctors.map((doc) => (
                    <option key={doc.doctor_id} value={doc.doctor_id}>
                      Dr. {doc.name} • {doc.specialization} ({doc.practice_at}) — NPR {doc.consultation_fee}
                    </option>
                  ))}
                </select>
              </div>

              {/* Interactive Calendar & Slots Layout */}
              {form.doctor_id ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-2">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                      1. Pick Available Date *
                    </label>
                    {loadingSchedule ? (
                      <div className="h-80 rounded-2xl border border-gray-200 bg-gray-50 animate-pulse" />
                    ) : (
                      <CalendarPicker
                        key={form.doctor_id}
                        selectedDate={form.appointment_date}
                        onSelectDate={(dateStr) =>
                          setForm((prev) => ({
                            ...prev,
                            appointment_date: dateKey(dateStr),
                            appointment_time: "",
                          }))
                        }
                        availableDates={doctorSchedule?.available_dates || []}
                        highlightedDates={doctorSchedule?.available_dates || []}
                        badgeMap={(doctorSchedule?.date_schedules || []).reduce((map, item) => {
                          const key = dateKey(item.available_date);
                          if (key) map[key] = item.time_slots?.length || 0;
                          return map;
                        }, {})}
                        minDate={today}
                        subtitle="Pink dates are open for this doctor"
                        availableLabel="Available Date"
                      />
                    )}
                  </div>

                  {/* Right: Available Slots */}
                  <div className="flex flex-col justify-between">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                        2. Select Time Slot *
                      </label>

                      {!form.appointment_date ? (
                        <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-8 text-center text-xs text-gray-400">
                          <CalendarDays className="mx-auto text-gray-300 mb-2" size={28} />
                          Please click an available date on the calendar.
                        </div>
                      ) : loadingSlots ? (
                        <div className="bg-gray-50 rounded-2xl p-8 text-center text-xs text-gray-500 animate-pulse">
                          Loading open slots for {form.appointment_date}...
                        </div>
                      ) : availableSlots.length === 0 ? (
                        <div className="bg-gray-50 border border-red-100 rounded-2xl p-6 text-center text-xs text-red-600">
                          {slotMessage || "No open slots on this date."}
                        </div>
                      ) : (
                        <div>
                          <p className="text-xs text-gray-500 mb-2">
                            Date selected: <strong className="text-gray-800">{form.appointment_date}</strong>
                          </p>
                          <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                            {availableSlots.map((slot) => {
                              const isSelected = form.appointment_time === slot.time;
                              const isAvailable = slot.is_available;

                              if (!isAvailable) {
                                return (
                                  <div
                                    key={slot.time}
                                    className="flex items-center justify-center gap-1 py-2 px-2 rounded-xl bg-gray-100 text-gray-400 text-xs font-medium cursor-not-allowed select-none border border-transparent"
                                    title="Slot already booked"
                                  >
                                    <Lock size={11} className="text-gray-400 shrink-0" />
                                    <span className="line-through">{slot.time}</span>
                                  </div>
                                );
                              }

                              return (
                                <button
                                  key={slot.time}
                                  type="button"
                                  onClick={() =>
                                    setForm((prev) => ({
                                      ...prev,
                                      appointment_time: slot.time,
                                    }))
                                  }
                                  className={`py-2 px-2 rounded-xl text-xs font-semibold transition cursor-pointer text-center ${
                                    isSelected
                                      ? "bg-pink-600 text-white shadow-xs ring-2 ring-pink-300"
                                      : "bg-white text-gray-700 border border-gray-200 hover:bg-pink-50 hover:border-pink-300"
                                  }`}
                                >
                                  {slot.time}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Appointment Type */}
                    <div className="mt-4">
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                        Appointment Type *
                      </label>
                      <select
                        name="appointment_type"
                        value={form.appointment_type}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100 bg-white"
                      >
                        {appointmentTypes.map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-8 text-center text-xs text-gray-400">
                  <Stethoscope className="mx-auto text-gray-300 mb-2" size={32} />
                  Please choose a doctor above to load their available calendar schedule.
                </div>
              )}

              {/* Reason / Notes */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Reason / Notes (Optional)
                </label>
                <input
                  type="text"
                  name="reason"
                  value={form.reason}
                  onChange={handleChange}
                  placeholder="e.g. Routine 20-week scan, blood pressure check..."
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100"
                />
              </div>

              {/* Reminder toggle */}
              <div className="flex items-center">
                <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-gray-700 font-medium">
                  <input
                    type="checkbox"
                    name="reminder_enabled"
                    checked={form.reminder_enabled}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500 cursor-pointer"
                  />
                  <span>Enable appointment notification reminder</span>
                </label>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !form.appointment_date || !form.appointment_time}
                  className="px-6 py-2.5 bg-pink-600 text-white text-sm font-semibold rounded-xl hover:bg-pink-700 disabled:opacity-50 transition cursor-pointer shadow-xs"
                >
                  {saving ? "Booking..." : "Confirm Booking"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MINIMAL & CLEAN APPOINTMENTS LIST */}
      {/* ========================================================= */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-white rounded-2xl border border-gray-100 animate-pulse p-4" />
          ))}
        </div>
      ) : appointments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-14 text-center">
          <CalendarDays className="mx-auto text-pink-300 mb-2" size={36} />
          <h3 className="font-semibold text-gray-700 text-sm">No Appointments Scheduled</h3>
          <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
            Click &quot;Book Appointment&quot; above to select a doctor and reserve a time slot.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {appointments.map((apt) => {
            const isCompleted = apt.status === "Completed";
            const isCancelled = apt.status === "Cancelled";

            return (
              <div
                key={apt.appointment_id}
                className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-2xs hover:shadow-sm transition hover:border-pink-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="text-[11px] font-bold text-pink-600 bg-pink-50 px-2 py-0.5 rounded-md uppercase tracking-wider">
                      {apt.appointment_type}
                    </span>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isCompleted
                          ? "bg-emerald-50 text-emerald-700"
                          : isCancelled
                          ? "bg-gray-100 text-gray-500"
                          : "bg-pink-50 text-pink-700"
                      }`}
                    >
                      {apt.status}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-gray-800 truncate">
                    {apt.doctor_name || "Doctor Appointment"}
                  </h3>

                  <div className="mt-2 space-y-1 text-xs text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <CalendarDays size={13} className="text-pink-500 shrink-0" />
                      <span>{apt.appointment_date}</span>
                      <span className="text-gray-300">•</span>
                      <Clock3 size={13} className="text-pink-500 shrink-0" />
                      <span>{apt.appointment_time || "Time not set"}</span>
                    </div>

                    {apt.clinic_name && (
                      <div className="flex items-center gap-1.5 truncate">
                        <MapPin size={13} className="text-gray-400 shrink-0" />
                        <span className="truncate">{apt.clinic_name}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setSelected(apt)}
                    className="text-xs font-semibold text-pink-600 hover:text-pink-700 flex items-center gap-1 cursor-pointer"
                  >
                    View Details <ChevronRight size={13} />
                  </button>

                   <button
                     type="button"
                     onClick={() => setDeleteTarget(apt)}
                     className="p-1 text-gray-400 hover:text-red-500 rounded-lg transition cursor-pointer"
                     title="Delete appointment"
                   >
                     <Trash2 size={14} />
                   </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================= */}
      {/* MINIMAL APPOINTMENT DETAIL MODAL */}
      {/* ========================================================= */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-md p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-800">
                Appointment Details
              </h3>
              <button
                type="button"
                onClick={handleCloseModal}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between gap-4 py-1 border-b border-gray-50">
                <span className="text-gray-400">Doctor:</span>
                <span className="font-semibold text-gray-800 text-right">{selected.doctor_name || "N/A"}</span>
              </div>
              <div className="flex justify-between gap-4 py-1 border-b border-gray-50">
                <span className="text-gray-400">Location:</span>
                <span className="font-semibold text-gray-800 text-right">{selected.clinic_name || "N/A"}</span>
              </div>
              <div className="flex justify-between gap-4 py-1 border-b border-gray-50">
                <span className="text-gray-400">Date & Time:</span>
                <span className="font-semibold text-gray-800 text-right">
                  {selected.appointment_date} at {selected.appointment_time}
                </span>
              </div>
              <div className="flex justify-between gap-4 py-1 border-b border-gray-50">
                <span className="text-gray-400">Type:</span>
                <span className="font-semibold text-pink-700 bg-pink-50 px-2 py-0.5 rounded-md text-right">
                  {selected.appointment_type}
                </span>
              </div>
              <div className="flex justify-between gap-4 py-1 border-b border-gray-50">
                <span className="text-gray-400">Status:</span>
                <span className="font-semibold text-gray-800 text-right">{selected.status}</span>
              </div>
              <div className="flex justify-between gap-4 py-1 border-b border-gray-50">
                <span className="text-gray-400">Reminder:</span>
                <span className="font-semibold text-gray-800 text-right">
                  {selected.reminder_enabled ? "Enabled" : "Off"}
                </span>
              </div>
              {selected.reason && (
                <div className="py-1 border-b border-gray-50">
                  <span className="text-gray-400 block mb-1">Reason:</span>
                  <p className="text-gray-700 bg-gray-50 p-2 rounded-xl">{selected.reason}</p>
                </div>
              )}
              {selected.questions && (
                <div className="py-1 border-b border-gray-50">
                  <span className="text-gray-400 block mb-1">Notes / questions:</span>
                  <p className="text-gray-700 bg-gray-50 p-2 rounded-xl">{selected.questions}</p>
                </div>
              )}
              {selected.follow_up_date && (
                <div className="flex justify-between gap-4 py-1 border-b border-gray-50">
                  <span className="text-gray-400">Follow-up date:</span>
                  <span className="font-semibold text-gray-800 text-right">{selected.follow_up_date}</span>
                </div>
              )}
              {selected.doctor_notes && (
                <div className="py-1 border-b border-gray-50">
                  <span className="text-gray-400 block mb-1">Doctor&apos;s notes:</span>
                  <p className="text-gray-700 bg-gray-50 p-2 rounded-xl">{selected.doctor_notes}</p>
                </div>
              )}
              {selected.diagnosis && (
                <div className="py-1 border-b border-gray-50">
                  <span className="text-gray-400 block mb-1">Diagnosis:</span>
                  <p className="text-gray-700 bg-gray-50 p-2 rounded-xl">{selected.diagnosis}</p>
                </div>
              )}
              {selected.tests_recommended && (
                <div className="py-1 border-b border-gray-50">
                  <span className="text-gray-400 block mb-1">Tests recommended:</span>
                  <p className="text-gray-700 bg-gray-50 p-2 rounded-xl">{selected.tests_recommended}</p>
                </div>
              )}
              {selected.next_appointment && (
                <div className="flex justify-between gap-4 py-1">
                  <span className="text-gray-400">Next appointment:</span>
                  <span className="font-semibold text-gray-800 text-right">{selected.next_appointment}</span>
                </div>
              )}
            </div>

            <div className="mt-6 pt-3 border-t border-gray-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setDeleteTarget(selected);
                  setSelected(null);
                }}
                className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer"
              >
                <Trash2 size={13} /> Delete Appointment
              </button>
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-200 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-md p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-gray-100">
            <h3 className="text-base font-bold text-gray-800">
              Delete Appointment?
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-gray-600">
              Are you sure you want to delete this appointment with {deleteTarget.doctor_name || "the selected doctor"}? The reserved time slot will be released back to other patients.
            </p>
            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="rounded-xl border border-gray-200 px-3.5 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition cursor-pointer"
              >
                Keep
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteTarget)}
                disabled={deleting}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 transition cursor-pointer"
              >
                {deleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Appointments;
