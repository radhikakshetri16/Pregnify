import { useCallback, useEffect, useState } from "react";
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  MapPin,
  Plus,
  Trash2,
  UserRound,
  X,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "/api";
const appointmentTypes = ["Routine check-up", "Ultrasound", "Blood test", "Vaccination", "Specialist consultation", "Follow-up"];
const blankForm = { appointment_date: "", appointment_time: "", doctor_name: "", clinic_name: "", appointment_type: "Routine check-up", reason: "", reminder_enabled: false };

async function readApiResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const body = await response.text();
    const isHtml = body.trim().startsWith("<");
    throw new Error(isHtml ? "The appointment service returned an HTML page instead of data. Please make sure the backend server is running." : `The appointment service returned an unexpected response (${response.status}).`);
  }
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "The appointment request could not be completed.");
  return data;
}

function Appointments() {
  const user = JSON.parse(localStorage.getItem("user"));
  const userId = user?.id;
  const [appointments, setAppointments] = useState([]);
  const [form, setForm] = useState(blankForm);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isClosing, setIsClosing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const today = new Date().toISOString().slice(0, 10);

  const loadAppointments = useCallback(async () => {
    if (!userId) {
      setError("You must be logged in to view appointments.");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await readApiResponse(await fetch(`${API_BASE}/appointments?user_id=${userId}`));
      setAppointments(data.appointments || []);
    } catch (requestError) {
      setError(requestError.message || "Unable to load appointments.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    const request = window.setTimeout(() => { loadAppointments(); }, 0);
    return () => window.clearTimeout(request);
  }, [loadAppointments]);
  useEffect(() => {
    if (!notice) return undefined;
    const timeout = window.setTimeout(() => setNotice(""), 3500);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const handleChange = (event) => {
    const { name, value, checked, type } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  };

  const openDetails = (appointment) => {
    setDeleteTarget(null);
    setIsClosing(false);
    setSelected(appointment);
  };

  const closeDetails = () => {
    setIsClosing(true);
    window.setTimeout(() => {
      setSelected(null);
      setDeleteTarget(null);
      setIsClosing(false);
    }, 180);
  };

  const saveAppointment = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await readApiResponse(await fetch(`${API_BASE}/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, user_id: user.id }),
      }));
      setForm(blankForm);
      setShowForm(false);
      setNotice("Appointment saved successfully.");
      await loadAppointments();
    } catch (requestError) {
      setError(requestError.message || "Unable to save appointment.");
    } finally {
      setSaving(false);
    }
  };

  const deleteAppointment = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError("");
    try {
      await readApiResponse(await fetch(`${API_BASE}/appointments/${deleteTarget.appointment_id}?user_id=${user.id}`, { method: "DELETE" }));
      setAppointments((current) => current.filter((appointment) => appointment.appointment_id !== deleteTarget.appointment_id));
      setNotice("Appointment deleted successfully.");
      closeDetails();
    } catch (requestError) {
      setError(requestError.message || "Unable to delete appointment.");
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return <div className="max-w-6xl mx-auto pb-10">
    <div className="mb-8 flex items-start justify-between gap-4">
      <div><h1 className="text-3xl font-bold text-gray-800">Appointments</h1><p className="mt-2 text-gray-500">Manage your pregnancy care visits in one place.</p></div>
      <button onClick={() => { setError(""); setShowForm(true); }} className="ml-auto inline-flex shrink-0 items-center gap-2 rounded-lg bg-pink-600 px-4 py-3 font-medium text-white transition hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-300"><Plus size={18} /> Add appointment</button>
    </div>

    {showForm && <AppointmentForm form={form} today={today} saving={saving} onChange={handleChange} onClose={() => setShowForm(false)} onSubmit={saveAppointment} />}
    {notice && <div role="status" className="mb-5 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"><CheckCircle2 size={17} />{notice}</div>}
    {error && <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><div className="flex items-start justify-between gap-3"><span>{error}</span><button onClick={() => setError("")} className="text-red-500 hover:text-red-700"><X size={17} /></button></div></div>}

    {loading ? <LoadingState /> : appointments.length === 0 ? <EmptyState onAdd={() => setShowForm(true)} /> : <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{appointments.map((appointment) => <AppointmentCard key={appointment.appointment_id} appointment={appointment} onView={() => openDetails(appointment)} />)}</div>}
    {selected && <AppointmentModal appointment={selected} isClosing={isClosing} deleteTarget={deleteTarget} deleting={deleting} onClose={closeDetails} onRequestDelete={() => setDeleteTarget(selected)} onKeep={() => setDeleteTarget(null)} onDelete={deleteAppointment} />}
  </div>;
}

function AppointmentForm({ form, today, saving, onChange, onClose, onSubmit }) {
  return <form onSubmit={onSubmit} className="mb-7 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"><div className="mb-6 flex items-start justify-between gap-4"><div><h2 className="text-lg font-semibold text-gray-800">New appointment</h2><p className="mt-1 text-sm text-gray-500">Add the essential details for your visit.</p></div><button type="button" onClick={onClose} aria-label="Close form" className="rounded-lg p-1 text-gray-400 transition hover:bg-gray-50 hover:text-gray-700"><X size={20} /></button></div><div className="grid grid-cols-1 gap-5 md:grid-cols-2"><Field label="Appointment date" name="appointment_date" type="date" min={today} required form={form} onChange={onChange}/><Field label="Appointment time" name="appointment_time" type="time" required form={form} onChange={onChange}/><Field label="Doctor name" name="doctor_name" placeholder="Dr. Name" form={form} onChange={onChange}/><Field label="Hospital or clinic" name="clinic_name" placeholder="Hospital / clinic name" form={form} onChange={onChange}/><SelectField label="Appointment type" name="appointment_type" options={appointmentTypes} form={form} onChange={onChange}/><Field label="Reason (optional)" name="reason" placeholder="e.g. Regular prenatal check-up" form={form} onChange={onChange}/></div><label className="mt-5 inline-flex items-center gap-2 text-sm text-gray-600"><input type="checkbox" name="reminder_enabled" checked={form.reminder_enabled} onChange={onChange} className="accent-pink-600"/><Bell size={16} className="text-pink-600"/> Enable reminder</label><div className="mt-6 flex gap-3"><button disabled={saving} className="rounded-lg bg-pink-600 px-5 py-2.5 font-medium text-white transition hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-60">{saving ? "Saving..." : "Save appointment"}</button><button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-5 py-2.5 text-gray-600 transition hover:bg-gray-50">Cancel</button></div></form>;
}

function AppointmentCard({ appointment, onView }) {
  const date = new Date(`${appointment.appointment_date}T00:00:00`);
  const isCompleted = appointment.status === "Completed";
  const isCancelled = appointment.status === "Cancelled";
  const statusClass = isCompleted ? "bg-green-50 text-green-700" : isCancelled ? "bg-gray-100 text-gray-600" : "bg-pink-50 text-pink-700";
  return <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-pink-200 hover:shadow-md"><div className="flex items-start justify-between gap-3"><div className="rounded-xl bg-pink-50 px-3 py-2 text-center text-pink-700"><span className="block text-[11px] font-semibold uppercase">{date.toLocaleDateString(undefined, { month: "short" })}</span><span className="block text-2xl font-bold leading-tight">{date.getDate()}</span><span className="block text-[11px]">{date.getFullYear()}</span></div><button type="button" onClick={onView} title="View appointment details" aria-label="View appointment details" className="rounded-full border border-pink-100 bg-pink-50 p-2 text-pink-600 transition hover:bg-pink-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-pink-300"><Eye size={18}/></button></div><div className="mt-5"><p className="text-xs font-semibold uppercase tracking-wide text-pink-600">{appointment.appointment_type}</p><h2 className="mt-1 truncate text-lg font-semibold text-gray-800">{appointment.doctor_name || "Pregnancy care visit"}</h2></div><div className="mt-4 space-y-2 text-sm text-gray-500"><p className="flex items-center gap-2"><Clock3 size={16} className="text-pink-400"/>{appointment.appointment_time || "Time not set"}</p><p className="flex items-center gap-2 truncate"><MapPin size={16} className="shrink-0 text-pink-400"/>{appointment.clinic_name || "Location not added"}</p></div><div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass}`}>{appointment.status}</span>{appointment.reminder_enabled ? <span className="flex items-center gap-1 text-xs text-gray-400"><Bell size={13}/> Reminder on</span> : null}</div></article>;
}

function AppointmentModal({ appointment, isClosing, deleteTarget, deleting, onClose, onRequestDelete, onKeep, onDelete }) {
  useEffect(() => {
    const handleEscape = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);
  const modalClass = isClosing ? "opacity-0" : "opacity-100";
  const cardClass = isClosing ? "scale-95 opacity-0" : "scale-100 opacity-100";
  return <div onClick={(event) => { if (event.target === event.currentTarget) onClose(); }} className={`fixed inset-0 z-50 flex items-center justify-center bg-gray-900/35 p-4 backdrop-blur-md transition-opacity duration-200 ${isClosing ? modalClass : "animate-[appointment-overlay-in_180ms_ease-out]"}`}><section role="dialog" aria-modal="true" aria-labelledby="appointment-details-title" className={`max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/60 bg-white/80 shadow-2xl shadow-gray-900/20 backdrop-blur-xl transition duration-200 ${isClosing ? cardClass : "animate-[appointment-modal-in_180ms_ease-out]"}`}><div className="border-b border-pink-100 bg-pink-50/70 px-6 py-5"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wide text-pink-600">{appointment.appointment_type}</p><h2 id="appointment-details-title" className="mt-1 text-xl font-bold text-gray-800">Appointment details</h2></div><button onClick={onClose} aria-label="Close appointment details" className="rounded-full p-2 text-gray-400 transition hover:bg-white/80 hover:text-gray-700"><X size={20}/></button></div></div><div className="p-6"><div className="grid grid-cols-1 gap-5 sm:grid-cols-2"><Detail icon={<CalendarDays size={17}/>} label="Appointment date" value={appointment.appointment_date}/><Detail icon={<Clock3 size={17}/>} label="Appointment time" value={appointment.appointment_time || "Not set"}/><Detail icon={<UserRound size={17}/>} label="Doctor name" value={appointment.doctor_name || "Not added"}/><Detail icon={<MapPin size={17}/>} label="Hospital or clinic" value={appointment.clinic_name || "Not added"}/><Detail label="Appointment type" value={appointment.appointment_type}/><Detail label="Status" value={appointment.status}/>{appointment.reason && <Detail label="Reason" value={appointment.reason}/>}<Detail label="Reminder notification" value={appointment.reminder_enabled ? "Enabled" : "Off"}/>{appointment.follow_up_date && <Detail label="Follow-up date" value={appointment.follow_up_date}/>} {appointment.questions && <Detail label="Notes / questions" value={appointment.questions}/>} {appointment.doctor_notes && <Detail label="Doctor’s notes" value={appointment.doctor_notes}/>} {appointment.diagnosis && <Detail label="Diagnosis" value={appointment.diagnosis}/>} {appointment.tests_recommended && <Detail label="Tests recommended" value={appointment.tests_recommended}/>} {appointment.next_appointment && <Detail label="Next appointment" value={appointment.next_appointment}/>}</div><div className="mt-7 border-t border-gray-200/70 pt-5"><button onClick={onRequestDelete} className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600 transition hover:text-red-700"><Trash2 size={16}/> Delete appointment</button><button onClick={onClose} className="float-right rounded-lg bg-pink-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-pink-700">Close</button></div></div></section>{deleteTarget && <DeleteConfirmation deleting={deleting} onKeep={onKeep} onDelete={onDelete}/>}</div>;
}

function DeleteConfirmation({ deleting, onKeep, onDelete }) {
  return <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-900/10 p-4"><section role="alertdialog" aria-modal="true" aria-labelledby="delete-title" className="w-full max-w-sm rounded-2xl border border-white/70 bg-white/95 p-6 shadow-2xl backdrop-blur-xl"><h2 id="delete-title" className="text-lg font-bold text-gray-800">Delete Appointment?</h2><p className="mt-2 text-sm leading-6 text-gray-600">Are you sure you want to delete this appointment? This action cannot be undone.</p><div className="mt-6 flex justify-end gap-3"><button onClick={onKeep} disabled={deleting} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-60">Keep</button><button onClick={onDelete} disabled={deleting} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-60">{deleting ? "Deleting..." : "Delete"}</button></div></section></div>;
}

function Detail({ icon, label, value }) { return <div className="flex gap-3"><span className="mt-0.5 text-pink-500">{icon}</span><div className="min-w-0"><p className="text-xs text-gray-400">{label}</p><p className="mt-1 break-words font-medium text-gray-700">{value}</p></div></div>; }
function Field({ label, name, type = "text", form, onChange, required, min, placeholder }) { return <label className="text-sm font-medium text-gray-700">{label}<input required={required} min={min} type={type} name={name} value={form[name] || ""} onChange={onChange} placeholder={placeholder} className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2.5 font-normal focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100"/></label>; }
function SelectField({ label, name, options, form, onChange }) { return <label className="text-sm font-medium text-gray-700">{label}<select name={name} value={form[name]} onChange={onChange} className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2.5 font-normal focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100">{options.map((option) => <option key={option}>{option}</option>)}</select></label>; }
function LoadingState() { return <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="animate-pulse rounded-2xl border border-gray-100 bg-white p-5"><div className="h-14 w-14 rounded-xl bg-pink-50"/><div className="mt-5 h-3 w-24 rounded bg-pink-50"/><div className="mt-3 h-5 w-3/4 rounded bg-gray-100"/><div className="mt-5 h-3 w-full rounded bg-gray-100"/></div>)}</div>; }
function EmptyState({ onAdd }) { return <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center"><CalendarDays className="mx-auto text-pink-300" size={42}/><p className="mt-3 font-medium text-gray-600">No appointments yet</p><p className="mt-1 text-sm text-gray-400">Add your next pregnancy-care visit to see it here.</p><button onClick={onAdd} className="mt-5 text-sm font-medium text-pink-600 hover:text-pink-700">Add an appointment</button></div>; }

export function Input({ label, name, type = "text", form, change, required, min }) { return <Field label={label} name={name} type={type} form={form} onChange={change} required={required} min={min}/>; }
export function Select({ label, name, options, form, change }) { return <SelectField label={label} name={name} options={options} form={form} onChange={change}/>; }
export function Text({ label, name, form, change }) { return <label className="text-sm text-gray-700">{label}<textarea name={name} value={form[name] || ""} onChange={change} rows="3" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5"/></label>; }
export function Empty({ icon, text }) { return <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-12 text-center text-gray-400">{icon}<p className="mt-2">{text}</p></div>; }
export default Appointments;
