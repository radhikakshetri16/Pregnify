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
  const initialResendsRemaining = location.state?.resends_remaining;

  // 6 digit OTP boxes state
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef([]);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  // 1-minute OTP expiration countdown (exactly 60 seconds)
  const [expirySeconds, setExpirySeconds] = useState(60);

  // Track number of resends performed (max 2 allowed)
  const [resendCount, setResendCount] = useState(
    typeof initialResendsRemaining === "number"
      ? Math.max(0, 2 - initialResendsRemaining)
      : 0
  );

  const maxResends = 2;
  const resendsRemaining = Math.max(0, maxResends - resendCount);

  // If no email in state, redirect to /forgot-password
  useEffect(() => {
    if (!email) {
      navigate("/forgot-password", { replace: true });
    }
  }, [email, navigate]);

  // Expiration countdown (01:00 down to 00:00)
  useEffect(() => {
    if (expirySeconds <= 0) return;
    const interval = setInterval(() => {
      setExpirySeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [expirySeconds]);

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
    if (isLocked) return;
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
    if (isLocked) return;
    if (event.key === "Backspace") {
      if (!otp[index] && index > 0 && inputRefs.current[index - 1]) {
        inputRefs.current[index - 1].focus();
      }
    } else if (event.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1].focus();
    } else if (event.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handlePaste = (event) => {
    if (isLocked) return;
    event.preventDefault();
    const pasteData = event.clipboardData.getData("text").trim();
    const digits = pasteData.replace(/\D/g, "").slice(0, 6);

    if (digits.length > 0) {
      const newOtp = [...otp];
      for (let i = 0; i < 6; i++) {
        newOtp[i] = digits[i] || "";
      }
      setOtp(newOtp);

      const targetIndex = Math.min(digits.length, 5);
      if (inputRefs.current[targetIndex]) {
        inputRefs.current[targetIndex].focus();
      }
    }
  };

  const fullOtp = otp.join("");

  const handleVerify = async (event) => {
    if (event) event.preventDefault();
    if (isLocked) return;

    if (fullOtp.length < 6) {
      setError("Please enter all 6 digits of the OTP code.");
      return;
    }

    if (expirySeconds <= 0) {
      setError("OTP has expired. Please request a new OTP.");
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
        if (
          data.error &&
          (data.error.toLowerCase().includes("locked") ||
            data.error.toLowerCase().includes("24 hours"))
        ) {
          setIsLocked(true);
        }
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
    if (expirySeconds > 0 || resending || isLocked || resendCount >= maxResends) {
      return;
    }

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
        if (
          data.error &&
          (data.error.toLowerCase().includes("locked") ||
            data.error.toLowerCase().includes("24 hours"))
        ) {
          setIsLocked(true);
        }
        if (data.error && data.error.toLowerCase().includes("maximum")) {
          setResendCount(maxResends);
        }
        return;
      }

      // Reset fields, timers, and update resend count
      setOtp(["", "", "", "", "", ""]);
      setExpirySeconds(60);
      setResendCount((prev) => {
        if (typeof data.resends_remaining === "number") {
          return Math.max(0, 2 - data.resends_remaining);
        }
        return prev + 1;
      });
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
          <div className="mb-5 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm leading-relaxed">
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
                disabled={isLocked}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className={`w-12 h-14 text-center text-2xl font-bold rounded-lg border 
                  ${digit ? "border-pink-600 bg-pink-50/30 text-pink-700" : "border-gray-300 text-gray-900"}
                  focus:outline-none focus:ring-2 focus:ring-pink-500 transition disabled:bg-gray-100 disabled:cursor-not-allowed`}
              />
            ))}
          </div>

          {/* Countdown Expiry Timer */}
          <div className="flex items-center justify-center gap-1.5 text-sm">
            <Clock className={`w-4 h-4 ${expirySeconds > 0 ? "text-gray-400" : "text-red-500"}`} />
            {expirySeconds > 0 ? (
              <span className="text-gray-500">
                OTP expires in <strong className="text-pink-600 font-mono">{formatTimer(expirySeconds)}</strong>
              </span>
            ) : (
              <strong className="text-red-600">OTP expired.</strong>
            )}
          </div>

          {/* Verify Button */}
          <button
            type="submit"
            disabled={loading || fullOtp.length < 6 || expirySeconds <= 0 || isLocked}
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
            {resendCount >= maxResends ? (
              <div className="text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg py-2 px-3">
                Maximum OTP resend limit reached.
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={expirySeconds > 0 || resending || isLocked}
                  className="inline-flex items-center gap-1.5 text-pink-600 font-medium hover:text-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <RefreshCw className={`w-4 h-4 ${resending ? "animate-spin" : ""}`} />
                  <span>{resending ? "Sending..." : "Resend OTP"}</span>
                </button>
                {expirySeconds <= 0 && !isLocked && (
                  <span className="text-xs text-gray-500">
                    {resendsRemaining} {resendsRemaining === 1 ? "resend" : "resends"} remaining
                  </span>
                )}
              </div>
            )}
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
