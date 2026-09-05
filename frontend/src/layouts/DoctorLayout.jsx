import { Navigate, Outlet } from "react-router-dom";
import DoctorSidebar from "../components/DoctorSidebar";

function DoctorLayout() {
  const doctorStr = localStorage.getItem("doctor");

  // Doctor is not logged in
  if (!doctorStr) {
    return <Navigate to="/doctor/login" replace />;
  }

  let doctor = null;
  try {
    doctor = JSON.parse(doctorStr);
  } catch (e) {
    localStorage.removeItem("doctor");
    return <Navigate to="/doctor/login" replace />;
  }

  // If doctor must change password, redirect to change password screen
  if (doctor?.must_change_password) {
    return <Navigate to="/doctor/change-password" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <DoctorSidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}

export default DoctorLayout;
