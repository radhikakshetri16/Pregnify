import { useEffect, useState } from "react";
import {
  Stethoscope,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
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
  Lock,
} from "lucide-react";
import { checkPasswordRequirements } from "../utils/validation";

function AdminDoctors() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Registration Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [submittingAdd, setSubmittingAdd] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
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

  // Action loading for toggle or delete
  const [actionLoading, setActionLoading] = useState(null);

  const pwStatus = checkPasswordRequirements(addForm.password);

  const fetchDoctors = async () => {
    try {
      const response = await fetch("http://127.0.0.1:5000/api/doctors");
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
    fetchDoctors();
  }, []);

  // Handle Add Doctor
  const handleAddDoctor = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    // Validate password complexity
    if (!pwStatus.isValid) {
      setError(pwStatus.errorMessage);
      setPasswordTouched(true);
      return;
    }

    setSubmittingAdd(true);

    try {
      const response = await fetch("http://127.0.0.1:5000/api/doctors", {
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

      // Success feedback
      setSuccessMsg(
        `Doctor ${data.doctor.name} registered successfully. Please provide their login password to them securely.`
      );

      // Reset form & close add modal
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
      setPasswordTouched(false);
      setShowPassword(false);
      setShowAddModal(false);

      // Refresh list
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
        `http://127.0.0.1:5000/api/doctors/${editForm.doctor_id}`,
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

      setSuccessMsg(`Doctor ${editForm.name} updated successfully.`);
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
        `http://127.0.0.1:5000/api/doctors/${doctor.doctor_id}/status`,
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
      const response = await fetch(
        `http://127.0.0.1:5000/api/doctors/${doctorId}`,
        {
          method: "DELETE",
        }
      );

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
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            Doctors
          </h1>
          <p className="text-gray-500 mt-2">
            Register and manage doctors on Pregnify.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setError("");
            setSuccessMsg("");
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 px-5 py-3 bg-pink-600 text-white rounded-xl font-semibold hover:bg-pink-700 transition self-start sm:self-auto cursor-pointer shadow-xs"
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
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6 flex flex-col sm:flex-row gap-4 justify-between items-center">
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
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Status:
          </span>
          <div className="flex bg-gray-100 p-1 rounded-xl">
            {["All", "Active", "Inactive"].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition cursor-pointer ${
                  statusFilter === st
                    ? "bg-white text-gray-800 shadow-xs font-semibold"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Doctors List (Passwords NEVER displayed) */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <p className="text-gray-500">Loading doctors...</p>
        </div>
      ) : filteredDoctors.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <Stethoscope size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-800">
            No Doctors Found
          </h3>
          <p className="text-gray-500 mt-2 text-sm">
            {searchTerm || statusFilter !== "All"
              ? "No doctors match the selected filters."
              : "No doctors have been registered yet. Click 'Register Doctor' above."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredDoctors.map((doc) => (
            <div
              key={doc.doctor_id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col justify-between"
            >
              <div>
                {/* Doctor Header */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <h3 className="font-bold text-gray-800 text-lg">
                      {doc.name}
                    </h3>
                    <p className="text-xs font-semibold text-pink-600 bg-pink-50 inline-block px-2.5 py-1 rounded-lg mt-1">
                      {doc.specialization}
                    </p>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                      doc.status === "Active"
                        ? "bg-green-50 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {doc.status === "Active" ? (
                      <CheckCircle2 size={13} />
                    ) : (
                      <XCircle size={13} />
                    )}
                    {doc.status}
                  </span>
                </div>

                {/* Details Grid */}
                <div className="space-y-2 text-sm text-gray-600 mb-6 bg-gray-50 p-4 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Mail size={15} className="text-gray-400 shrink-0" />
                    <span className="truncate">{doc.email}</span>
                  </div>

                  {doc.phone && (
                    <div className="flex items-center gap-2">
                      <Phone size={15} className="text-gray-400 shrink-0" />
                      <span>{doc.phone}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Award size={15} className="text-gray-400 shrink-0" />
                    <span>
                      NMC: <strong className="text-gray-700">{doc.nmc_number}</strong> •{" "}
                      {doc.experience} {doc.experience === 1 ? "yr" : "yrs"} experience
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <MapPin size={15} className="text-gray-400 shrink-0" />
                    <span className="truncate">{doc.practice_at}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Banknote size={15} className="text-gray-400 shrink-0" />
                    <span>
                      Fee:{" "}
                      <strong className="text-gray-800">
                        NPR {doc.consultation_fee}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
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
                    disabled={actionLoading === doc.doctor_id}
                    onClick={() => handleToggleStatus(doc)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                      doc.status === "Active"
                        ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                        : "bg-green-50 text-green-700 hover:bg-green-100"
                    }`}
                  >
                    {doc.status === "Active" ? "Deactivate" : "Activate"}
                  </button>
                </div>

                <button
                  type="button"
                  disabled={actionLoading === doc.doctor_id}
                  onClick={() => handleDeleteDoctor(doc.doctor_id, doc.name)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition cursor-pointer"
                  title="Delete Doctor"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================= */}
      {/* REGISTER DOCTOR MODAL */}
      {/* ========================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  Register New Doctor
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Enter doctor details and assign their initial password.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddDoctor} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={addForm.name}
                  onChange={(e) =>
                    setAddForm({ ...addForm, name: e.target.value })
                  }
                  placeholder="e.g. Dr. Sita Nepal"
                  required
                  className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={addForm.email}
                    onChange={(e) =>
                      setAddForm({ ...addForm, email: e.target.value })
                    }
                    placeholder="doctor@pregnify.com"
                    required
                    className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={addForm.phone}
                    onChange={(e) =>
                      setAddForm({ ...addForm, phone: e.target.value })
                    }
                    placeholder="98XXXXXXXX"
                    className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
              </div>

              {/* Initial Password Field (Set manually by Admin) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={addForm.password}
                    onChange={(e) => {
                      setAddForm({ ...addForm, password: e.target.value });
                      if (!passwordTouched) setPasswordTouched(true);
                    }}
                    onFocus={() => setPasswordTouched(true)}
                    placeholder="Set doctor's initial password"
                    required
                    className="w-full pl-4 pr-11 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Password Policy Checklist */}
                {(passwordTouched || addForm.password) && (
                  <div className="mt-2.5 p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs space-y-1">
                    <p className="font-semibold text-gray-700 mb-1">
                      Password Requirements:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                      <div
                        className={`flex items-center gap-1.5 ${
                          pwStatus.rules.minLength
                            ? "text-green-600 font-medium"
                            : "text-gray-500"
                        }`}
                      >
                        {pwStatus.rules.minLength ? (
                          <Check size={13} className="text-green-600 shrink-0" />
                        ) : (
                          <span className="w-2.5 h-2.5 rounded-full border border-gray-300 inline-block shrink-0" />
                        )}
                        <span>Min. 6 chars</span>
                      </div>

                      <div
                        className={`flex items-center gap-1.5 ${
                          pwStatus.rules.hasUppercase
                            ? "text-green-600 font-medium"
                            : "text-gray-500"
                        }`}
                      >
                        {pwStatus.rules.hasUppercase ? (
                          <Check size={13} className="text-green-600 shrink-0" />
                        ) : (
                          <span className="w-2.5 h-2.5 rounded-full border border-gray-300 inline-block shrink-0" />
                        )}
                        <span>1 Uppercase (A-Z)</span>
                      </div>

                      <div
                        className={`flex items-center gap-1.5 ${
                          pwStatus.rules.hasLowercase
                            ? "text-green-600 font-medium"
                            : "text-gray-500"
                        }`}
                      >
                        {pwStatus.rules.hasLowercase ? (
                          <Check size={13} className="text-green-600 shrink-0" />
                        ) : (
                          <span className="w-2.5 h-2.5 rounded-full border border-gray-300 inline-block shrink-0" />
                        )}
                        <span>1 Lowercase (a-z)</span>
                      </div>

                      <div
                        className={`flex items-center gap-1.5 ${
                          pwStatus.rules.hasNumber
                            ? "text-green-600 font-medium"
                            : "text-gray-500"
                        }`}
                      >
                        {pwStatus.rules.hasNumber ? (
                          <Check size={13} className="text-green-600 shrink-0" />
                        ) : (
                          <span className="w-2.5 h-2.5 rounded-full border border-gray-300 inline-block shrink-0" />
                        )}
                        <span>1 Number (0-9)</span>
                      </div>

                      <div
                        className={`flex items-center gap-1.5 sm:col-span-2 ${
                          pwStatus.rules.hasSpecial
                            ? "text-green-600 font-medium"
                            : "text-gray-500"
                        }`}
                      >
                        {pwStatus.rules.hasSpecial ? (
                          <Check size={13} className="text-green-600 shrink-0" />
                        ) : (
                          <span className="w-2.5 h-2.5 rounded-full border border-gray-300 inline-block shrink-0" />
                        )}
                        <span>1 Special char (!@#$%...)</span>
                      </div>
                    </div>
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  Share this password securely with the doctor.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Specialization *
                  </label>
                  <input
                    type="text"
                    value={addForm.specialization}
                    onChange={(e) =>
                      setAddForm({ ...addForm, specialization: e.target.value })
                    }
                    placeholder="e.g. Obstetrician"
                    required
                    className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    NMC Number *
                  </label>
                  <input
                    type="text"
                    value={addForm.nmc_number}
                    onChange={(e) =>
                      setAddForm({ ...addForm, nmc_number: e.target.value })
                    }
                    placeholder="e.g. 14235"
                    required
                    className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Experience (Years) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={addForm.experience}
                    onChange={(e) =>
                      setAddForm({ ...addForm, experience: e.target.value })
                    }
                    placeholder="e.g. 5"
                    required
                    className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Consultation Fee (NPR) *
                  </label>
                  <input
                    type="number"
                    min="300"
                    step="0.01"
                    value={addForm.consultation_fee}
                    onChange={(e) =>
                      setAddForm({
                        ...addForm,
                        consultation_fee: e.target.value,
                      })
                    }
                    placeholder="e.g. 800"
                    required
                    className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Practicing At (Clinic / Hospital) *
                </label>
                <input
                  type="text"
                  value={addForm.practice_at}
                  onChange={(e) =>
                    setAddForm({ ...addForm, practice_at: e.target.value })
                  }
                  placeholder="e.g. Norvic International Hospital, Kathmandu"
                  required
                  className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition cursor-pointer"
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-800">
                Edit Doctor Information
              </h2>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditDoctor} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  required
                  className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) =>
                      setEditForm({ ...editForm, email: e.target.value })
                    }
                    required
                    className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={editForm.phone || ""}
                    onChange={(e) =>
                      setEditForm({ ...editForm, phone: e.target.value })
                    }
                    className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Specialization *
                  </label>
                  <input
                    type="text"
                    value={editForm.specialization}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        specialization: e.target.value,
                      })
                    }
                    required
                    className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    NMC Number *
                  </label>
                  <input
                    type="text"
                    value={editForm.nmc_number}
                    onChange={(e) =>
                      setEditForm({ ...editForm, nmc_number: e.target.value })
                    }
                    required
                    className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                    className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Consultation Fee (NPR) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editForm.consultation_fee}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        consultation_fee: e.target.value,
                      })
                    }
                    required
                    className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Practicing At *
                </label>
                <input
                  type="text"
                  value={editForm.practice_at}
                  onChange={(e) =>
                    setEditForm({ ...editForm, practice_at: e.target.value })
                  }
                  required
                  className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Status
                </label>
                <select
                  value={editForm.status}
                  onChange={(e) =>
                    setEditForm({ ...editForm, status: e.target.value })
                  }
                  className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition cursor-pointer"
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
    </div>
  );
}

export default AdminDoctors;
