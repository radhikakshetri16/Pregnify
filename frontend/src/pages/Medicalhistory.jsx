import { useEffect, useState } from "react";
import {
ClipboardList,
Plus,
X,
Pencil,
Trash2,
CalendarDays,
FileText,
Pill,
StickyNote,
AlertCircle,
CheckCircle2,
Clock3,
} from "lucide-react";

function Medicalhistory() {
const [records, setRecords] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");

const [showModal, setShowModal] = useState(false);
const [editingRecord, setEditingRecord] = useState(null);
const [selectedRecord, setSelectedRecord] = useState(null);
const [saving, setSaving] = useState(false);
const [formError, setFormError] = useState("");

const [formData, setFormData] = useState({
condition_name: "",
description: "",
diagnosed_date: "",
medication_history: "",
status: "Active",
notes: "",
});

const getLoggedInUser = () => {
try {
const storedUser = localStorage.getItem("user");


  if (!storedUser) {
    return null;
  }

  return JSON.parse(storedUser);
} catch (error) {
  console.error("Error reading logged-in user:", error);
  return null;
}


};

const fetchRecords = async () => {
setLoading(true);
setError("");


try {
  const user = getLoggedInUser();

  if (!user || !user.id) {
    setError("Unable to identify the logged-in user.");
    setLoading(false);
    return;
  }

  const response = await fetch(
    `http://127.0.0.1:5000/api/medical-history?user_id=${user.id}`
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error || "Unable to load medical history."
    );
  }

  setRecords(data.records || data.medical_history || []);
} catch (error) {
  console.error("Medical history error:", error);

  setError(
    error.message ||
      "Unable to load medical history. Please make sure the backend is running."
  );
} finally {
  setLoading(false);
}


};

useEffect(() => {
fetchRecords();
}, []);

const resetForm = () => {
setFormData({
condition_name: "",
description: "",
diagnosed_date: "",
medication_history: "",
status: "Active",
notes: "",
});


setEditingRecord(null);
setFormError("");


};

const handleAdd = () => {
resetForm();
setShowModal(true);
};

const handleEdit = (record) => {
setEditingRecord(record);


setFormData({
  condition_name: record.condition_name || "",
  description: record.description || "",
  diagnosed_date: record.diagnosed_date || "",
  medication_history: record.medication_history || "",
  status: record.status || "Active",
  notes: record.notes || "",
});

setFormError("");
setShowModal(true);


};

const handleChange = (event) => {
const { name, value } = event.target;


setFormData((previous) => ({
  ...previous,
  [name]: value,
}));

setFormError("");


};

const handleSubmit = async (event) => {
event.preventDefault();


const user = getLoggedInUser();

if (!user || !user.id) {
  setFormError("Unable to identify the logged-in user.");
  return;
}

if (!formData.condition_name.trim()) {
  setFormError("Please enter the medical condition.");
  return;
}

setSaving(true);
setFormError("");

try {
  const payload = {
    user_id: user.id,
    condition_name: formData.condition_name.trim(),
    description: formData.description.trim(),
    diagnosed_date: formData.diagnosed_date || null,
    medication_history:
      formData.medication_history.trim(),
    status: formData.status || null,
    notes: formData.notes.trim(),
  };

  const url = editingRecord
    ? `http://127.0.0.1:5000/api/medical-history/${editingRecord.medical_history_id}`
    : "http://127.0.0.1:5000/api/medical-history";

  const response = await fetch(url, {
    method: editingRecord ? "PUT" : "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error ||
        (editingRecord
          ? "Unable to update medical history."
          : "Unable to save medical history.")
    );
  }

  setShowModal(false);
  resetForm();

  await fetchRecords();
} catch (error) {
  console.error("Save medical history error:", error);

  setFormError(
    error.message ||
      "Something went wrong while saving medical history."
  );
} finally {
  setSaving(false);
}


};

const handleDelete = async (recordId) => {
const confirmed = window.confirm(
"Are you sure you want to delete this medical history record?"
);


if (!confirmed) {
  return;
}

const user = getLoggedInUser();

if (!user || !user.id) {
  setError("Unable to identify the logged-in user.");
  return;
}

try {
  setError("");

  const response = await fetch(
    `http://127.0.0.1:5000/api/medical-history/${recordId}?user_id=${user.id}`,
    {
      method: "DELETE",
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error || "Unable to delete medical history."
    );
  }

  if (
    selectedRecord &&
    selectedRecord.medical_history_id === recordId
  ) {
    setSelectedRecord(null);
  }

  await fetchRecords();
} catch (error) {
  console.error("Delete medical history error:", error);

  setError(
    error.message ||
      "Something went wrong while deleting the record."
  );
}


};

const formatDate = (date) => {
if (!date) {
return "Not specified";
}


const parsedDate = new Date(date);

if (Number.isNaN(parsedDate.getTime())) {
  return date;
}

return parsedDate.toLocaleDateString("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
});


};

if (loading) {
return ( <div className="max-w-5xl mx-auto"> <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center"> <div className="w-8 h-8 border-2 border-pink-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" /> <p className="text-gray-500">
Loading your medical history... </p> </div> </div>
);
}

return ( <div className="max-w-5xl mx-auto pb-10">
{/* PAGE HEADER */} <div className="mb-8 flex items-center justify-between gap-4"> <div className="flex items-center gap-3"> <div className="w-11 h-11 rounded-xl bg-pink-50 flex items-center justify-center"> <ClipboardList
           size={22}
           className="text-pink-600"
         /> </div>


      <div>
        <h1 className="text-3xl font-bold text-gray-800">
          Medical History
        </h1>

        <p className="text-gray-500 mt-1">
          Keep track of your medical conditions and history.
        </p>
      </div>
    </div>

    <button
      type="button"
      onClick={handleAdd}
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-pink-600 text-white text-sm font-medium hover:bg-pink-700 transition"
    >
      <Plus size={17} />
      Add History
    </button>
  </div>

  {/* ERROR */}
  {error && (
    <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-600 flex items-start gap-2.5">
      <AlertCircle
        size={18}
        className="mt-0.5 flex-shrink-0"
      />
      <p className="text-sm">{error}</p>
    </div>
  )}

  {/* RECORDS */}
  {records.length === 0 ? (
    <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
      <div className="w-12 h-12 rounded-xl bg-pink-50 flex items-center justify-center mx-auto mb-4">
        <ClipboardList
          size={22}
          className="text-pink-600"
        />
      </div>

      <h3 className="text-lg font-semibold text-gray-800">
        No medical history yet
      </h3>

      <p className="text-sm text-gray-500 mt-1 mb-5">
        Add your medical conditions and history to keep
        your records organized.
      </p>

      <button
        type="button"
        onClick={handleAdd}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-pink-600 text-white text-sm font-medium hover:bg-pink-700 transition"
      >
        <Plus size={17} />
        Add Medical History
      </button>
    </div>
  ) : (
    <div className="space-y-3">
      {records.map((record) => (
        <div
          key={record.medical_history_id}
          className="bg-white border border-gray-200 rounded-2xl px-5 py-4 hover:shadow-sm transition"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* SUMMARY */}
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center flex-shrink-0">
                <ClipboardList
                  size={19}
                  className="text-pink-600"
                />
              </div>

              <div className="min-w-0">
                <h3 className="text-base font-semibold text-gray-800 truncate">
                  {record.condition_name}
                </h3>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-gray-500">
                  {record.status && (
                    <span>{record.status}</span>
                  )}

                  {record.status &&
                    record.diagnosed_date && (
                      <span className="text-gray-300">
                        •
                      </span>
                    )}

                  {record.diagnosed_date && (
                    <span className="flex items-center gap-1.5">
                      <CalendarDays size={13} />
                      Diagnosed{" "}
                      {formatDate(
                        record.diagnosed_date
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* ACTIONS */}
            <div className="flex items-center gap-2 sm:flex-shrink-0">
              <button
                type="button"
                onClick={() =>
                  setSelectedRecord(record)
                }
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium text-pink-600 hover:bg-pink-50 transition"
              >
                <FileText size={16} />
                View
              </button>

              <button
                type="button"
                onClick={() => handleEdit(record)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
              >
                <Pencil size={16} />
                Edit
              </button>

              <button
                type="button"
                onClick={() =>
                  handleDelete(
                    record.medical_history_id
                  )
                }
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition"
              >
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )}

  {/* VIEW DETAILS MODAL */}
  {selectedRecord && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={() => setSelectedRecord(null)}
      />

      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              Medical History Details
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              Complete information about this record.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setSelectedRecord(null)}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
              Condition
            </p>
            <p className="text-base font-semibold text-gray-800">
              {selectedRecord.condition_name ||
                "Not specified"}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                Status
              </p>
              <p className="text-sm text-gray-700">
                {selectedRecord.status ||
                  "Not specified"}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                Diagnosed Date
              </p>
              <p className="text-sm text-gray-700">
                {formatDate(
                  selectedRecord.diagnosed_date
                )}
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
              Description
            </p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {selectedRecord.description ||
                "No description provided."}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
              Medication History
            </p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {selectedRecord.medication_history ||
                "No medication history provided."}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
              Notes
            </p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {selectedRecord.notes ||
                "No additional notes."}
            </p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              const record = selectedRecord;
              setSelectedRecord(null);
              handleEdit(record);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-pink-600 text-white text-sm font-medium hover:bg-pink-700 transition"
          >
            <Pencil size={16} />
            Edit
          </button>

          <button
            type="button"
            onClick={() =>
              setSelectedRecord(null)
            }
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-600 text-sm font-medium hover:bg-gray-50 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )}

  {/* ADD / EDIT MODAL */}
  {showModal && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={() => {
          if (!saving) {
            setShowModal(false);
          }
        }}
      />

      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              {editingRecord
                ? "Edit Medical History"
                : "Add Medical History"}
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              {editingRecord
                ? "Update your medical history details."
                : "Add a medical condition to your records."}
            </p>
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={() => setShowModal(false)}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-5">
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Medical Condition
              </label>

              <div className="relative">
                <ClipboardList
                  size={17}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  type="text"
                  name="condition_name"
                  value={formData.condition_name}
                  onChange={handleChange}
                  placeholder="e.g. Anemia"
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-100 focus:border-pink-400 transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Diagnosed Date
                </label>

                <input
                  type="date"
                  name="diagnosed_date"
                  value={formData.diagnosed_date}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-100 focus:border-pink-400 transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>

                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-100 focus:border-pink-400 transition"
                >
                  <option value="Active">
                    Active
                  </option>
                  <option value="Resolved">
                    Resolved
                  </option>
                  <option value="Chronic">
                    Chronic
                  </option>
                  <option value="Inactive">
                    Inactive
                  </option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>

              <textarea
                name="description"
                rows="3"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe the condition..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-700 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-pink-100 focus:border-pink-400 transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Medication History
              </label>

              <div className="relative">
                <Pill
                  size={17}
                  className="absolute left-4 top-4 text-gray-400"
                />

                <textarea
                  name="medication_history"
                  rows="3"
                  value={
                    formData.medication_history
                  }
                  onChange={handleChange}
                  placeholder="Mention related medications..."
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 text-gray-700 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-pink-100 focus:border-pink-400 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>

              <div className="relative">
                <StickyNote
                  size={17}
                  className="absolute left-4 top-4 text-gray-400"
                />

                <textarea
                  name="notes"
                  rows="3"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Any additional notes..."
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 text-gray-700 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-pink-100 focus:border-pink-400 transition"
                />
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => setShowModal(false)}
              className="px-5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-600 text-sm font-medium hover:bg-gray-50 transition disabled:opacity-60"
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
                  <CheckCircle2 size={17} />
                  {editingRecord
                    ? "Save Changes"
                    : "Add History"}
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

export default Medicalhistory;
