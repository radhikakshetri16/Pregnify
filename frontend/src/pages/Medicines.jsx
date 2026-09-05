import { useEffect, useState } from "react";
import {
  Pill,
  Plus,
  X,
  Pencil,
  Trash2,
  CalendarDays,
  Clock3,
  Stethoscope,
  FileText,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";


const API_URL = "http://127.0.0.1:5000/api";


const emptyForm = {
  medication_name: "",
  dosage: "",
  frequency: "",
  instructions: "",
  reason: "",
  start_date: "",
  end_date: "",
  status: "Active",
  prescribed_by: "",
};


function Medicines() {

  const [medicines, setMedicines] = useState([]);
  const [doctors, setDoctors] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");

  const [showModal, setShowModal] = useState(false);

  const [editingMedicine, setEditingMedicine] =
    useState(null);

  const [selectedMedicine, setSelectedMedicine] =
    useState(null);

  const [formData, setFormData] =
    useState(emptyForm);

  const [saving, setSaving] = useState(false);


  // =========================================================
  // GET LOGGED-IN USER
  // =========================================================
  const getLoggedInUser = () => {

    try {

      const storedUser =
        localStorage.getItem("user");

      if (!storedUser) {
        return null;
      }

      return JSON.parse(storedUser);

    } catch (error) {

      console.error(
        "Error reading logged-in user:",
        error
      );

      return null;
    }
  };


  // =========================================================
  // LOAD MEDICINES
  // =========================================================
  const fetchMedicines = async () => {

    const user =
      getLoggedInUser();

    if (!user || !user.id) {

      setError(
        "Unable to identify the logged-in user."
      );

      setLoading(false);

      return;
    }


    try {

      const response =
        await fetch(
          `${API_URL}/medicines?user_id=${user.id}`
        );


      const data =
        await response.json();


      if (!response.ok) {

        throw new Error(
          data.error ||
          "Unable to load medicines."
        );
      }


      setMedicines(
        data.medicines || []
      );

    } catch (error) {

      console.error(
        "Fetch medicines error:",
        error
      );

      setError(
        error.message ||
        "Unable to load medicines. Please make sure the backend is running."
      );

    } finally {

      setLoading(false);
    }
  };


  // =========================================================
  // LOAD DOCTORS
  // =========================================================
  const fetchDoctors = async () => {

    try {

      const response =
        await fetch(
          `${API_URL}/medicines/doctors`
        );


      const data =
        await response.json();


      if (!response.ok) {

        throw new Error(
          data.error ||
          "Unable to load doctors."
        );
      }


      setDoctors(
        data.doctors || []
      );

    } catch (error) {

      console.error(
        "Fetch doctors error:",
        error
      );

      setError(
        error.message ||
        "Unable to load doctors."
      );
    }
  };


  // =========================================================
  // INITIAL LOAD
  // =========================================================
  useEffect(() => {

    const loadData = async () => {

      setLoading(true);

      await Promise.all([
        fetchMedicines(),
        fetchDoctors(),
      ]);

    };


    loadData();

  }, []);


  // =========================================================
  // OPEN ADD MODAL
  // =========================================================
  const handleAdd = () => {

    setEditingMedicine(null);

    setFormData({
      ...emptyForm
    });

    setFormError("");

    setShowModal(true);
  };


  // =========================================================
  // OPEN EDIT MODAL
  // =========================================================
  const handleEdit = (medicine) => {

    setEditingMedicine(medicine);

    setFormData({
      medication_name:
        medicine.medication_name || "",

      dosage:
        medicine.dosage || "",

      frequency:
        medicine.frequency || "",

      instructions:
        medicine.instructions || "",

      reason:
        medicine.reason || "",

      start_date:
        medicine.start_date || "",

      end_date:
        medicine.end_date || "",

      status:
        medicine.status || "Active",

      prescribed_by:
        medicine.doctor_id
          ? String(medicine.doctor_id)
          : "",
    });

    setFormError("");

    setShowModal(true);
  };


  // =========================================================
  // CLOSE MODAL
  // =========================================================
  const handleClose = () => {

    if (saving) {
      return;
    }

    setShowModal(false);

    setEditingMedicine(null);

    setFormError("");
  };


  // =========================================================
  // INPUT CHANGE
  // =========================================================
  const handleChange = (event) => {

    const {
      name,
      value,
    } = event.target;


    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };


  // =========================================================
  // SUBMIT
  // =========================================================
  const handleSubmit = async (event) => {

    event.preventDefault();

    setFormError("");
    setError("");


    const user =
      getLoggedInUser();


    if (!user || !user.id) {

      setFormError(
        "Unable to identify the logged-in user."
      );

      return;
    }


    if (!formData.medication_name.trim()) {

      setFormError(
        "Please enter the medicine name."
      );

      return;
    }


    if (!formData.prescribed_by) {

      setFormError(
        "Please select the doctor who prescribed this medicine."
      );

      return;
    }


    setSaving(true);


    try {

      const payload = {

        user_id: user.id,

        medication_name:
          formData.medication_name.trim(),

        dosage:
          formData.dosage.trim() || null,

        frequency:
          formData.frequency.trim() || null,

        instructions:
          formData.instructions.trim() || null,

        reason:
          formData.reason.trim() || null,

        start_date:
          formData.start_date || null,

        end_date:
          formData.end_date || null,

        status:
          formData.status || null,

        prescribed_by:
          Number(formData.prescribed_by),
      };


      const url =
        editingMedicine
          ? `${API_URL}/medicines/${editingMedicine.medication_id}`
          : `${API_URL}/medicines`;


      const method =
        editingMedicine
          ? "PUT"
          : "POST";


      const response =
        await fetch(
          url,
          {
            method,
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify(
              payload
            ),
          }
        );


      const data =
        await response.json();


      if (!response.ok) {

        throw new Error(
          data.error ||
          "Unable to save medicine."
        );
      }


      setShowModal(false);

      setEditingMedicine(null);

      await fetchMedicines();

    } catch (error) {

      console.error(
        "Save medicine error:",
        error
      );

      setFormError(
        error.message ||
        "Unable to save medicine."
      );

    } finally {

      setSaving(false);
    }
  };


  // =========================================================
  // DELETE
  // =========================================================
  const handleDelete = async (
    medicationId
  ) => {

    const confirmed =
      window.confirm(
        "Are you sure you want to delete this medicine record?"
      );


    if (!confirmed) {
      return;
    }


    const user =
      getLoggedInUser();


    if (!user || !user.id) {

      setError(
        "Unable to identify the logged-in user."
      );

      return;
    }


    try {

      setError("");


      const response =
        await fetch(
          `${API_URL}/medicines/${medicationId}?user_id=${user.id}`,
          {
            method: "DELETE",
          }
        );


      const data =
        await response.json();


      if (!response.ok) {

        throw new Error(
          data.error ||
          "Unable to delete medicine."
        );
      }


      await fetchMedicines();

    } catch (error) {

      console.error(
        "Delete medicine error:",
        error
      );

      setError(
        error.message ||
        "Unable to delete medicine."
      );
    }
  };


  // =========================================================
  // FORMAT DATE
  // =========================================================
  const formatDate = (date) => {

    if (!date) {
      return "Not specified";
    }


    const parsedDate =
      new Date(date);


    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return date;
    }


    return parsedDate.toLocaleDateString(
      "en-US",
      {
        year: "numeric",
        month: "long",
        day: "numeric",
      }
    );
  };


  // =========================================================
  // STATUS STYLE
  // =========================================================
  const getStatusStyle = (
    status
  ) => {

    if (status === "Active") {

      return "bg-pink-50 text-pink-600";
    }


    if (status === "Completed") {

      return "bg-green-50 text-green-600";
    }


    if (status === "Stopped") {

      return "bg-gray-100 text-gray-600";
    }


    return "bg-gray-100 text-gray-600";
  };


  return (

    <div className="max-w-6xl mx-auto">

      {/* =====================================================
          HEADER
      ===================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">

        <div className="flex items-center gap-3">

          <div className="w-11 h-11 rounded-xl bg-pink-50 flex items-center justify-center">

            <Pill
              size={23}
              className="text-pink-600"
            />

          </div>


          <div>

            <h1 className="text-3xl font-bold text-gray-800">
              Medicines
            </h1>

            <p className="text-gray-500 mt-1">
              Keep track of your current and previous medicines.
            </p>

          </div>

        </div>


        <button
          type="button"
          onClick={handleAdd}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-pink-600 text-white font-medium hover:bg-pink-700 transition shadow-sm"
        >

          <Plus size={19} />

          Add Medicine

        </button>

      </div>


      {/* =====================================================
          ERROR
      ===================================================== */}
      {error && (

        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 flex items-start gap-3">

          <AlertCircle
            size={20}
            className="mt-0.5 flex-shrink-0"
          />

          <p className="text-sm">
            {error}
          </p>

        </div>

      )}


      {/* =====================================================
          LOADING
      ===================================================== */}
      {loading ? (

        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">

          <div className="w-8 h-8 border-2 border-pink-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />

          <p className="text-gray-500">
            Loading medicines...
          </p>

        </div>

      ) : medicines.length === 0 ? (

        /* ===================================================
           EMPTY STATE
        =================================================== */
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">

          <div className="w-16 h-16 mx-auto rounded-2xl bg-pink-50 flex items-center justify-center mb-5">

            <Pill
              size={30}
              className="text-pink-600"
            />

          </div>


          <h2 className="text-xl font-semibold text-gray-800">
            No medicines recorded
          </h2>


          <p className="text-gray-500 mt-2 max-w-md mx-auto">
            Add the medicines you are currently taking or have taken
            during your pregnancy.
          </p>


          <button
            type="button"
            onClick={handleAdd}
            className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-pink-600 text-white font-medium hover:bg-pink-700 transition"
          >

            <Plus size={18} />

            Add Medicine

          </button>

        </div>

      ) : (

        /* ===================================================
           MEDICINE LIST
        =================================================== */
        <div>

          <div className="mb-4">

            <h2 className="text-lg font-semibold text-gray-800">
              Medication Records
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              {medicines.length}{" "}
              {medicines.length === 1
                ? "medicine"
                : "medicines"}{" "}
              recorded
            </p>

          </div>


          <div className="space-y-3">
            {medicines.map((medicine) => (
              <div key={medicine.medication_id} className="bg-white border border-gray-200 rounded-2xl px-5 py-4 hover:shadow-sm transition">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center flex-shrink-0"><Pill size={19} className="text-pink-600"/></div>
                    <div className="min-w-0"><h3 className="text-base font-semibold text-gray-800 truncate">{medicine.medication_name}</h3><div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-gray-500">{medicine.dosage && <span>{medicine.dosage}</span>}{medicine.frequency && <><span className="text-gray-300">•</span><span>{medicine.frequency}</span></>}{medicine.status && <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${getStatusStyle(medicine.status)}`}>{medicine.status}</span>}</div></div>
                  </div>
                  <div className="flex items-center gap-2 sm:flex-shrink-0"><button type="button" onClick={() => setSelectedMedicine(medicine)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-pink-600 hover:bg-pink-50 transition"><FileText size={16}/>View</button><button type="button" onClick={() => handleEdit(medicine)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition"><Pencil size={16}/>Edit</button><button type="button" onClick={() => handleDelete(medicine.medication_id)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition"><Trash2 size={16}/>Delete</button></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================
          VIEW MEDICINE MODAL
      ===================================================== */}
      {selectedMedicine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setSelectedMedicine(null)}/>
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center"><Pill size={19} className="text-pink-600"/></div><div><h2 className="text-xl font-semibold text-gray-800">Medicine Details</h2><p className="text-sm text-gray-500 mt-0.5">{selectedMedicine.medication_name}</p></div></div><button type="button" onClick={() => setSelectedMedicine(null)} className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"><X size={20}/></button></div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div className="rounded-xl bg-gray-50 border border-gray-100 p-4"><p className="text-xs font-medium text-gray-500 mb-1">Medicine</p><p className="text-sm font-semibold text-gray-800">{selectedMedicine.medication_name || "Not specified"}</p></div><div className="rounded-xl bg-gray-50 border border-gray-100 p-4"><p className="text-xs font-medium text-gray-500 mb-1">Dosage</p><p className="text-sm font-semibold text-gray-800">{selectedMedicine.dosage || "Not specified"}</p></div><div className="rounded-xl bg-gray-50 border border-gray-100 p-4"><p className="text-xs font-medium text-gray-500 mb-1">Frequency</p><p className="text-sm font-semibold text-gray-800">{selectedMedicine.frequency || "Not specified"}</p></div><div className="rounded-xl bg-gray-50 border border-gray-100 p-4"><p className="text-xs font-medium text-gray-500 mb-1">Status</p><p className="text-sm font-semibold text-gray-800">{selectedMedicine.status || "Not specified"}</p></div></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><p className="text-xs font-medium text-gray-500 mb-1">Start Date</p><p className="text-sm text-gray-700">{formatDate(selectedMedicine.start_date)}</p></div><div><p className="text-xs font-medium text-gray-500 mb-1">End Date</p><p className="text-sm text-gray-700">{formatDate(selectedMedicine.end_date)}</p></div><div><p className="text-xs font-medium text-gray-500 mb-1">Prescribed By</p><p className="text-sm text-gray-700">{selectedMedicine.doctor_name || selectedMedicine.prescribed_by_name || "Not specified"}</p></div><div><p className="text-xs font-medium text-gray-500 mb-1">Reason</p><p className="text-sm text-gray-700">{selectedMedicine.reason || "Not specified"}</p></div></div>
              {selectedMedicine.instructions && <div><div className="flex items-center gap-2 mb-2"><FileText size={16} className="text-gray-400"/><h4 className="text-sm font-semibold text-gray-700">Instructions</h4></div><p className="text-sm text-gray-600 leading-6">{selectedMedicine.instructions}</p></div>}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl"><button type="button" onClick={() => setSelectedMedicine(null)} className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition">Close</button><button type="button" onClick={() => {setSelectedMedicine(null);handleEdit(selectedMedicine);}} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-pink-600 text-white text-sm font-medium hover:bg-pink-700 transition"><Pencil size={17}/>Edit Medicine</button></div>
          </div>
        </div>
      )}

      {/* =====================================================
          ADD / EDIT MODAL
      ===================================================== */}
      {showModal && (

        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">

          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={handleClose}
          />


          {/* Modal */}
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">

              <div>

                <h2 className="text-xl font-semibold text-gray-800">

                  {editingMedicine
                    ? "Edit Medicine"
                    : "Add Medicine"}

                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  Record your medication details.
                </p>

              </div>


              <button
                type="button"
                onClick={handleClose}
                disabled={saving}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
              >

                <X size={20} />

              </button>

            </div>


            {/* Form */}
            <form
              onSubmit={handleSubmit}
            >

              <div className="p-6 space-y-5">

                {/* Error */}
                {formError && (

                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-600 flex items-start gap-2.5">

                    <AlertCircle
                      size={18}
                      className="mt-0.5 flex-shrink-0"
                    />

                    <p className="text-sm">
                      {formError}
                    </p>

                  </div>

                )}


                {/* Medicine Name */}
                <div>

                  <label className="block text-sm font-medium text-gray-700 mb-2">

                    Medicine Name
                    <span className="text-pink-600 ml-1">
                      *
                    </span>

                  </label>


                  <input
                    type="text"
                    name="medication_name"
                    value={
                      formData.medication_name
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="e.g. Folic Acid"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-100 focus:border-pink-400 transition"
                  />

                </div>


                {/* Dosage + Frequency */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

                  <div>

                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Dosage
                    </label>

                    <input
                      type="text"
                      name="dosage"
                      value={
                        formData.dosage
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="e.g. 5 mg"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-100 focus:border-pink-400 transition"
                    />

                  </div>


                  <div>

                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Frequency
                    </label>

                    <input
                      type="text"
                      name="frequency"
                      value={
                        formData.frequency
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="e.g. Once daily"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-100 focus:border-pink-400 transition"
                    />

                  </div>

                </div>


                {/* Doctor */}
                <div>

                  <label className="block text-sm font-medium text-gray-700 mb-2">

                    Prescribed By
                    <span className="text-pink-600 ml-1">
                      *
                    </span>

                  </label>


                  <div className="relative">

                    <Stethoscope
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                    />


                    <select
                      name="prescribed_by"
                      value={
                        formData.prescribed_by
                      }
                      onChange={
                        handleChange
                      }
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-100 focus:border-pink-400 transition"
                    >

                      <option value="">
                        Select doctor
                      </option>


                      {doctors.map(
                        (doctor) => (

                          <option
                            key={
                              doctor.doctor_id
                            }
                            value={
                              doctor.doctor_id
                            }
                          >

                            Dr.{" "}
                            {doctor.name}

                            {doctor.specialization
                              ? ` — ${doctor.specialization}`
                              : ""}

                          </option>

                        )
                      )}

                    </select>

                  </div>

                </div>


                {/* Reason */}
                <div>

                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason
                  </label>

                  <input
                    type="text"
                    name="reason"
                    value={
                      formData.reason
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="e.g. Iron deficiency"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-100 focus:border-pink-400 transition"
                  />

                </div>


                {/* Dates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

                  <div>

                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date
                    </label>

                    <div className="relative">

                      <CalendarDays
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                      />

                      <input
                        type="date"
                        name="start_date"
                        value={
                          formData.start_date
                        }
                        onChange={
                          handleChange
                        }
                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 text-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-100 focus:border-pink-400 transition"
                      />

                    </div>

                  </div>


                  <div>

                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date
                    </label>

                    <div className="relative">

                      <CalendarDays
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                      />

                      <input
                        type="date"
                        name="end_date"
                        value={
                          formData.end_date
                        }
                        onChange={
                          handleChange
                        }
                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 text-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-100 focus:border-pink-400 transition"
                      />

                    </div>

                  </div>

                </div>


                {/* Status */}
                <div>

                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>


                  <select
                    name="status"
                    value={
                      formData.status
                    }
                    onChange={
                      handleChange
                    }
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-100 focus:border-pink-400 transition"
                  >

                    <option value="Active">
                      Active
                    </option>

                    <option value="Completed">
                      Completed
                    </option>

                    <option value="Stopped">
                      Stopped
                    </option>

                  </select>

                </div>


                {/* Instructions */}
                <div>

                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Instructions
                  </label>

                  <textarea
                    name="instructions"
                    rows="3"
                    value={
                      formData.instructions
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="e.g. Take after breakfast..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-700 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-pink-100 focus:border-pink-400 transition"
                  />

                </div>

              </div>


              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-5 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">

                <button
                  type="button"
                  onClick={handleClose}
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition disabled:opacity-50"
                >
                  Cancel
                </button>


                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-pink-600 text-white text-sm font-medium hover:bg-pink-700 transition disabled:opacity-60"
                >

                  {saving ? (

                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />

                      Saving...

                    </>

                  ) : (

                    <>
                      {editingMedicine
                        ? "Update Medicine"
                        : "Add Medicine"}
                    </>

                  )}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}


export default Medicines;