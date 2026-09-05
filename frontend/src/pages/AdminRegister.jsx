import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Eye, EyeOff, AlertCircle, Shield } from "lucide-react";
import { checkPasswordRequirements } from "../utils/validation";

function AdminRegister() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const pwStatus = checkPasswordRequirements(password);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!pwStatus.isValid) {
      setError(pwStatus.errorMessage);
      setPasswordTouched(true);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "http://127.0.0.1:5000/api/admin/register",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Registration failed");
        return;
      }

      setSuccess(
        "Admin account created successfully. Redirecting to login..."
      );

      setTimeout(() => {
        navigate("/admin/login");
      }, 1200);
    } catch (err) {
      console.error("Admin registration error:", err);
      setError("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-pink-600">
            Pregnify
          </h1>

          <p className="text-gray-500 mt-2">
            Create a new administrator account
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-5 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-start gap-2.5">
            <AlertCircle
              size={16}
              className="shrink-0 mt-0.5 text-red-600"
            />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-5 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm flex items-start gap-2.5">
            <Check size={16} className="shrink-0 mt-0.5 text-green-600" />
            <span>{success}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name *
            </label>

            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Administrator Name"
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address *
            </label>

            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@pregnify.com"
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password *
            </label>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);

                  if (!passwordTouched) {
                    setPasswordTouched(true);
                  }
                }}
                onFocus={() => setPasswordTouched(true)}
                placeholder="Enter admin password"
                required
                className="w-full pl-4 pr-11 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Live Password Requirements Checklist */}
            {(passwordTouched || password) && (
              <div className="mt-2.5 p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm space-y-1">
                <p className="font-medium text-gray-700 mb-1.5">
                  Password Requirements:
                </p>

                <div className="space-y-1">
                  <div
                    className={`flex items-center gap-2 ${
                      pwStatus.rules.minLength
                        ? "text-green-600 font-medium"
                        : "text-gray-500"
                    }`}
                  >
                    {pwStatus.rules.minLength ? (
                      <Check
                        size={13}
                        className="text-green-600 shrink-0"
                      />
                    ) : (
                      <span className="w-3 h-3 rounded-full border border-gray-300 inline-block shrink-0" />
                    )}

                    <span>Min. 6 characters</span>
                  </div>

                  <div
                    className={`flex items-center gap-2 ${
                      pwStatus.rules.hasUppercase
                        ? "text-green-600 font-medium"
                        : "text-gray-500"
                    }`}
                  >
                    {pwStatus.rules.hasUppercase ? (
                      <Check
                        size={13}
                        className="text-green-600 shrink-0"
                      />
                    ) : (
                      <span className="w-3 h-3 rounded-full border border-gray-300 inline-block shrink-0" />
                    )}

                    <span>At least 1 uppercase letter (A-Z)</span>
                  </div>

                  <div
                    className={`flex items-center gap-2 ${
                      pwStatus.rules.hasLowercase
                        ? "text-green-600 font-medium"
                        : "text-gray-500"
                    }`}
                  >
                    {pwStatus.rules.hasLowercase ? (
                      <Check
                        size={13}
                        className="text-green-600 shrink-0"
                      />
                    ) : (
                      <span className="w-3 h-3 rounded-full border border-gray-300 inline-block shrink-0" />
                    )}

                    <span>At least 1 lowercase letter (a-z)</span>
                  </div>

                  <div
                    className={`flex items-center gap-2 ${
                      pwStatus.rules.hasNumber
                        ? "text-green-600 font-medium"
                        : "text-gray-500"
                    }`}
                  >
                    {pwStatus.rules.hasNumber ? (
                      <Check
                        size={13}
                        className="text-green-600 shrink-0"
                      />
                    ) : (
                      <span className="w-3 h-3 rounded-full border border-gray-300 inline-block shrink-0" />
                    )}

                    <span>At least 1 number (0-9)</span>
                  </div>

                  <div
                    className={`flex items-center gap-2 ${
                      pwStatus.rules.hasSpecial
                        ? "text-green-600 font-medium"
                        : "text-gray-500"
                    }`}
                  >
                    {pwStatus.rules.hasSpecial ? (
                      <Check
                        size={13}
                        className="text-green-600 shrink-0"
                      />
                    ) : (
                      <span className="w-3 h-3 rounded-full border border-gray-300 inline-block shrink-0" />
                    )}

                    <span>At least 1 special character (!@#$...)</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password *
            </label>

            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Re-enter admin password"
                required
                className="w-full pl-4 pr-11 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
              />

              <button
                type="button"
                onClick={() =>
                  setShowConfirmPassword(!showConfirmPassword)
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
              >
                {showConfirmPassword ? (
                  <EyeOff size={16} />
                ) : (
                  <Eye size={16} />
                )}
              </button>
            </div>
          </div>

          {/* Register Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-pink-600 text-white py-3 rounded-xl font-medium hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer shadow-xs mt-2"
          >
            {loading ? "Registering..." : "Create Admin Account"}
          </button>

          {/* Login Link */}
          <p className="text-center text-sm text-gray-500 pt-2">
            Already registered?{" "}
            <button
              type="button"
              onClick={() => navigate("/admin/login")}
              className="text-pink-600 font-medium hover:underline cursor-pointer"
            >
              Sign In
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}

export default AdminRegister;