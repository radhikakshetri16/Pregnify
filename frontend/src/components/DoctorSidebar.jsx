import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Settings,
  LogOut,
} from "lucide-react";

function DoctorSidebar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Remove the logged-in doctor from browser storage
    localStorage.removeItem("doctor");

    // Return to doctor login page with history replacement
    navigate("/doctor/login", { replace: true });
  };

  return (
    <aside className="w-64 min-h-screen bg-white border-r border-gray-200 p-5 flex flex-col justify-between">
      <div>
        {/* Logo */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-pink-600">
            Pregnify
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            Doctor Portal
          </p>
        </div>

        {/* Navigation */}
        <nav className="space-y-2">
          {/* Dashboard */}
          <NavLink
            to="/doctor/dashboard"
            className={({ isActive }) =>
              `w-full flex items-center gap-3 px-4 py-3 rounded-lg ${
                isActive
                  ? "bg-pink-50 text-pink-600 font-medium"
                  : "text-gray-600 hover:bg-gray-50"
              }`
            }
          >
            <LayoutDashboard size={20} />
            Dashboard
          </NavLink>

          {/* My Patients */}
          <NavLink
            to="/doctor/patients"
            className={({ isActive }) =>
              `w-full flex items-center gap-3 px-4 py-3 rounded-lg ${
                isActive
                  ? "bg-pink-50 text-pink-600 font-medium"
                  : "text-gray-600 hover:bg-gray-50"
              }`
            }
          >
            <Users size={20} />
            My Patients
          </NavLink>

          {/* Appointments */}
          <NavLink
            to="/doctor/appointments"
            className={({ isActive }) =>
              `w-full flex items-center gap-3 px-4 py-3 rounded-lg ${
                isActive
                  ? "bg-pink-50 text-pink-600 font-medium"
                  : "text-gray-600 hover:bg-gray-50"
              }`
            }
          >
            <CalendarDays size={20} />
            Appointments
          </NavLink>

          {/* Settings */}
          <NavLink
            to="/doctor/settings"
            className={({ isActive }) =>
              `w-full flex items-center gap-3 px-4 py-3 rounded-lg ${
                isActive
                  ? "bg-pink-50 text-pink-600 font-medium"
                  : "text-gray-600 hover:bg-gray-50"
              }`
            }
          >
            <Settings size={20} />
            Settings
          </NavLink>
        </nav>
      </div>

      {/* Logout */}
      <div className="mt-10 pt-5 border-t border-gray-200">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-500 hover:bg-red-50 transition"
        >
          <LogOut size={20} />
          Logout
        </button>
      </div>
    </aside>
  );
}

export default DoctorSidebar;
