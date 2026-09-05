import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  Phone,
  AlertCircle,
  Edit3,
  X,
  Search,
} from "lucide-react";

function DoctorAppointments() {
  const doctor = JSON.parse(localStorage.getItem("doctor"));

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  // Notes Modal State
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [doctorNotes, setDoctorNotes] = useState("");
  const [updatingNotes, setUpdatingNotes] = useState(false);

  const fetchAppointments = async () => {
    if (!doctor?.doctor_id) return;

    try {
      const response = await fetch(
        `http://127.0.0.1:5000/api/doctors/${doctor.doctor_id}/appointments`
      );
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to load appointments.");
        return;
      }

      setAppointments(data.appointments || []);
    } catch (err) {
      console.error(err);
      setError("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

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
        fetchAppointments();
      } else {
        const data = await response.json();
        setError(data.error || "Failed to update appointment status.");
      }
    } catch (err) {
      console.error(err);
      setError("Unable to connect to the server.");
    }
  };

  const handleSaveNotes = async (e) => {
    e.preventDefault();
    if (!editingAppointment || !doctor?.doctor_id) return;

    setUpdatingNotes(true);
    try {
      const response = await fetch(
        `http://127.0.0.1:5000/api/doctors/${doctor.doctor_id}/appointments/${editingAppointment.appointment_id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ doctor_notes: doctorNotes }),
        }
      );

      if (response.ok) {
        setEditingAppointment(null);
        setDoctorNotes("");
        fetchAppointments();
      } else {
        const data = await response.json();
        setError(data.error || "Failed to save notes.");
      }
    } catch (err) {
      console.error(err);
      setError("Unable to connect to the server.");
    } finally {
      setUpdatingNotes(false);
    }
  };

  const filteredAppointments = appointments.filter((apt) => {
    const matchesStatus =
      statusFilter === "All" || apt.status === statusFilter;
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      apt.patient_name?.toLowerCase().includes(q) ||
      apt.appointment_type?.toLowerCase().includes(q) ||
      apt.reason?.toLowerCase().includes(q) ||
      apt.appointment_date?.toLowerCase().includes(q);

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">
          Appointments
        </h1>
        <p className="text-gray-500 mt-2">
          Manage your consultation schedule and patient appointments.
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6 flex flex-col sm:flex-row gap-4 justify-between items-center">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by patient, date, type..."
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg overflow-x-auto w-full sm:w-auto">
          {["All", "Pending", "Confirmed", "Completed", "Cancelled"].map(
            (st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition whitespace-nowrap cursor-pointer ${
                  statusFilter === st
                    ? "bg-white text-gray-800 shadow-xs font-semibold"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                {st}
              </button>
            )
          )}
        </div>
      </div>

      {/* Appointments List */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <p className="text-gray-500">Loading appointments...</p>
        </div>
      ) : filteredAppointments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <CalendarDays size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-800">
            No Appointments Found
          </h3>
          <p className="text-gray-500 mt-2 text-sm">
            {searchTerm || statusFilter !== "All"
              ? "No appointments match your search or filter."
              : "No appointments have been booked with you yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAppointments.map((apt) => (
            <div
              key={apt.appointment_id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
              {/* Left Column: Date & Patient Info */}
              <div className="flex items-start gap-4">
                <div className="text-center min-w-[85px] p-3 bg-pink-50 text-pink-600 rounded-xl">
                  <span className="text-sm font-bold block">
                    {apt.appointment_date}
                  </span>
                  <span className="text-xs font-medium block mt-0.5">
                    {apt.appointment_time}
                  </span>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-800 text-base">
                      {apt.patient_name}
                    </h3>
                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md font-medium">
                      {apt.appointment_type}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                    {apt.patient_phone && (
                      <span className="flex items-center gap-1">
                        <Phone size={12} /> {apt.patient_phone}
                      </span>
                    )}
                    {apt.patient_age && (
                      <span>{apt.patient_age} yrs</span>
                    )}
                  </div>

                  {apt.reason && (
                    <p className="text-xs text-gray-600 mt-2 bg-gray-50 p-2.5 rounded-lg">
                      <strong>Reason:</strong> {apt.reason}
                    </p>
                  )}

                  {apt.doctor_notes && (
                    <p className="text-xs text-gray-700 mt-2 bg-pink-50/40 border border-pink-100 p-2.5 rounded-lg">
                      <strong>Doctor Notes:</strong> {apt.doctor_notes}
                    </p>
                  )}
                </div>
              </div>

              {/* Right Column: Status & Action Buttons */}
              <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end justify-between gap-3 pt-4 md:pt-0 border-t md:border-t-0 border-gray-100">
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

                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    to={`/doctor/patients/${apt.patient_id}`}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition"
                  >
                    View Patient
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingAppointment(apt);
                      setDoctorNotes(apt.doctor_notes || "");
                    }}
                    className="px-3 py-1.5 bg-pink-50 hover:bg-pink-100 text-pink-600 text-xs font-medium rounded-lg transition flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 size={13} />
                    Notes
                  </button>

                  {apt.status === "Pending" && (
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateStatus(apt.appointment_id, "Confirmed")
                      }
                      className="px-3 py-1.5 bg-pink-600 hover:bg-pink-700 text-white text-xs font-medium rounded-lg transition cursor-pointer"
                    >
                      Confirm
                    </button>
                  )}

                  {apt.status !== "Completed" && apt.status !== "Cancelled" && (
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateStatus(apt.appointment_id, "Completed")
                      }
                      className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition cursor-pointer"
                    >
                      Complete
                    </button>
                  )}

                  {apt.status !== "Cancelled" && apt.status !== "Completed" && (
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateStatus(apt.appointment_id, "Cancelled")
                      }
                      className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium rounded-lg transition cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Doctor Notes Modal */}
      {editingAppointment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 text-lg">
                Doctor Notes for {editingAppointment.patient_name}
              </h3>
              <button
                type="button"
                onClick={() => setEditingAppointment(null)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveNotes} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Clinical Advice / Notes
                </label>
                <textarea
                  rows={4}
                  value={doctorNotes}
                  onChange={(e) => setDoctorNotes(e.target.value)}
                  placeholder="Enter diagnosis, advice, or follow-up instructions..."
                  className="w-full p-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingAppointment(null)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingNotes}
                  className="px-5 py-2 bg-pink-600 text-white text-sm font-medium rounded-lg hover:bg-pink-700 disabled:opacity-50 transition cursor-pointer"
                >
                  {updatingNotes ? "Saving..." : "Save Notes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default DoctorAppointments;
