import { useAuth } from "../context/AuthContext";

function Settings() {
  const { user, signOut } = useAuth();

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">
          Account Settings
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Manage your user profile and authentication session.
        </p>
      </div>

      <div className="bg-white rounded-xl p-6 border border-zinc-200 space-y-4">
        <h2 className="text-base font-semibold text-zinc-900">
          User Profile
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-100">
            <span className="text-zinc-500 block">Full Name</span>
            <span className="font-semibold text-zinc-800 mt-0.5 block">
              {user?.fullName || user?.firstName || "User"}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-100">
            <span className="text-zinc-500 block">Email Address</span>
            <span className="font-semibold text-zinc-800 mt-0.5 block">
              {user?.email || "Authenticated"}
            </span>
          </div>
        </div>

        <div className="pt-4 border-t border-zinc-100 flex items-center justify-between">
          <span className="text-xs text-zinc-500">
            Authentication Provider: Google / Clerk Session
          </span>

          <button
            onClick={() => signOut()}
            className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-medium transition"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

export default Settings;