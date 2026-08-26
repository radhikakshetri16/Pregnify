import { useEffect, useState } from "react";

function DoctorDashboard() {
  const [doctor, setDoctor] = useState(null);

  useEffect(() => {
    const storedDoctor = localStorage.getItem("doctor");

    if (storedDoctor) {
      setDoctor(JSON.parse(storedDoctor));
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">
          Doctor Dashboard
        </h1>

        <p className="text-gray-500 mt-2">
          Welcome back
          {doctor?.name ? `, ${doctor.name}` : ""}
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">

        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm text-gray-500">
            Today's Appointments
          </p>

          <h2 className="text-3xl font-bold text-gray-800 mt-2">
            0
          </h2>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm text-gray-500">
            Upcoming Appointments
          </p>

          <h2 className="text-3xl font-bold text-gray-800 mt-2">
            0
          </h2>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm text-gray-500">
            My Patients
          </p>

          <h2 className="text-3xl font-bold text-gray-800 mt-2">
            0
          </h2>
        </div>

      </div>

      {/* Today's Appointments */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-8">

        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Today's Appointments
        </h2>

        <div className="text-gray-500 text-center py-10">
          No appointments for today.
        </div>

      </div>

      {/* Upcoming Appointments */}
      <div className="bg-white rounded-xl shadow-sm p-6">

        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Upcoming Appointments
        </h2>

        <div className="text-gray-500 text-center py-10">
          No upcoming appointments.
        </div>

      </div>

    </div>
  );
}

export default DoctorDashboard;