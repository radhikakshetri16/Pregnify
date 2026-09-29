import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ShieldCheck, ArrowLeft, Loader2, RefreshCw, Clock } from "lucide-react";

function maskEmail(email) {
  if (!email || !email.includes("@")) return email || "";
  const [local, domain] = email.split("@");
  if (local.length <= 2) {
    return `${local[0]}*@${domain}`;
  }
  const maskedLocal = `${local[0]}${"*".repeat(Math.max(1, local.length - 2))}${local[local.length - 1]}`;
  return `${maskedLocal}@${domain}`;
}

function VerifyOtp() {
  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email || "";

  // 6 digit OTP boxes state
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef([]);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  // 10-minute OTP expiration countdown (600 seconds)
  const [expirySeconds, setExpirySeconds] = useState(600);

  // Resend cooldown timer (30 seconds)
  const [resendCooldown, setResendCooldown] = useState(30);

  // If no email in state, redirect to /forgot-password
  useEffect(() => {
    if (!email) {
      navigate("/forgot-password", { replace: true });
    }
  }, [email, navigate]);

  // Expiration countdown
  useEffect(() => {
    if (expirySeconds <= 0) return;
    const interval = setInterval(() => {
      setExpirySeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [expirySeconds]);

  // Resend cooldown countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Auto-focus first input on load
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const formatTimer = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  const handleOtpChange = (index, value) => {
    // Only allow digits
    const cleaned = value.replace(/\D/g, "");

    const newOtp = [...otp];
    if (cleaned.length > 0) {
      newOtp[index] = cleaned[cleaned.length - 1];
      setOtp(newOtp);

      // Auto-advance to next input
      if (index < 5 && inputRefs.current[index + 1]) {
        inputRefs.current[index + 1].focus();
      }
    } else {
      newOtp[index] = "";
      setOtp(newOtp);
    }
  };

  const handleKeyDown = (index, event) => {
    if (event.key === "Backspace") {
      if (!otp[index] && index > 0 && inputRefs.current[index - 1]) {
        // If current is empty, focus previous and clear it
        inputRefs.current[index - 1].focus();
      }
    } else if (event.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1].focus();
    } else if (event.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handlePaste = (event) => {
    event.preventDefault();
    const pasteData = event.clipboardData.getData("text").trim();
    const digits = pasteData.replace(/\D/g, "").slice(0, 6);

    if (digits.length > 0) {
      const newOtp = [...otp];
      for (let i = 0; i < 6; i++) {
        newOtp[i] = digits[i] || "";
      }
      setOtp(newOtp);

      // Focus the last filled box or next empty box
      const targetIndex = Math.min(digits.length, 5);
      if (inputRefs.current[targetIndex]) {
        inputRefs.current[targetIndex].focus();
      }
    }
  };

  const fullOtp = otp.join("");

  const handleVerify = async (event) => {
    if (event) event.preventDefault();

    if (fullOtp.length < 6) {
      setError("Please enter all 6 digits of the OTP code.");
      return;
    }

    if (expirySeconds <= 0) {
      setError("OTP has expired. Please request a new code.");
      return;
    }

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await fetch(
        "http://127.0.0.1:5000/api/auth/verify-reset-otp",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim(),
            otp: fullOtp,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "OTP verification failed. Please try again.");
        return;
      }

      setSuccess("OTP verified successfully! Redirecting...");

      // Navigate to Reset Password page with email and the verified reset_token
      setTimeout(() => {
        navigate("/reset-password", {
          state: {
            email: email.trim(),
            reset_token: data.reset_token,
          },
        });
      }, 700);
    } catch (err) {
      console.error("Verify OTP error:", err);
      setError("Unable to connect to the server. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || resending) return;

    setError("");
    setSuccess("");
    setResending(true);

    try {
      const response = await fetch(
        "http://127.0.0.1:5000/api/auth/resend-reset-otp",
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
        setError(data.error || "Failed to resend OTP. Please try again.");
        return;
      }

      // Reset fields, timers, and show success message
      setOtp(["", "", "", "", "", ""]);
      setExpirySeconds(600);
      setResendCooldown(30);
      setSuccess("A fresh 6-digit OTP has been sent to your email.");

      if (inputRefs.current[0]) {
        inputRefs.current[0].focus();
      }
    } catch (err) {
      console.error("Resend OTP error:", err);
      setError("Unable to connect to the server.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-md p-8">
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="mx-auto w-12 h-12 bg-pink-100 text-pink-600 rounded-full flex items-center justify-center mb-3">
            <ShieldCheck className="w-6 h-6" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900">
            Enter Verification Code
          </h1>

          <p className="text-gray-500 mt-2 text-sm leading-relaxed">
            Enter the 6-digit OTP sent to{" "}
            <span className="font-semibold text-gray-800">{maskEmail(email)}</span>
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

        {/* OTP Input Form */}
        <form onSubmit={handleVerify} className="space-y-6">
          {/* 6 Digit Input Boxes */}
          <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className={`w-12 h-14 text-center text-2xl font-bold rounded-lg border 
                  ${digit ? "border-pink-600 bg-pink-50/30 text-pink-700" : "border-gray-300 text-gray-900"}
                  focus:outline-none focus:ring-2 focus:ring-pink-500 transition`}
              />
            ))}
          </div>

          {/* Countdown Expiry Timer */}
          <div className="flex items-center justify-center gap-1.5 text-sm text-gray-500">
            <Clock className="w-4 h-4 text-gray-400" />
            <span>
              {expirySeconds > 0 ? (
                <>OTP expires in <strong className="text-pink-600">{formatTimer(expirySeconds)}</strong></>
              ) : (
                <strong className="text-red-500">OTP has expired</strong>
              )}
            </span>
          </div>

          {/* Verify Button */}
          <button
            type="submit"
            disabled={loading || fullOtp.length < 6 || expirySeconds <= 0}
            className="w-full bg-pink-600 text-white py-3 rounded-lg
                       font-medium hover:bg-pink-700
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Verifying OTP...</span>
              </>
            ) : (
              <span>Verify OTP</span>
            )}
          </button>

          {/* Resend OTP Section */}
          <div className="text-center text-sm text-gray-500 pt-2 border-t border-gray-100">
            <p className="mb-2">Didn't receive the code?</p>
            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0 || resending}
              className="inline-flex items-center gap-1.5 text-pink-600 font-medium hover:text-pink-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${resending ? "animate-spin" : ""}`} />
              {resendCooldown > 0 ? (
                <span>Resend OTP in ({resendCooldown}s)</span>
              ) : (
                <span>{resending ? "Sending..." : "Resend OTP"}</span>
              )}
            </button>
          </div>

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

export default VerifyOtp;
