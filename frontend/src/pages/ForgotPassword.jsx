import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, ArrowLeft, Loader2 } from "lucide-react";

function ForgotPassword() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        "http://127.0.0.1:5000/api/auth/forgot-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to send OTP. Please try again.");
        return;
      }

      // Navigate to OTP verification page with the email in state
      navigate("/verify-otp", {
        state: {
          email: email.trim(),
          resends_remaining: data.resends_remaining,
        },
      });
    } catch (err) {
      console.error("Forgot password request error:", err);
      setError("Unable to connect to the server. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-md p-8">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-12 h-12 bg-pink-100 text-pink-600 rounded-full flex items-center justify-center mb-3">
            <Mail className="w-6 h-6" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900">
            Forgot Password?
          </h1>

          <p className="text-gray-500 mt-2 text-sm">
            Enter your registered Gmail address to receive a 6-digit verification OTP.
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>

            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="e.g. user@gmail.com"
              required
              autoFocus
              className="w-full px-4 py-3 border border-gray-300 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full bg-pink-600 text-white py-3 rounded-lg
                       font-medium hover:bg-pink-700
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Sending OTP...</span>
              </>
            ) : (
              <span>Send OTP</span>
            )}
          </button>

          {/* Back to Login */}
          <div className="text-center pt-2">
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

export default ForgotPassword;
