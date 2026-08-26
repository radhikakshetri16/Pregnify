import { useEffect, useState } from "react";
import {
  Lock,
  Check,
  AlertCircle,
  Mail,
  Phone,
  Award,
  MapPin,
  Banknote,
  User,
} from "lucide-react";
import { checkPasswordRequirements } from "../utils/validation";

function DoctorSettings() {
  const [doctor, setDoctor] = useState(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("doctor");
    if (stored) {
      const parsed = JSON.parse(stored);
      setDoctor(parsed);
      fetchDoctorProfile(parsed.doctor_id);
    }
  }, []);

  const fetchDoctorProfile = async (doctorId) => {
    try {
      const response = await fetch(
        `http://127.0.0.1:5000/api/doctors/${doctorId}`
      );
      const data = await response.json();
      if (response.ok && data.doctor) {
        setDoctor(data.doctor);
      }
    } catch (err) {
      console.error(err);
    }
  };

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

    if (!doctor?.doctor_id) {
      setError("Doctor session not found.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "http://127.0.0.1:5000/api/doctors/change-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            doctor_id: doctor.doctor_id,
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
          Review your doctor profile and manage your account security.
        </p>
      </div>

      {/* Doctor Profile Details */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7 mb-6">
        <div className="flex items-center gap-4 pb-6 mb-6 border-b border-gray-100">
          <div className="p-3 bg-pink-50 rounded-xl">
            <User className="text-pink-600" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              {doctor?.name || "Doctor"}
            </h2>
            <p className="text-sm font-medium text-pink-600 bg-pink-50 inline-block px-2.5 py-0.5 rounded-md mt-1">
              {doctor?.specialization || "Specialist"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="p-4 bg-gray-50 rounded-xl">
            <span className="text-xs text-gray-500 font-medium block">
              Email Address
            </span>
            <span className="text-sm font-medium text-gray-800 mt-1 flex items-center gap-1.5">
              <Mail size={15} className="text-gray-400" /> {doctor?.email}
            </span>
          </div>

          <div className="p-4 bg-gray-50 rounded-xl">
            <span className="text-xs text-gray-500 font-medium block">
              Phone Number
            </span>
            <span className="text-sm font-medium text-gray-800 mt-1 flex items-center gap-1.5">
              <Phone size={15} className="text-gray-400" />{" "}
              {doctor?.phone || "Not specified"}
            </span>
          </div>

          <div className="p-4 bg-gray-50 rounded-xl">
            <span className="text-xs text-gray-500 font-medium block">
              NMC Registration & Experience
            </span>
            <span className="text-sm font-medium text-gray-800 mt-1 flex items-center gap-1.5">
              <Award size={15} className="text-gray-400" /> NMC:{" "}
              <strong>{doctor?.nmc_number}</strong> • {doctor?.experience} yrs exp
            </span>
          </div>

          <div className="p-4 bg-gray-50 rounded-xl">
            <span className="text-xs text-gray-500 font-medium block">
              Consultation Fee
            </span>
            <span className="text-sm font-medium text-gray-800 mt-1 flex items-center gap-1.5">
              <Banknote size={15} className="text-gray-400" /> NPR{" "}
              <strong>{doctor?.consultation_fee}</strong>
            </span>
          </div>

          <div className="sm:col-span-2 p-4 bg-gray-50 rounded-xl">
            <span className="text-xs text-gray-500 font-medium block">
              Currently Practicing At
            </span>
            <span className="text-sm font-medium text-gray-800 mt-1 flex items-center gap-1.5">
              <MapPin size={15} className="text-gray-400" /> {doctor?.practice_at}
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
              Update your login credentials
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

export default DoctorSettings;
