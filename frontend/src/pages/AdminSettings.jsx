import { useState } from "react";
import { Lock, Check, AlertCircle, User } from "lucide-react";
import { checkPasswordRequirements } from "../utils/validation";

function AdminSettings() {
  const admin = JSON.parse(localStorage.getItem("admin"));

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    const pwCheck = checkPasswordRequirements(newPassword);
    if (!pwCheck.isValid) {
      setError(pwCheck.errorMessage);
      return;
    }

    if (!admin?.admin_id) {
      setError("Admin session not found.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "http://127.0.0.1:5000/api/admin/change-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            admin_id: admin.admin_id,
            current_password: currentPassword,
            new_password: newPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to update password.");
        return;
      }

      setSuccess("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error(err);
      setError("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">
          Settings
        </h1>
        <p className="text-gray-500 mt-2">
          Manage your administrator profile and account settings.
        </p>
      </div>

      {/* Account Info Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7 mb-6">
        <div className="flex items-center gap-4 mb-6 pb-5 border-b border-gray-100">
          <div className="p-3 bg-pink-50 rounded-xl">
            <User className="text-pink-600" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              {admin?.name || "Administrator"}
            </h2>
            <p className="text-sm text-gray-500">{admin?.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="p-4 bg-gray-50 rounded-xl">
            <span className="text-xs text-gray-500 font-medium block">
              Role
            </span>
            <span className="text-sm font-semibold text-gray-800 mt-1 block">
              System Administrator
            </span>
          </div>

          <div className="p-4 bg-gray-50 rounded-xl">
            <span className="text-xs text-gray-500 font-medium block">
              Admin ID
            </span>
            <span className="text-sm font-semibold text-gray-800 mt-1 block">
              #{admin?.admin_id || 1}
            </span>
          </div>
        </div>
      </div>

      {/* Change Password Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-pink-50 rounded-xl">
            <Lock className="text-pink-600" size={22} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 text-lg">
              Change Password
            </h3>
            <p className="text-sm text-gray-500">
              Update your administrator password
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-5 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-5 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
            <Check size={18} />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-pink-600 text-white font-medium rounded-lg hover:bg-pink-700 disabled:opacity-50 transition cursor-pointer mt-2"
          >
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AdminSettings;
