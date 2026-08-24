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
  SlidersHorizontal,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

function Sidebar() {
  const { user, signOut } = useAuth();

  const navItems = [
    { to: "/", label: "Dashboard", icon: LayoutDashboard },
    { to: "/pregnancy", label: "Pregnancy", icon: HeartPulse },
    { to: "/health", label: "Health", icon: Activity },
    { to: "/appointments", label: "Appointments", icon: CalendarDays },
    { to: "/medicines", label: "Medicines", icon: Pill },
    { to: "/reports", label: "Reports", icon: FileText },
    { to: "/messages", label: "Messages", icon: MessageCircle },
    { to: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <aside className="w-60 min-h-screen bg-white border-r border-zinc-200 p-4 flex flex-col justify-between shrink-0">
      <div>
        {/* Brand */}
        <div className="px-3 py-3 mb-6">
          <h1 className="text-xl font-bold tracking-tight text-zinc-900">
            Pregnify
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Maternal Health Tracker
          </p>
        </div>

        {/* Navigation */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                  }`
                }
              >
                <Icon size={18} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {/* Edit Details Action */}
        <div className="mt-6 pt-4 border-t border-zinc-100 px-1">
          <NavLink
            to="/info"
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition"
          >
            <SlidersHorizontal size={14} />
            Update Vitals
          </NavLink>
        </div>
      </div>

      {/* User Footer */}
      <div className="pt-4 border-t border-zinc-100 space-y-2">
        <div className="px-2 py-1.5 rounded-lg bg-zinc-50 border border-zinc-100">
          <p className="text-xs font-semibold text-zinc-800 truncate">
            {user?.fullName || user?.firstName || "User"}
          </p>
          <p className="text-[11px] text-zinc-400 truncate">
            {user?.email || "Authenticated"}
          </p>
        </div>

        <button
          onClick={() => signOut()}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition"
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;