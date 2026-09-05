import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Stethoscope,
  Users,
  Settings,
  LogOut,
} from "lucide-react";

function AdminSidebar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Remove the logged-in admin from browser storage
    localStorage.removeItem("admin");

    // Return to admin login page with history replacement
    navigate("/admin/login", { replace: true });
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
            Admin Portal
          </p>
        </div>

        {/* Navigation */}
        <nav className="space-y-2">
          {/* Dashboard (Monitor System) */}
          <NavLink
            to="/admin/dashboard"
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

          {/* Manage Users / Patients */}
          <NavLink
            to="/admin/users"
            className={({ isActive }) =>
              `w-full flex items-center gap-3 px-4 py-3 rounded-lg ${
                isActive
                  ? "bg-pink-50 text-pink-600 font-medium"
                  : "text-gray-600 hover:bg-gray-50"
              }`
            }
          >
            <Users size={20} />
            Users / Patients
          </NavLink>

          {/* Manage Doctors */}
          <NavLink
            to="/admin/doctors"
            className={({ isActive }) =>
              `w-full flex items-center gap-3 px-4 py-3 rounded-lg ${
                isActive
                  ? "bg-pink-50 text-pink-600 font-medium"
                  : "text-gray-600 hover:bg-gray-50"
              }`
            }
          >
            <Stethoscope size={20} />
            Doctors
          </NavLink>

          {/* Settings */}
          <NavLink
            to="/admin/settings"
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

export default AdminSidebar;
