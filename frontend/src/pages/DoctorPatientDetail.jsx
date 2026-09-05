import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  HeartPulse,
  Activity,
  CalendarDays,
  Pill,
  User,
  Phone,
  MapPin,
  Clock,
  AlertCircle,
} from "lucide-react";

function DoctorPatientDetail() {
  const { patientId } = useParams();
  const doctor = JSON.parse(localStorage.getItem("doctor"));

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchPatientDetail = async () => {
    if (!doctor?.doctor_id || !patientId) return;

    try {
      const response = await fetch(
        `http://127.0.0.1:5000/api/doctors/${doctor.doctor_id}/patients/${patientId}`
      );
      const resData = await response.json();

      if (!response.ok) {
        setError(resData.error || "Unable to load patient record.");
        return;
      }

      setData(resData);
    } catch (err) {
      console.error(err);
      setError("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatientDetail();
  }, [patientId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-500">Loading patient details...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto">
        <Link
          to="/doctor/patients"
          className="inline-flex items-center gap-2 text-sm text-pink-600 font-medium hover:underline mb-6"
        >
          <ArrowLeft size={16} /> Back to My Patients
        </Link>
        <div className="bg-red-50 border border-red-200 text-red-600 p-6 rounded-2xl flex items-center gap-3">
          <AlertCircle size={24} />
          <div>
            <h3 className="font-bold">Access Error</h3>
            <p className="text-sm mt-1">{error || "Patient not found."}</p>
          </div>
        </div>
      </div>
    );
  }

  const { patient, pregnancy, appointments, health_logs, medications } = data;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Back Button */}
      <Link
        to="/doctor/patients"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 font-medium mb-6 transition"
      >
        <ArrowLeft size={16} /> Back to My Patients
      </Link>

      {/* Patient Header Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-pink-50 rounded-xl">
              <User className="text-pink-600" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                {patient.patient_name}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {patient.gender || "Female"} • {patient.age ? `${patient.age} years old` : "Age not specified"}
              </p>
            </div>
          </div>

          <span className="px-3 py-1 bg-pink-50 text-pink-600 text-xs font-medium rounded-lg self-start sm:self-auto">
            Relationship: {patient.relationship_type || "Self"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 text-sm">
          <div className="flex items-center gap-2.5 text-gray-600">
            <Phone size={16} className="text-gray-400" />
            <span>Phone: <strong>{patient.phone || "Not recorded"}</strong></span>
          </div>

          <div className="flex items-center gap-2.5 text-gray-600">
            <MapPin size={16} className="text-gray-400" />
            <span>Address: <strong>{patient.address || "Not recorded"}</strong></span>
          </div>
        </div>
      </div>

      {/* Pregnancy Information Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7 mb-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 bg-pink-50 rounded-xl">
            <HeartPulse className="text-pink-600" size={22} />
          </div>
          <h2 className="font-semibold text-gray-800 text-lg">
            Active Pregnancy Record
          </h2>
        </div>

        {pregnancy ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-xl">
              <span className="text-xs text-gray-500 font-medium block">
                Last Menstrual Period (LMP)
              </span>
              <span className="text-base font-bold text-gray-800 mt-1 block">
                {pregnancy.last_menstrual_date}
              </span>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl">
              <span className="text-xs text-gray-500 font-medium block">
                Estimated Due Date (EDD)
              </span>
              <span className="text-base font-bold text-gray-800 mt-1 block">
                {pregnancy.due_date}
              </span>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl">
              <span className="text-xs text-gray-500 font-medium block">
                Pregnancy Status
              </span>
              <span className="text-base font-bold text-gray-800 mt-1 block">
                {pregnancy.pregnancy_status}
              </span>
            </div>

            {pregnancy.notes && (
              <div className="sm:col-span-3 mt-2 text-xs text-gray-600 bg-gray-50 p-3 rounded-xl">
                <strong>Notes:</strong> {pregnancy.notes}
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">
            No active pregnancy profile recorded for this patient.
          </p>
        )}
      </div>

      {/* Appointment History with Doctor */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7 mb-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 bg-purple-50 rounded-xl">
            <CalendarDays className="text-purple-600" size={22} />
          </div>
          <h2 className="font-semibold text-gray-800 text-lg">
            Consultation History
          </h2>
        </div>

        {appointments?.length === 0 ? (
          <p className="text-gray-400 text-sm">No appointment history found.</p>
        ) : (
          <div className="space-y-3">
            {appointments.map((apt) => (
              <div
                key={apt.appointment_id}
                className="p-4 bg-gray-50 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm"
              >
                <div>
                  <div className="flex items-center gap-2 font-semibold text-gray-800">
                    <span>{apt.appointment_date}</span>
                    <span className="text-gray-400 font-normal">at</span>
                    <span>{apt.appointment_time}</span>
                    <span className="text-xs px-2.5 py-0.5 bg-gray-200 text-gray-700 rounded-md ml-2">
                      {apt.appointment_type}
                    </span>
                  </div>
                  {apt.reason && (
                    <p className="text-xs text-gray-600 mt-1">
                      <strong>Reason:</strong> {apt.reason}
                    </p>
                  )}
                  {apt.doctor_notes && (
                    <p className="text-xs text-gray-700 mt-1 bg-white p-2.5 rounded-lg border border-gray-100">
                      <strong>Doctor Notes:</strong> {apt.doctor_notes}
                    </p>
                  )}
                </div>

                <span
                  className={`px-3 py-1 rounded-lg text-xs font-medium self-start sm:self-center ${
                    apt.status === "Completed"
                      ? "bg-green-50 text-green-600"
                      : apt.status === "Confirmed"
                      ? "bg-blue-50 text-blue-600"
                      : apt.status === "Cancelled"
                      ? "bg-red-50 text-red-600"
                      : "bg-amber-50 text-amber-600"
                  }`}
                >
                  {apt.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Health Logs */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7 mb-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 bg-green-50 rounded-xl">
            <Activity className="text-green-600" size={22} />
          </div>
          <h2 className="font-semibold text-gray-800 text-lg">
            Recent Health Logs
          </h2>
        </div>

        {health_logs?.length === 0 ? (
          <p className="text-gray-400 text-sm">
            No health logs recorded yet.
          </p>
        ) : (
          <div className="space-y-3">
            {health_logs.map((log) => (
              <div
                key={log.healthlog_id}
                className="p-4 bg-gray-50 rounded-xl text-sm"
              >
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-200/60">
                  <span className="font-semibold text-gray-700 text-xs flex items-center gap-1.5">
                    <Clock size={13} /> {log.log_date}
                  </span>
                  {log.weight && (
                    <span className="text-xs font-bold text-gray-800">
                      Weight: {log.weight} kg
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600">
                  {log.sleep_hours && (
                    <div>
                      <strong>Sleep:</strong> {log.sleep_hours} hrs
                    </div>
                  )}
                  {log.hydration && (
                    <div>
                      <strong>Hydration:</strong> {log.hydration}
                    </div>
                  )}
                  {log.symptoms && (
                    <div className="sm:col-span-2 text-red-600">
                      <strong>Symptoms:</strong> {log.symptoms}
                    </div>
                  )}
                  {log.nutrition_notes && (
                    <div className="sm:col-span-2 text-gray-700">
                      <strong>Nutrition Notes:</strong> {log.nutrition_notes}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Prescribed Medications */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 bg-blue-50 rounded-xl">
            <Pill className="text-blue-600" size={22} />
          </div>
          <h2 className="font-semibold text-gray-800 text-lg">
            Prescribed Medications
          </h2>
        </div>

        {medications?.length === 0 ? (
          <p className="text-gray-400 text-sm">
            No medications recorded for this patient under your consultation.
          </p>
        ) : (
          <div className="space-y-3">
            {medications.map((m) => (
              <div
                key={m.medication_id}
                className="p-4 bg-gray-50 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm"
              >
                <div>
                  <h4 className="font-semibold text-gray-800">
                    {m.medication_name}
                  </h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {m.dosage} • {m.frequency}
                  </p>
                  {m.instructions && (
                    <p className="text-xs text-gray-600 mt-1">
                      <strong>Instructions:</strong> {m.instructions}
                    </p>
                  )}
                </div>

                <span
                  className={`px-3 py-1 rounded-lg text-xs font-medium self-start sm:self-center ${
                    m.status === "Active"
                      ? "bg-green-50 text-green-600"
                      : "bg-gray-200 text-gray-700"
                  }`}
                >
                  {m.status || "Active"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default DoctorPatientDetail;
