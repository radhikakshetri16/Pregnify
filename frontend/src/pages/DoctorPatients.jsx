import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Search,
  Calendar,
  Phone,
  MapPin,
  AlertCircle,
} from "lucide-react";

function DoctorPatients() {
  const doctor = JSON.parse(localStorage.getItem("doctor"));

  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchPatients = async () => {
    if (!doctor?.doctor_id) return;

    try {
      const response = await fetch(
        `http://127.0.0.1:5000/api/doctors/${doctor.doctor_id}/patients`
      );
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to load connected patients.");
        return;
      }

      setPatients(data.patients || []);
    } catch (err) {
      console.error(err);
      setError("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const filteredPatients = patients.filter((p) => {
    const q = searchTerm.toLowerCase();
    return (
      p.patient_name?.toLowerCase().includes(q) ||
      p.phone?.toLowerCase().includes(q) ||
      p.address?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">
          My Patients
        </h1>
        <p className="text-gray-500 mt-2">
          Patients who have booked appointments and consultations with you.
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6">
        <div className="relative w-full sm:w-96">
          <Search
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search within my patients..."
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
        </div>
      </div>

      {/* Patients Grid */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <p className="text-gray-500">Loading patients...</p>
        </div>
      ) : filteredPatients.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <Users size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-800">
            No Associated Patients
          </h3>
          <p className="text-gray-500 mt-2 text-sm">
            {searchTerm
              ? "No patients match your search."
              : "Patients with scheduled or completed appointments will appear here."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPatients.map((p) => (
            <div
              key={p.patient_id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="font-bold text-gray-800 text-lg">
                      {p.patient_name}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {p.gender || "Female"}
                      {p.age ? ` • ${p.age} years old` : ""}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 bg-pink-50 text-pink-600 text-xs font-medium rounded-lg">
                    {p.relationship_type || "Self"}
                  </span>
                </div>

                <div className="space-y-2 text-xs text-gray-600 bg-gray-50 p-3.5 rounded-xl mb-4">
                  {p.phone && (
                    <div className="flex items-center gap-2">
                      <Phone size={13} className="text-gray-400 shrink-0" />
                      <span>{p.phone}</span>
                    </div>
                  )}

                  {p.address && (
                    <div className="flex items-center gap-2">
                      <MapPin size={13} className="text-gray-400 shrink-0" />
                      <span className="truncate">{p.address}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Calendar size={13} className="text-gray-400 shrink-0" />
                    <span>
                      Latest Appointment:{" "}
                      <strong>{p.last_appointment_date || "—"}</strong>
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {p.total_appointments} appointment(s)
                </span>

                <Link
                  to={`/doctor/patients/${p.patient_id}`}
                  className="text-xs font-medium text-pink-600 hover:underline"
                >
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default DoctorPatients;
