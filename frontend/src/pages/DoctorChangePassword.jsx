import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { checkPasswordRequirements } from "../utils/validation";

function DoctorChangePassword() {
  const navigate = useNavigate();

  const doctorStr = localStorage.getItem("doctor");
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

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

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

    if (currentPassword === newPassword) {
      setError("New password must be different from temporary password.");
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
        setError(data.error || "Unable to change password.");
        return;
      }

      // Update doctor object in localStorage
      const updatedDoctor = {
        ...doctor,
        must_change_password: false,
      };
      localStorage.setItem("doctor", JSON.stringify(updatedDoctor));

      setSuccess("Password changed successfully! Redirecting to dashboard...");

      setTimeout(() => {
        navigate("/doctor/dashboard", { replace: true });
      }, 1000);
    } catch (error) {
      console.error("Change password error:", error);
      setError("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-md p-8">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-pink-600">
            Pregnify
          </h1>

          <p className="text-gray-500 mt-2 text-sm">
            Please change your temporary password to secure your account
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-5 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-5 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
            {success}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Temporary Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              placeholder="Enter temporary password"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="Min. 6 characters"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Re-enter new password"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-pink-600 text-white py-3 rounded-lg
                       font-medium hover:bg-pink-700
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition"
          >
            {loading ? "Updating Password..." : "Update Password & Continue"}
          </button>
        </form>

      </div>
    </div>
  );
}

export default DoctorChangePassword;