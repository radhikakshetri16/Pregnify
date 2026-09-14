import { useEffect, useState } from "react";
import {
  Stethoscope,
  Plus,
  Search,
  CheckCircle2,
  Edit2,
  Trash2,
  Check,
  Phone,
  Mail,
  MapPin,
  Award,
  Banknote,
  X,
  AlertCircle,
  Eye,
  EyeOff,
  CalendarDays,
  Clock,
} from "lucide-react";
import { checkPasswordRequirements } from "../utils/validation";
import CalendarPicker from "../components/CalendarPicker";
import { dateKey, formatDisplayDate, localDateKey } from "../utils/dates";

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000/api";

const PRESET_SLOTS = [
  "08:00 AM - 09:00 AM",
  "09:00 AM - 10:00 AM",
  "10:00 AM - 11:00 AM",
  "11:00 AM - 12:00 PM",
  "01:00 PM - 02:00 PM",
  "02:00 PM - 03:00 PM",
  "03:00 PM - 04:00 PM",
  "04:00 PM - 05:00 PM",
  "05:00 PM - 06:00 PM",
  "06:00 PM - 07:00 PM",
];

function AdminDoctors() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedDoctor, setSelectedDoctor] = useState(null);

  // Registration Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [submittingAdd, setSubmittingAdd] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    specialization: "",
    nmc_number: "",
    experience: "",
    practice_at: "",
    consultation_fee: "",
  });

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [editForm, setEditForm] = useState(null);

  // Schedule Modal State
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleDoctor, setScheduleDoctor] = useState(null);
  const [dateSchedules, setDateSchedules] = useState([]); // Array of { available_date: 'YYYY-MM-DD', time_slots: ['10:00 AM - 11:00 AM', ...] }
  const [selectedCalendarDate, setSelectedCalendarDate] = useState("");
  const [customSlotInput, setCustomSlotInput] = useState("");
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [submittingSchedule, setSubmittingSchedule] = useState(false);
  const [scheduleModalError, setScheduleModalError] = useState("");

  // Action loading for toggle or delete
  const [actionLoading, setActionLoading] = useState(null);

  const pwStatus = checkPasswordRequirements(addForm.password);
  const today = localDateKey();

  const fetchDoctors = async () => {
    try {
      const response = await fetch(`${API_BASE}/doctors`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to load doctors.");
        return;
      }

      setDoctors(data.doctors || []);
    } catch (err) {
      console.error(err);
      setError("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // The request only updates state after its asynchronous response resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDoctors();
  }, []);

  // Handle Add Doctor
  const handleAddDoctor = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!pwStatus.isValid) {
      setError(pwStatus.errorMessage);
      return;
    }

    setSubmittingAdd(true);

    try {
      const response = await fetch(`${API_BASE}/doctors`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: addForm.name.trim(),
          email: addForm.email.trim(),
          password: addForm.password,
          phone: addForm.phone.trim(),
          specialization: addForm.specialization.trim(),
          nmc_number: addForm.nmc_number.trim(),
          experience: Number(addForm.experience),
          practice_at: addForm.practice_at.trim(),
          consultation_fee: Number(addForm.consultation_fee),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to register doctor.");
        setSubmittingAdd(false);
        return;
      }

      setSuccessMsg(`Doctor ${addForm.name} registered successfully!`);
      setShowAddModal(false);
      setAddForm({
        name: "",
        email: "",
        password: "",
        phone: "",
        specialization: "",
        nmc_number: "",
        experience: "",
        practice_at: "",
        consultation_fee: "",
      });
      setShowPassword(false);
      fetchDoctors();
    } catch (err) {
      console.error(err);
      setError("Unable to connect to the server.");
    } finally {
      setSubmittingAdd(false);
    }
  };

  // Handle Edit Doctor
  const handleEditDoctor = async (e) => {
    e.preventDefault();
    if (!editForm) return;

    setError("");
    setSuccessMsg("");
    setSubmittingEdit(true);

    try {
      const response = await fetch(
        `${API_BASE}/doctors/${editForm.doctor_id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: editForm.name.trim(),
            email: editForm.email.trim(),
            phone: editForm.phone?.trim() || "",
            specialization: editForm.specialization.trim(),
            nmc_number: editForm.nmc_number.trim(),
            experience: Number(editForm.experience),
            practice_at: editForm.practice_at.trim(),
            consultation_fee: Number(editForm.consultation_fee),
            status: editForm.status,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to update doctor.");
        setSubmittingEdit(false);
        return;
      }

      setSuccessMsg(`Doctor ${editForm.name} updated successfully!`);
      setShowEditModal(false);
      setEditForm(null);
      fetchDoctors();
    } catch (err) {
      console.error(err);
      setError("Unable to connect to the server.");
    } finally {
      setSubmittingEdit(false);
    }
  };

  // Toggle Doctor Status
  const handleToggleStatus = async (doctor) => {
    const newStatus = doctor.status === "Active" ? "Inactive" : "Active";
    setActionLoading(doctor.doctor_id);
    setError("");
    setSuccessMsg("");

    try {
      const response = await fetch(
        `${API_BASE}/doctors/${doctor.doctor_id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to update status.");
        return;
      }

      setSuccessMsg(`Status for ${doctor.name} changed to ${newStatus}.`);
      fetchDoctors();
    } catch (err) {
      console.error(err);
      setError("Unable to connect to the server.");
    } finally {
      setActionLoading(null);
    }
  };

  // Delete Doctor
  const handleDeleteDoctor = async (doctorId, doctorName) => {
    if (
      !window.confirm(
        `Are you sure you want to delete ${doctorName}? This action cannot be undone.`
      )
    ) {
      return;
    }

    setActionLoading(doctorId);
    setError("");
    setSuccessMsg("");

    try {
      const response = await fetch(`${API_BASE}/doctors/${doctorId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to delete doctor.");
        return;
      }

      setSuccessMsg(`Doctor ${doctorName} deleted successfully.`);
      fetchDoctors();
    } catch (err) {
      console.error(err);
      setError("Unable to connect to the server.");
    } finally {
      setActionLoading(null);
    }
  };

  // Open Schedule Modal
  const handleOpenSchedule = async (doctor) => {
    setScheduleDoctor(doctor);
    setScheduleModalError("");
    setSelectedCalendarDate(today);
    setShowScheduleModal(true);
    setLoadingSchedule(true);

    try {
      const response = await fetch(
        `${API_BASE}/doctors/${doctor.doctor_id}/schedule`
      );
      const data = await response.json();

      if (!response.ok) {
        setScheduleModalError(data.error || "Failed to load doctor schedule.");
        return;
      }

      setDateSchedules(
        (data.date_schedules || []).map((item) => ({
          available_date: dateKey(item.available_date),
          time_slots: Array.isArray(item.time_slots) ? item.time_slots : [],
        }))
      );
    } catch (err) {
      console.error(err);
      setScheduleModalError(
        "Unable to connect to server. Please ensure the backend is running."
      );
    } finally {
      setLoadingSchedule(false);
    }
  };

  // Toggle a single time slot for the selected calendar date
  const handleToggleSlotForDate = (slotStr) => {
    if (!selectedCalendarDate) return;
    const selected = dateKey(selectedCalendarDate);

    setDateSchedules((prev) => {
      const existing = prev.find((item) => dateKey(item.available_date) === selected);

      if (existing) {
        let updatedSlots = [];
        if (existing.time_slots.includes(slotStr)) {
          // Remove slot
          updatedSlots = existing.time_slots.filter((s) => s !== slotStr);
        } else {
          // Add slot
          updatedSlots = [...existing.time_slots, slotStr];
        }

        if (updatedSlots.length === 0) {
          return prev.filter((item) => dateKey(item.available_date) !== selected);
        }

        return prev.map((item) =>
          dateKey(item.available_date) === selected
            ? { ...item, available_date: selected, time_slots: updatedSlots }
            : item
        );
      } else {
        return [
          ...prev,
          {
            available_date: selected,
            time_slots: [slotStr],
          },
        ];
      }
    });
  };

  // Quick preset: Set standard 2 slots (10-11 AM and 5-6 PM)
  const handleSetQuickTwoSlots = () => {
    if (!selectedCalendarDate) return;
    const selected = dateKey(selectedCalendarDate);
    const standardTwo = ["10:00 AM - 11:00 AM", "05:00 PM - 06:00 PM"];
    setDateSchedules((prev) => {
      const existing = prev.find((item) => dateKey(item.available_date) === selected);
      if (existing) {
        return prev.map((item) =>
          dateKey(item.available_date) === selected
            ? { ...item, available_date: selected, time_slots: standardTwo }
            : item
        );
      }
      return [...prev, { available_date: selected, time_slots: standardTwo }];
    });
  };

  // Add custom time slot
  const handleAddCustomSlot = (e) => {
    e.preventDefault();
    if (!customSlotInput.trim() || !selectedCalendarDate) return;
    handleToggleSlotForDate(customSlotInput.trim());
    setCustomSlotInput("");
  };

  // Remove an entire scheduled date
  const handleRemoveDate = (dateStr) => {
    setDateSchedules((prev) =>
      prev.filter((item) => dateKey(item.available_date) !== dateKey(dateStr))
    );
  };

  // Save Doctor Schedule
  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    if (!scheduleDoctor) return;

    setScheduleModalError("");
    setSubmittingSchedule(true);

    try {
      const response = await fetch(
        `${API_BASE}/doctors/${scheduleDoctor.doctor_id}/schedule`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            date_schedules: dateSchedules
              .map((item) => ({
                available_date: dateKey(item.available_date),
                time_slots: item.time_slots || [],
              }))
              .filter((item) => item.available_date && item.time_slots.length > 0),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setScheduleModalError(data.error || "Failed to save schedule.");
        return;
      }

      setSuccessMsg(`Schedule updated for Dr. ${scheduleDoctor.name}!`);
      setShowScheduleModal(false);
    } catch (err) {
      console.error(err);
      setScheduleModalError("Unable to connect to server.");
    } finally {
      setSubmittingSchedule(false);
    }
  };

  // Get active slots for current calendar date
  const activeSlotsForSelectedDate =
    dateSchedules.find((d) => dateKey(d.available_date) === dateKey(selectedCalendarDate))
      ?.time_slots || [];

  const scheduledDateStrings = dateSchedules.map((d) => dateKey(d.available_date)).filter(Boolean);

  const badgeMap = {};
  dateSchedules.forEach((item) => {
    const key = dateKey(item.available_date);
    if (key && item.time_slots?.length > 0) {
      badgeMap[key] = item.time_slots.length;
    }
  });

  const getFormattedDateLabel = (dateStr) => formatDisplayDate(dateStr);




  // Filtered doctors
  const filteredDoctors = doctors.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.specialization.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.nmc_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "All" || doc.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">
            Doctors
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Manage doctor accounts, schedules, and performance.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setError("");
            setSuccessMsg("");
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg font-semibold hover:bg-pink-700 transition cursor-pointer self-start sm:self-auto text-sm"
        >
          <Plus size={18} />
          Register Doctor
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-start gap-2.5">
          <AlertCircle size={18} className="shrink-0 mt-0.5 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm flex items-start gap-2.5">
          <Check size={18} className="shrink-0 mt-0.5 text-green-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white border-b border-gray-200 pb-4 mb-4 flex flex-col sm:flex-row gap-4 justify-between items-center">
        {/* Search */}
        <div className="relative w-full sm:w-96">
          <Search
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, specialization, NMC..."
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-pink-500"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Status:
          </span>
          <div className="flex border border-gray-200 rounded-lg overflow-hidden">
            {["All", "Active", "Inactive"].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                  statusFilter === st
                    ? "bg-pink-50 text-pink-700 font-semibold"
                    : "bg-white text-gray-500 hover:text-gray-800"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Doctors List */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[35vh]">
          <p className="text-gray-500 text-sm">Loading doctors...</p>
        </div>
      ) : filteredDoctors.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-12 text-center">
          <Stethoscope size={44} className="mx-auto text-gray-300 mb-3" />
          <h3 className="text-base font-semibold text-gray-800">
            No Doctors Found
          </h3>
          <p className="text-gray-500 mt-1 text-xs">
            {searchTerm || statusFilter !== "All"
              ? "No doctors match the selected filters."
              : "No doctors registered yet. Click 'Register Doctor' above."}
          </p>
        </div>
      ) : (
        <>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDoctors.map((doc) => (
            <div
              key={doc.doctor_id}
              className="relative flex items-center justify-between gap-4 bg-white border border-gray-200 rounded-xl px-5 py-4 shadow-xs hover:border-pink-200 hover:shadow-sm transition-all overflow-hidden"
            >
              <span className="absolute inset-y-0 left-0 w-1 bg-pink-500" />
              <div className="min-w-0 pl-1">
                <p className="font-semibold text-gray-800 truncate">Dr. {doc.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDoctor(doc)}
                className="shrink-0 px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
              >
                View
              </button>
            </div>
          ))}
        </div>
        <div className="hidden">
          {filteredDoctors.map((doc) => (
            <div
              key={doc.doctor_id}
              className="bg-white rounded-xl border border-gray-200 px-4 py-3.5 hover:border-pink-200 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-11 w-11 shrink-0 rounded-xl bg-gradient-to-br from-pink-100 to-rose-50 text-pink-700 flex items-center justify-center font-bold">
                      {doc.name?.charAt(0)?.toUpperCase() || "D"}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-gray-800 text-base truncate">
                        Dr. {doc.name}
                      </h3>
                      <p className="hidden">
                        {doc.specialization}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedDoctor(doc)}
                    className="shrink-0 px-3 py-1.5 bg-pink-50 hover:bg-pink-600 text-pink-700 hover:text-white text-xs font-semibold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Eye size={13} />
                    View
                  </button>
                </div>

                <div className="hidden">
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="text-gray-400 shrink-0" />
                    <span className="truncate">{doc.email}</span>
                  </div>

                  {doc.phone && (
                    <div className="flex items-center gap-2">
                      <Phone size={14} className="text-gray-400 shrink-0" />
                      <span>{doc.phone}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Award size={14} className="text-gray-400 shrink-0" />
                    <span>
                      NMC: <strong className="text-gray-700">{doc.nmc_number}</strong> •{" "}
                      {doc.experience} yrs exp
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-gray-400 shrink-0" />
                    <span className="truncate">{doc.practice_at}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Banknote size={14} className="text-gray-400 shrink-0" />
                    <span>
                      Fee: <strong className="text-gray-800">NPR {doc.consultation_fee}</strong>
                    </span>
                  </div>
                </div>

                <div className="hidden">
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <p className="text-[11px] text-gray-500">Appointments</p>
                    <p className="text-lg font-bold text-gray-800 mt-0.5">
                      {doc.scheduled_appointments ?? 0}
                    </p>
                  </div>
                  <div className="bg-green-50/70 rounded-xl p-3 border border-green-100">
                    <p className="text-[11px] text-green-700">Earnings</p>
                    <p className="text-lg font-bold text-green-700 mt-0.5 truncate">
                      NPR {Number(doc.earnings || 0).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="hidden">
                  <div className="flex items-center justify-between text-[11px] mb-1.5">
                    <span className="font-medium text-gray-600">Completed work</span>
                    <span className="font-semibold text-gray-700">
                      {doc.completed_appointments ?? 0}/{doc.progress_goal ?? 10}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-green-500 transition-all"
                      style={{ width: `${doc.progress_percent || 0}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="hidden">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      setEditForm({ ...doc });
                      setShowEditModal(true);
                    }}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit2 size={13} />
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenSchedule(doc)}
                    className="px-3 py-1.5 bg-pink-50 hover:bg-pink-100 text-pink-700 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <CalendarDays size={13} />
                    Schedule
                  </button>

                  <button
                    type="button"
                    disabled={actionLoading === doc.doctor_id}
                    onClick={() => handleToggleStatus(doc)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                      doc.status === "Active"
                        ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                        : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    }`}
                  >
                    {doc.status === "Active" ? "Deactivate" : "Activate"}
                  </button>
                </div>

                <button
                  type="button"
                  disabled={actionLoading === doc.doctor_id}
                  onClick={() => handleDeleteDoctor(doc.doctor_id, doc.name)}
                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition cursor-pointer shrink-0"
                  title="Delete Doctor"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
        </>
      )}

      {/* Doctor details modal */}
      {selectedDoctor && (
        <div className="fixed inset-0 bg-gray-950/35 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-2xl w-full shadow-xl border border-gray-200 overflow-hidden">
            <div className="px-5 sm:px-6 py-4 border-b border-gray-200">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-gray-800 truncate">Dr. {selectedDoctor.name}</h2>
                    <p className="text-sm text-gray-500 mt-0.5">{selectedDoctor.specialization}</p>
                  </div>
                </div>
                <button type="button" onClick={() => setSelectedDoctor(null)} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-white rounded-full transition cursor-pointer" aria-label="Close doctor details">
                  <X size={19} />
                </button>
              </div>
            </div>

            <div className="p-5 sm:p-6 max-h-[78vh] overflow-y-auto">
              <div className="grid grid-cols-3 border-y border-gray-200 mb-6">
                <div className="py-3 pr-3">
                  <p className="text-xs text-gray-500">Scheduled</p>
                  <p className="text-xl font-semibold text-gray-800 mt-0.5">{selectedDoctor.scheduled_appointments ?? 0}</p>
                </div>
                <div className="py-3 px-3 border-l border-gray-100">
                  <p className="text-xs text-gray-500">Completed</p>
                  <p className="text-xl font-semibold text-gray-800 mt-0.5">{selectedDoctor.completed_appointments ?? 0}</p>
                </div>
                <div className="py-3 pl-3 border-l border-gray-100">
                  <p className="text-xs text-gray-500">Earnings</p>
                  <p className="text-base font-semibold text-gray-800 mt-1">NPR {Number(selectedDoctor.earnings || 0).toLocaleString()}</p>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <span className="text-sm font-medium text-gray-800">Work progress</span>
                  <span className="text-sm font-bold text-green-700">{selectedDoctor.completed_appointments ?? 0} / {selectedDoctor.progress_goal ?? 10}</span>
                </div>
                <div className="h-2 bg-gray-100 overflow-hidden">
                  <div className="h-full bg-green-600" style={{ width: `${selectedDoctor.progress_percent || 0}%` }} />
                </div>
                <p className="text-xs text-gray-500 mt-2">Each completed appointment moves the doctor toward the 10-appointment goal.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                <div className="flex items-start gap-3"><Mail size={16} className="text-pink-500 mt-0.5 shrink-0" /><div><p className="text-xs text-gray-400">Email</p><p className="text-gray-700 break-all">{selectedDoctor.email}</p></div></div>
                <div className="flex items-start gap-3"><Phone size={16} className="text-pink-500 mt-0.5 shrink-0" /><div><p className="text-xs text-gray-400">Phone</p><p className="text-gray-700">{selectedDoctor.phone || "Not provided"}</p></div></div>
                <div className="flex items-start gap-3"><Award size={16} className="text-pink-500 mt-0.5 shrink-0" /><div><p className="text-xs text-gray-400">NMC & experience</p><p className="text-gray-700">{selectedDoctor.nmc_number} · {selectedDoctor.experience} years</p></div></div>
                <div className="flex items-start gap-3"><MapPin size={16} className="text-pink-500 mt-0.5 shrink-0" /><div><p className="text-xs text-gray-400">Practice location</p><p className="text-gray-700">{selectedDoctor.practice_at}</p></div></div>
                <div className="flex items-start gap-3"><Banknote size={16} className="text-pink-500 mt-0.5 shrink-0" /><div><p className="text-xs text-gray-400">Consultation fee</p><p className="text-gray-700 font-semibold">NPR {Number(selectedDoctor.consultation_fee || 0).toLocaleString()}</p></div></div>
                <div className="flex items-start gap-3"><CheckCircle2 size={16} className={selectedDoctor.status === "Active" ? "text-green-500 mt-0.5 shrink-0" : "text-gray-400 mt-0.5 shrink-0"} /><div><p className="text-xs text-gray-400">Account status</p><p className="text-gray-700 font-semibold">{selectedDoctor.status}</p></div></div>
              </div>

              <div className="mt-6 pt-5 border-t border-gray-100 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditForm({ ...selectedDoctor });
                    setSelectedDoctor(null);
                    setShowEditModal(true);
                  }}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit2 size={14} /> Edit doctor
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const doctor = selectedDoctor;
                    setSelectedDoctor(null);
                    handleOpenSchedule(doctor);
                  }}
                  className="px-4 py-2 bg-pink-50 hover:bg-pink-100 text-pink-700 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                >
                  <CalendarDays size={14} /> Schedule
                </button>
                <button
                  type="button"
                  disabled={actionLoading === selectedDoctor.doctor_id}
                  onClick={() => {
                    const doctor = selectedDoctor;
                    setSelectedDoctor(null);
                    handleToggleStatus(doctor);
                  }}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg transition cursor-pointer ${selectedDoctor.status === "Active" ? "bg-amber-50 text-amber-700 hover:bg-amber-100" : "bg-green-50 text-green-700 hover:bg-green-100"}`}
                >
                  {selectedDoctor.status === "Active" ? "Deactivate" : "Activate"}
                </button>
                <button
                  type="button"
                  disabled={actionLoading === selectedDoctor.doctor_id}
                  onClick={() => {
                    const { doctor_id: doctorId, name } = selectedDoctor;
                    setSelectedDoctor(null);
                    handleDeleteDoctor(doctorId, name);
                  }}
                  className="ml-auto px-4 py-2 text-red-600 hover:bg-red-50 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* REGISTER DOCTOR MODAL */}
      {/* ========================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto border border-gray-100">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-800">
                  Register Doctor
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Add a new verified doctor to Pregnify.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddDoctor} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={addForm.name}
                  onChange={(e) =>
                    setAddForm({ ...addForm, name: e.target.value })
                  }
                  placeholder="e.g. Dr. Ayush Dev"
                  required
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={addForm.email}
                  onChange={(e) =>
                    setAddForm({ ...addForm, email: e.target.value })
                  }
                  placeholder="doctor@example.com"
                  required
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Initial Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={addForm.password}
                    onChange={(e) => {
                      setAddForm({ ...addForm, password: e.target.value });
                    }}
                    placeholder="Create a strong password"
                    required
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Specialization *
                  </label>
                  <input
                    type="text"
                    value={addForm.specialization}
                    onChange={(e) =>
                      setAddForm({ ...addForm, specialization: e.target.value })
                    }
                    placeholder="e.g. Gynecologist"
                    required
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                    NMC Number *
                  </label>
                  <input
                    type="text"
                    value={addForm.nmc_number}
                    onChange={(e) =>
                      setAddForm({ ...addForm, nmc_number: e.target.value })
                    }
                    placeholder="e.g. 12345"
                    required
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Experience (Years) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={addForm.experience}
                    onChange={(e) =>
                      setAddForm({ ...addForm, experience: e.target.value })
                    }
                    placeholder="e.g. 5"
                    required
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Consultation Fee (NPR) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={addForm.consultation_fee}
                    onChange={(e) =>
                      setAddForm({
                        ...addForm,
                        consultation_fee: e.target.value,
                      })
                    }
                    placeholder="e.g. 1000"
                    required
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Practicing At *
                </label>
                <input
                  type="text"
                  value={addForm.practice_at}
                  onChange={(e) =>
                    setAddForm({ ...addForm, practice_at: e.target.value })
                  }
                  placeholder="Hospital or Clinic Name"
                  required
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAdd}
                  className="px-6 py-2.5 bg-pink-600 text-white text-sm font-semibold rounded-xl hover:bg-pink-700 disabled:opacity-50 transition cursor-pointer shadow-xs"
                >
                  {submittingAdd ? "Registering..." : "Register Doctor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* EDIT DOCTOR MODAL */}
      {/* ========================================================= */}
      {showEditModal && editForm && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto border border-gray-100">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">
                Edit Doctor Details
              </h2>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditDoctor} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  required
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Specialization *
                </label>
                <input
                  type="text"
                  value={editForm.specialization}
                  onChange={(e) =>
                    setEditForm({ ...editForm, specialization: e.target.value })
                  }
                  required
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Experience (Years) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.experience}
                    onChange={(e) =>
                      setEditForm({ ...editForm, experience: e.target.value })
                    }
                    required
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Consultation Fee (NPR) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.consultation_fee}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        consultation_fee: e.target.value,
                      })
                    }
                    required
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Practicing At *
                </label>
                <input
                  type="text"
                  value={editForm.practice_at}
                  onChange={(e) =>
                    setEditForm({ ...editForm, practice_at: e.target.value })
                  }
                  required
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Account Status
                </label>
                <select
                  value={editForm.status}
                  onChange={(e) =>
                    setEditForm({ ...editForm, status: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 bg-white"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="px-6 py-2.5 bg-pink-600 text-white text-sm font-semibold rounded-xl hover:bg-pink-700 disabled:opacity-50 transition cursor-pointer shadow-xs"
                >
                  {submittingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* DOCTOR DATE & TIME SLOTS SCHEDULE MODAL */}
      {/* ========================================================= */}
      {showScheduleModal && scheduleDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-5 sm:p-7 shadow-2xl max-h-[94vh] overflow-y-auto border border-gray-100">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 mb-4 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-pink-50 rounded-xl text-pink-600">
                    <CalendarDays size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-800">
                      Doctor Schedule & Availability
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Dr. {scheduleDoctor.name} • {scheduleDoctor.specialization} ({scheduleDoctor.practice_at})
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {dateSchedules.length > 0 && (
                  <span className="hidden sm:inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-pink-50 text-pink-700 border border-pink-100">
                    {dateSchedules.length} {dateSchedules.length === 1 ? "date" : "dates"} scheduled
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {scheduleModalError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-xl text-xs flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-600" />
                <span>{scheduleModalError}</span>
              </div>
            )}

            {loadingSchedule ? (
              <div className="py-16 text-center text-gray-500 text-xs">
                Loading schedule for Dr. {scheduleDoctor.name}...
              </div>
            ) : (
              <form onSubmit={handleSaveSchedule} className="space-y-5">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* Left Column: Calendar */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                        1. Select Calendar Date
                      </label>
                      <span className="text-[11px] text-gray-500">
                        Selected: <strong className="text-pink-600">{selectedCalendarDate || "None"}</strong>
                      </span>
                    </div>

                    <CalendarPicker
                      selectedDate={selectedCalendarDate}
                      onSelectDate={(dateStr) => setSelectedCalendarDate(dateKey(dateStr))}
                      highlightedDates={scheduledDateStrings}
                      badgeMap={badgeMap}
                      minDate={today}
                      subtitle="Click a date, then select time slots. Only dates with slots appear for patients."
                      availableLabel="Configured Schedule"
                    />
                  </div>

                  {/* Right Column: Time Slots for Selected Date */}
                  <div className="flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                          2. Time Slots for {getFormattedDateLabel(selectedCalendarDate)}
                        </label>
                        {activeSlotsForSelectedDate.length > 0 ? (
                          <span className="text-[11px] font-bold text-pink-700 bg-pink-50 border border-pink-200 px-2.5 py-0.5 rounded-full">
                            {activeSlotsForSelectedDate.length} active
                          </span>
                        ) : (
                          <span className="text-[11px] text-gray-400">
                            No slots selected
                          </span>
                        )}
                      </div>

                      {/* Quick helpers */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <button
                          type="button"
                          onClick={handleSetQuickTwoSlots}
                          className="px-3 py-1.5 bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200 rounded-xl text-xs font-medium transition cursor-pointer"
                        >
                          Select 10-11 AM & 5-6 PM
                        </button>
                        {activeSlotsForSelectedDate.length > 0 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveDate(selectedCalendarDate)}
                            className="px-3 py-1.5 text-gray-500 hover:text-red-600 rounded-xl text-xs font-medium transition cursor-pointer"
                          >
                            Clear Date
                          </button>
                        )}
                      </div>

                      {/* Slot Grid */}
                      <div className="bg-gray-50/80 border border-gray-200 rounded-2xl p-3 mb-3">
                        <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto p-0.5">
                          {PRESET_SLOTS.map((slot) => {
                            const isSlotActive =
                              activeSlotsForSelectedDate.includes(slot);
                            return (
                              <button
                                key={slot}
                                type="button"
                                onClick={() => handleToggleSlotForDate(slot)}
                                className={`py-2 px-2.5 rounded-xl text-xs font-semibold transition cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                                  isSlotActive
                                    ? "bg-pink-600 text-white shadow-xs"
                                    : "bg-white text-gray-700 border border-gray-200 hover:border-pink-300 hover:bg-pink-50/50"
                                }`}
                              >
                                {isSlotActive ? (
                                  <Check size={13} className="shrink-0" />
                                ) : (
                                  <Clock size={12} className="text-gray-400 shrink-0" />
                                )}
                                <span className="truncate">{slot}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Add Custom Slot */}
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={customSlotInput}
                          onChange={(e) => setCustomSlotInput(e.target.value)}
                          placeholder="Custom time (e.g. 05:30 PM - 06:30 PM)"
                          className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 bg-white"
                        />
                        <button
                          type="button"
                          onClick={handleAddCustomSlot}
                          className="px-3.5 py-2 bg-gray-100 hover:bg-pink-600 hover:text-white text-gray-700 text-xs font-semibold rounded-xl transition cursor-pointer shrink-0 border border-gray-200"
                        >
                          + Add Time
                        </button>
                      </div>
                    </div>

                    {/* Selected Date Summary */}
                    {activeSlotsForSelectedDate.length > 0 && (
                      <div className="mt-3 p-3 bg-pink-50/70 border border-pink-200 rounded-2xl text-xs text-pink-950">
                        <span className="font-semibold">{selectedCalendarDate}: </span>
                        <span>{activeSlotsForSelectedDate.join(", ")}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Section: Configured Scheduled Dates List */}
                {dateSchedules.length > 0 && (
                  <div className="pt-4 border-t border-gray-100">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                      Scheduled Dates for this Doctor ({dateSchedules.length})
                    </label>

                    <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1">
                      {dateSchedules.map((item) => (
                        <div
                          key={item.available_date}
                          className="inline-flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl text-xs text-gray-700"
                        >
                          <span
                            onClick={() => setSelectedCalendarDate(item.available_date)}
                            className="font-bold text-pink-700 cursor-pointer hover:underline"
                          >
                            {getFormattedDateLabel(item.available_date)}:
                          </span>
                          <span className="text-gray-600">
                            {item.time_slots.length} {item.time_slots.length === 1 ? "slot" : "slots"}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveDate(item.available_date)}
                            className="text-gray-400 hover:text-red-500 transition cursor-pointer"
                            title="Remove date"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Modal Actions Footer */}
                <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowScheduleModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingSchedule}
                    className="px-6 py-2.5 bg-pink-600 text-white text-sm font-semibold rounded-xl hover:bg-pink-700 disabled:opacity-50 transition cursor-pointer shadow-xs"
                  >
                    {submittingSchedule ? "Saving..." : "Save Doctor Schedule"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {/* Schedule Modal End */}
    </div>
  );
}

export default AdminDoctors;
