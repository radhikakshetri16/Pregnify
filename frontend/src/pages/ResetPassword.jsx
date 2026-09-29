import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Lock, Eye, EyeOff, Check, X, ArrowLeft, Loader2 } from "lucide-react";
import { checkPasswordRequirements } from "../utils/validation";

function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email || "";
  const resetToken = location.state?.reset_token || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [touched, setTouched] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // If no reset token, redirect back to forgot-password
  useEffect(() => {
    if (!resetToken) {
      navigate("/forgot-password", { replace: true });
    }
  }, [resetToken, navigate]);

  const pwCheck = checkPasswordRequirements(newPassword);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setTouched(true);

    setError("");

    if (!newPassword || !confirmPassword) {
      setError("Please fill in both password fields.");
      return;
    }

    if (!pwCheck.isValid) {
      setError(pwCheck.errorMessage);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "http://127.0.0.1:5000/api/auth/reset-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim(),
            reset_token: resetToken,
            new_password: newPassword,
            confirm_password: confirmPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to reset password. Please start over.");
        return;
      }

      // Return to login with the success banner
      navigate("/login", {
        replace: true,
        state: {
          successMessage:
            "Password reset successfully. Please log in with your new password.",
        },
      });
    } catch (err) {
      console.error("Reset password error:", err);
      setError("Unable to connect to the server. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-md p-8">
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="mx-auto w-12 h-12 bg-pink-100 text-pink-600 rounded-full flex items-center justify-center mb-3">
            <Lock className="w-6 h-6" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900">
            Create New Password
          </h1>

          <p className="text-gray-500 mt-2 text-sm">
            Please enter and confirm your new secure password.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>

            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (!touched) setTouched(true);
                }}
                placeholder="Enter new password"
                required
                className="w-full px-4 py-3 pr-11 border border-gray-300 rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
              >
                {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Password Requirements Checklist */}
          {touched && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs space-y-1.5">
              <p className="font-semibold text-gray-700 mb-1">Password must include:</p>
              
              <div className={`flex items-center gap-2 ${pwCheck.rules.minLength ? "text-green-600" : "text-gray-500"}`}>
                {pwCheck.rules.minLength ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5 text-gray-400" />}
                <span>At least 6 characters</span>
              </div>

              <div className={`flex items-center gap-2 ${pwCheck.rules.hasUppercase ? "text-green-600" : "text-gray-500"}`}>
                {pwCheck.rules.hasUppercase ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5 text-gray-400" />}
                <span>At least one uppercase letter (A-Z)</span>
              </div>

              <div className={`flex items-center gap-2 ${pwCheck.rules.hasLowercase ? "text-green-600" : "text-gray-500"}`}>
                {pwCheck.rules.hasLowercase ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5 text-gray-400" />}
                <span>At least one lowercase letter (a-z)</span>
              </div>

              <div className={`flex items-center gap-2 ${pwCheck.rules.hasNumber ? "text-green-600" : "text-gray-500"}`}>
                {pwCheck.rules.hasNumber ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5 text-gray-400" />}
                <span>At least one number (0-9)</span>
              </div>

              <div className={`flex items-center gap-2 ${pwCheck.rules.hasSpecial ? "text-green-600" : "text-gray-500"}`}>
                {pwCheck.rules.hasSpecial ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5 text-gray-400" />}
                <span>At least one special character (!@#$%^&*)</span>
              </div>
            </div>
          )}

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm New Password
            </label>

            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                required
                className="w-full px-4 py-3 pr-11 border border-gray-300 rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Reset Password Button */}
          <button
            type="submit"
            disabled={loading || !newPassword || !confirmPassword}
            className="w-full bg-pink-600 text-white py-3 rounded-lg
                       font-medium hover:bg-pink-700
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Resetting Password...</span>
              </>
            ) : (
              <span>Reset Password</span>
            )}
          </button>

          {/* Back to Login */}
          <div className="text-center pt-1">
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-pink-600 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Login</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}

export default ResetPassword;
