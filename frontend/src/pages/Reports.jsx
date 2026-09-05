import { useEffect, useState } from "react";
import {
  FileText,
  Plus,
  X,
  Trash2,
  CalendarDays,
  Upload,
  File,
  AlertCircle,
  ExternalLink,
  Clock3,
} from "lucide-react";

const API_URL = "http://127.0.0.1:5000/api";

function Reports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Upload modal
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // View report modal
  const [selectedReport, setSelectedReport] = useState(null);

  const [formData, setFormData] = useState({
    report_title: "",
    report_type: "",
    report_date: "",
    notes: "",
    file: null,
  });

  // =========================================================
  // GET LOGGED-IN USER
  // =========================================================
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

  // =========================================================
  // FETCH REPORTS
  // =========================================================
  const fetchReports = async () => {
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
        `${API_URL}/reports?user_id=${user.id}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to load reports."
        );
      }

      setReports(data.reports || []);
    } catch (error) {
      console.error("Reports error:", error);

      setError(
        error.message ||
          "Unable to load reports. Please make sure the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // LOAD REPORTS
  // =========================================================
  useEffect(() => {
    fetchReports();
  }, []);

  // =========================================================
  // OPEN UPLOAD MODAL
  // =========================================================
  const handleAdd = () => {
    setFormData({
      report_title: "",
      report_type: "",
      report_date: "",
      notes: "",
      file: null,
    });

    setFormError("");
    setShowModal(true);
  };

  // =========================================================
  // INPUT CHANGE
  // =========================================================
  const handleChange = (event) => {
    const {
      name,
      value,
      files,
    } = event.target;

    if (name === "file") {
      setFormData((previous) => ({
        ...previous,
        file: files?.[0] || null,
      }));

      return;
    }

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setFormError("");
  };

  // =========================================================
  // UPLOAD REPORT
  // =========================================================
  const handleSubmit = async (event) => {
    event.preventDefault();

    setFormError("");

    const user = getLoggedInUser();

    if (!user || !user.id) {
      setFormError(
        "Unable to identify the logged-in user."
      );
      return;
    }

    // -------------------------------------------------------
    // VALIDATION
    // -------------------------------------------------------
    if (!formData.report_title.trim()) {
      setFormError("Please enter a report title.");
      return;
    }

    if (!formData.report_type.trim()) {
      setFormError("Please enter the report type.");
      return;
    }

    if (!formData.report_date) {
      setFormError("Please select the report date.");
      return;
    }

    if (!formData.file) {
      setFormError("Please select a report file.");
      return;
    }

    setSaving(true);

    try {
      const body = new FormData();

      // Send USER ID.
      // Backend resolves the PATIENT ID.
      body.append("user_id", user.id);

      body.append(
        "report_title",
        formData.report_title.trim()
      );

      body.append(
        "report_type",
        formData.report_type.trim()
      );

      body.append(
        "report_date",
        formData.report_date
      );

      body.append(
        "notes",
        formData.notes.trim()
      );

      body.append(
        "file",
        formData.file
      );

      const response = await fetch(
        `${API_URL}/reports`,
        {
          method: "POST",
          body,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to upload report."
        );
      }

      setShowModal(false);

      await fetchReports();
    } catch (error) {
      console.error(
        "Upload report error:",
        error
      );

      setFormError(
        error.message ||
          "Something went wrong while uploading the report."
      );
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // DELETE REPORT
  // =========================================================
  const handleDelete = async (reportId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this report?"
    );

    if (!confirmed) {
      return;
    }

    const user = getLoggedInUser();

    if (!user || !user.id) {
      setError(
        "Unable to identify the logged-in user."
      );
      return;
    }

    try {
      setError("");

      const response = await fetch(
        `${API_URL}/reports/${reportId}?user_id=${user.id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to delete report."
        );
      }

      // Close view modal if deleted report was open
      if (
        selectedReport &&
        selectedReport.report_id === reportId
      ) {
        setSelectedReport(null);
      }

      await fetchReports();
    } catch (error) {
      console.error(
        "Delete report error:",
        error
      );

      setError(
        error.message ||
          "Something went wrong while deleting the report."
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

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
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
  // FORMAT UPLOADED DATE/TIME
  // =========================================================
  const formatUploadedAt = (date) => {
    if (!date) {
      return "Not available";
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return date;
    }

    return parsedDate.toLocaleString(
      "en-US",
      {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }
    );
  };

  // =========================================================
  // GET FILE URL
  // =========================================================
  const getFileUrl = (reportId) => {
    const user = getLoggedInUser();

    if (!user || !user.id) {
      return "#";
    }

    return (
      `${API_URL}/reports/` +
      `${reportId}/file?user_id=${user.id}`
    );
  };

  // =========================================================
  // GET FILE NAME
  // =========================================================
  const getFileName = (filePath) => {
    if (!filePath) {
      return "Attached report";
    }

    const normalizedPath = filePath.replace(
      /\\/g,
      "/"
    );

    const parts = normalizedPath.split("/");

    return parts[parts.length - 1] || "Attached report";
  };

  // =========================================================
  // VIEW REPORT DETAILS
  // =========================================================
  const handleViewReport = (report) => {
    setSelectedReport(report);
  };

  // =========================================================
  // LOADING
  // =========================================================
  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
          <div className="w-8 h-8 border-2 border-pink-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />

          <p className="text-gray-500">
            Loading reports...
          </p>
        </div>
      </div>
    );
  }

  // =========================================================
  // MAIN UI
  // =========================================================
  return (
    <div className="max-w-6xl mx-auto pb-10">

      {/* =====================================================
          PAGE HEADER
      ===================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">

        <div className="flex items-center gap-3">

          <div className="w-11 h-11 rounded-xl bg-pink-50 flex items-center justify-center">
            <FileText
              className="text-pink-600"
              size={23}
            />
          </div>

          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              Reports
            </h1>

            <p className="text-gray-500 mt-1">
              Store and access your medical reports in one place.
            </p>
          </div>

        </div>

        <button
          type="button"
          onClick={handleAdd}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-pink-600 text-white font-medium hover:bg-pink-700 transition shadow-sm"
        >
          <Plus size={19} />
          Upload Report
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
          EMPTY STATE
      ===================================================== */}
      {reports.length === 0 ? (

        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">

          <div className="w-16 h-16 mx-auto rounded-2xl bg-pink-50 flex items-center justify-center mb-5">

            <FileText
              size={30}
              className="text-pink-600"
            />

          </div>

          <h2 className="text-xl font-semibold text-gray-800">
            No reports yet
          </h2>

          <p className="text-gray-500 mt-2 max-w-md mx-auto">
            Upload medical reports such as laboratory
            results, ultrasound reports, scans, or other
            pregnancy-related documents.
          </p>

          <button
            type="button"
            onClick={handleAdd}
            className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-pink-600 text-white font-medium hover:bg-pink-700 transition"
          >
            <Plus size={18} />
            Upload Report
          </button>

        </div>

      ) : (

        /* ===================================================
           REPORT LIST
        =================================================== */
        <div>

          {/* Section heading */}
          <div className="mb-4">

            <h2 className="text-lg font-semibold text-gray-800">
              Medical Reports
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              {reports.length}{" "}
              {reports.length === 1
                ? "report"
                : "reports"}{" "}
              found
            </p>

          </div>

          {/* =================================================
              COMPACT REPORT GRID
          ================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {reports.map((report) => (

              <div
                key={report.report_id}
                className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-sm transition"
              >

                {/* -----------------------------------------
                    TOP
                ------------------------------------------ */}
                <div className="flex items-start justify-between gap-4">

                  <div className="flex items-start gap-3 min-w-0">

                    <div className="w-11 h-11 rounded-xl bg-pink-50 flex items-center justify-center flex-shrink-0">

                      <FileText
                        size={21}
                        className="text-pink-600"
                      />

                    </div>

                    <div className="min-w-0">

                      <h3 className="text-base font-semibold text-gray-800 truncate">
                        {report.report_title}
                      </h3>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-gray-500">

                        <span>
                          {report.report_type}
                        </span>

                        <span className="flex items-center gap-1">

                          <CalendarDays
                            size={13}
                          />

                          {formatDate(
                            report.report_date
                          )}

                        </span>

                      </div>

                    </div>

                  </div>

                </div>

                {/* -----------------------------------------
                    ATTACHED FILE
                ------------------------------------------ */}
                <div className="mt-4 flex items-center gap-2.5 p-3 rounded-xl bg-gray-50 border border-gray-100">

                  <File
                    size={17}
                    className="text-gray-400 flex-shrink-0"
                  />

                  <p className="text-sm text-gray-600 truncate">
                    {getFileName(
                      report.file_path
                    )}
                  </p>

                </div>

                {/* -----------------------------------------
                    ACTIONS
                ------------------------------------------ */}
                <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-gray-100">

                  <button
                    type="button"
                    onClick={() =>
                      handleViewReport(report)
                    }
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-pink-600 hover:bg-pink-50 transition"
                  >

                    <FileText size={16} />

                    View Report

                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleDelete(
                        report.report_id
                      )
                    }
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition"
                  >

                    <Trash2 size={16} />

                    Delete

                  </button>

                </div>

              </div>

            ))}

          </div>

        </div>

      )}

      {/* =====================================================
          UPLOAD REPORT MODAL
      ===================================================== */}
      {showModal && (

        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">

          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => {
              if (!saving) {
                setShowModal(false);
              }
            }}
          />

          {/* Modal */}
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">

              <div>

                <h2 className="text-xl font-semibold text-gray-800">
                  Upload Medical Report
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  Add a medical report to your records.
                </p>

              </div>

              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  setShowModal(false)
                }
                className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
              >

                <X size={20} />

              </button>

            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>

              <div className="p-6 space-y-5">

                {/* Form Error */}
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

                {/* Report Title */}
                <div>

                  <label
                    htmlFor="report_title"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Report Title
                    <span className="text-pink-600 ml-1">
                      *
                    </span>
                  </label>

                  <input
                    id="report_title"
                    name="report_title"
                    type="text"
                    value={
                      formData.report_title
                    }
                    onChange={handleChange}
                    placeholder="e.g. Blood Test Report"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-100 focus:border-pink-400 transition"
                  />

                </div>

                {/* Type + Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

                  <div>

                    <label
                      htmlFor="report_type"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Report Type
                      <span className="text-pink-600 ml-1">
                        *
                      </span>
                    </label>

                    <input
                      id="report_type"
                      name="report_type"
                      type="text"
                      value={
                        formData.report_type
                      }
                      onChange={handleChange}
                      placeholder="e.g. Laboratory"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-100 focus:border-pink-400 transition"
                    />

                  </div>

                  <div>

                    <label
                      htmlFor="report_date"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Report Date
                      <span className="text-pink-600 ml-1">
                        *
                      </span>
                    </label>

                    <div className="relative">

                      <CalendarDays
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                      />

                      <input
                        id="report_date"
                        name="report_date"
                        type="date"
                        value={
                          formData.report_date
                        }
                        onChange={handleChange}
                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-100 focus:border-pink-400 transition"
                      />

                    </div>

                  </div>

                </div>

                {/* File */}
                <div>

                  <label
                    htmlFor="file"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Report File
                    <span className="text-pink-600 ml-1">
                      *
                    </span>
                  </label>

                  <label
                    htmlFor="file"
                    className="flex flex-col items-center justify-center w-full min-h-36 px-6 py-6 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-pink-300 hover:bg-pink-50/30 transition"
                  >

                    <Upload
                      size={26}
                      className="text-pink-600 mb-2"
                    />

                    {formData.file ? (

                      <>
                        <p className="text-sm font-medium text-gray-700">
                          {formData.file.name}
                        </p>

                        <p className="text-xs text-gray-400 mt-1">
                          Click to choose a different file
                        </p>
                      </>

                    ) : (

                      <>
                        <p className="text-sm font-medium text-gray-700">
                          Click to upload a report
                        </p>

                        <p className="text-xs text-gray-400 mt-1">
                          PDF, PNG, JPG, JPEG or WEBP
                        </p>
                      </>

                    )}

                    <input
                      id="file"
                      name="file"
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.webp"
                      onChange={handleChange}
                      className="hidden"
                    />

                  </label>

                </div>

                {/* Notes */}
                <div>

                  <label
                    htmlFor="notes"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Notes
                  </label>

                  <textarea
                    id="notes"
                    name="notes"
                    rows="3"
                    value={
                      formData.notes
                    }
                    onChange={handleChange}
                    placeholder="Add any additional notes about this report..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-700 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-pink-100 focus:border-pink-400 transition"
                  />

                </div>

              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-5 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">

                <button
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    setShowModal(false)
                  }
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
                      Uploading...
                    </>

                  ) : (

                    <>
                      <Upload size={17} />
                      Upload Report
                    </>

                  )}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}

      {/* =====================================================
          VIEW REPORT DETAILS MODAL
      ===================================================== */}
      {selectedReport && (

        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">

          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() =>
              setSelectedReport(null)
            }
          />

          {/* Details Modal */}
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">

              <div className="flex items-center gap-3">

                <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center">

                  <FileText
                    size={19}
                    className="text-pink-600"
                  />

                </div>

                <div>

                  <h2 className="text-xl font-semibold text-gray-800">
                    Report Details
                  </h2>

                  <p className="text-sm text-gray-500 mt-0.5">
                    View the information saved with this report.
                  </p>

                </div>

              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedReport(null)
                }
                className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
              >

                <X size={20} />

              </button>

            </div>

            {/* Details */}
            <div className="p-6">

              {/* Report title */}
              <div className="mb-6">

                <p className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-1.5">
                  Report Title
                </p>

                <h3 className="text-xl font-semibold text-gray-800">
                  {selectedReport.report_title}
                </h3>

              </div>

              {/* Basic Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">

                {/* Type */}
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">

                  <p className="text-xs font-medium text-gray-400 mb-1.5">
                    Report Type
                  </p>

                  <p className="text-sm font-medium text-gray-700">
                    {selectedReport.report_type ||
                      "Not specified"}
                  </p>

                </div>

                {/* Date */}
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">

                  <div className="flex items-center gap-2 mb-1.5">

                    <CalendarDays
                      size={14}
                      className="text-gray-400"
                    />

                    <p className="text-xs font-medium text-gray-400">
                      Report Date
                    </p>

                  </div>

                  <p className="text-sm font-medium text-gray-700">
                    {formatDate(
                      selectedReport.report_date
                    )}
                  </p>

                </div>

                {/* Uploaded */}
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 sm:col-span-2">

                  <div className="flex items-center gap-2 mb-1.5">

                    <Clock3
                      size={14}
                      className="text-gray-400"
                    />

                    <p className="text-xs font-medium text-gray-400">
                      Uploaded
                    </p>

                  </div>

                  <p className="text-sm font-medium text-gray-700">
                    {formatUploadedAt(
                      selectedReport.uploaded_at
                    )}
                  </p>

                </div>

              </div>

              {/* Notes / Details */}
              <div className="mb-6">

                <div className="flex items-center gap-2 mb-2">

                  <FileText
                    size={16}
                    className="text-gray-400"
                  />

                  <h3 className="text-sm font-semibold text-gray-700">
                    Description / Notes
                  </h3>

                </div>

                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 min-h-[90px]">

                  {selectedReport.notes ? (

                    <p className="text-sm text-gray-600 leading-6 whitespace-pre-wrap">
                      {selectedReport.notes}
                    </p>

                  ) : (

                    <p className="text-sm text-gray-400">
                      No additional notes were added for this report.
                    </p>

                  )}

                </div>

              </div>

              {/* Attached File */}
              <div>

                <div className="flex items-center gap-2 mb-2">

                  <File
                    size={16}
                    className="text-gray-400"
                  />

                  <h3 className="text-sm font-semibold text-gray-700">
                    Attached File
                  </h3>

                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl border border-gray-200 bg-white">

                  <div className="flex items-center gap-3 min-w-0">

                    <div className="w-10 h-10 rounded-lg bg-pink-50 flex items-center justify-center flex-shrink-0">

                      <File
                        size={18}
                        className="text-pink-600"
                      />

                    </div>

                    <div className="min-w-0">

                      <p className="text-sm font-medium text-gray-700 truncate">
                        {getFileName(
                          selectedReport.file_path
                        )}
                      </p>

                      <p className="text-xs text-gray-400 mt-0.5">
                        Medical report attachment
                      </p>

                    </div>

                  </div>

                  <a
                    href={getFileUrl(
                      selectedReport.report_id
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-pink-600 text-white text-sm font-medium hover:bg-pink-700 transition flex-shrink-0"
                  >

                    <ExternalLink
                      size={16}
                    />

                    Open File

                  </a>

                </div>

              </div>

            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">

              <button
                type="button"
                onClick={() => {
                  handleDelete(
                    selectedReport.report_id
                  );
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition"
              >

                <Trash2 size={16} />

                Delete Report

              </button>

              <button
                type="button"
                onClick={() =>
                  setSelectedReport(null)
                }
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition"
              >
                Close
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

export default Reports;