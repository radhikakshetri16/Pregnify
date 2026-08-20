import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  HeartPulse,
  Activity,
  CalendarDays,
  Pill,
  FileText,
  MessageCircle,
  Settings,
  LogOut,
} from "lucide-react";

function Sidebar() {
  return (
    <aside className="w-64 min-h-screen bg-white border-r border-gray-200 p-5">
      
      {/* Logo */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-pink-600">
          Pregnify
        </h1>

        <p className="text-sm text-gray-500 mt-1">
          Pregnancy Health Tracker
        </p>
      </div>

      {/* Navigation */}
<nav className="space-y-2">

  <NavLink
    to="/"
    className={({ isActive }) =>
      `w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium ${
        isActive
          ? "bg-pink-50 text-pink-600"
          : "text-gray-600 hover:bg-gray-50"
      }`
    }
  >
    <LayoutDashboard size={20} />
    Dashboard
  </NavLink>

  <NavLink
    to="/pregnancy"
    className={({ isActive }) =>
      `w-full flex items-center gap-3 px-4 py-3 rounded-lg ${
        isActive
          ? "bg-pink-50 text-pink-600 font-medium"
          : "text-gray-600 hover:bg-gray-50"
      }`
    }
  >
    <HeartPulse size={20} />
    Pregnancy
  </NavLink>

  <NavLink
  to="/health"
  className={({ isActive }) =>
    `w-full flex items-center gap-3 px-4 py-3 rounded-lg ${
      isActive
        ? "bg-pink-50 text-pink-600 font-medium"
        : "text-gray-600 hover:bg-gray-50"
    }`
  }
>
  <Activity size={20} />
  Health
</NavLink>

  <NavLink
    to="/appointments"
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

  <NavLink
    to="/medicines"
    className={({ isActive }) =>
      `w-full flex items-center gap-3 px-4 py-3 rounded-lg ${
        isActive
          ? "bg-pink-50 text-pink-600 font-medium"
          : "text-gray-600 hover:bg-gray-50"
      }`
    }
  >
    <Pill size={20} />
    Medicines
  </NavLink>

  <NavLink
    to="/reports"
    className={({ isActive }) =>
      `w-full flex items-center gap-3 px-4 py-3 rounded-lg ${
        isActive
          ? "bg-pink-50 text-pink-600 font-medium"
          : "text-gray-600 hover:bg-gray-50"
      }`
    }
  >
    <FileText size={20} />
    Reports
  </NavLink>

  <NavLink
    to="/messages"
    className={({ isActive }) =>
      `w-full flex items-center gap-3 px-4 py-3 rounded-lg ${
        isActive
          ? "bg-pink-50 text-pink-600 font-medium"
          : "text-gray-600 hover:bg-gray-50"
      }`
    }
  >
    <MessageCircle size={20} />
    Messages
  </NavLink>

  <NavLink
    to="/settings"
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

      {/* Logout */}
      <div className="mt-10 pt-5 border-t border-gray-200">
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-500 hover:bg-red-50">
          <LogOut size={20} />
          Logout
        </button>
      </div>

    </aside>
  );
}

export default Sidebar;