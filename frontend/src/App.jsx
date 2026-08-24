import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SignInButton } from "@clerk/clerk-react";
import { useAuth } from "./context/AuthContext";
import { PregnancyProvider, usePregnancy } from "./context/PregnancyContext";
import Sidebar from "./components/Sidebar";

import Dashboard from "./pages/Dashboard";
import Onboarding from "./pages/Onboarding";
import Pregnancy from "./pages/Pregnancy";
import Appointments from "./pages/Appointments";
import Medicines from "./pages/Medicines";
import Reports from "./pages/Reports";
import Messages from "./pages/Messages";
import Settings from "./pages/Settings";
import Health from "./pages/Health";

function GoogleIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

function LandingPage() {
  const { isClerkActive, signInWithGoogle } = useAuth();

  return (
    <div className="min-h-screen bg-white text-zinc-900 flex flex-col justify-between">
      {/* Navigation */}
      <header className="border-b border-zinc-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xl tracking-tight text-zinc-900">Pregnify</span>
          </div>

          <div className="flex items-center gap-3">
            {isClerkActive ? (
              <SignInButton mode="modal">
                <button className="inline-flex items-center gap-2.5 px-4 py-2 text-sm font-medium text-zinc-800 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-lg transition">
                  <GoogleIcon />
                  <span>Sign in with Google</span>
                </button>
              </SignInButton>
            ) : (
              <button
                onClick={() => signInWithGoogle("sita.sharma@gmail.com", "Sita Sharma")}
                className="inline-flex items-center gap-2.5 px-4 py-2 text-sm font-medium text-zinc-800 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-lg transition"
              >
                <GoogleIcon />
                <span>Sign in with Google</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Hero */}
      <main className="max-w-3xl mx-auto px-6 py-20 text-center flex-1 flex flex-col justify-center">
        <div className="inline-block mx-auto mb-4 px-3 py-1 bg-zinc-100 rounded-full text-xs font-semibold uppercase tracking-wider text-zinc-600">
          Maternal Health and Care System
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-zinc-900 leading-tight">
          Personalized Pregnancy Health Tracker
        </h1>

        <p className="text-zinc-600 text-base sm:text-lg max-w-xl mx-auto mt-4 leading-relaxed">
          Monitor your vital signs, calculate gestational age and due dates from your LMP, and keep your care team updated.
        </p>

        <div className="mt-8 flex justify-center">
          {isClerkActive ? (
            <SignInButton mode="modal">
              <button className="inline-flex items-center gap-3 px-8 py-3.5 bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-semibold rounded-xl shadow-xs transition transform hover:-translate-y-0.5">
                <GoogleIcon />
                <span>Continue with Google</span>
              </button>
            </SignInButton>
          ) : (
            <button
              onClick={() => signInWithGoogle("sita.sharma@gmail.com", "Sita Sharma")}
              className="inline-flex items-center gap-3 px-8 py-3.5 bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-semibold rounded-xl shadow-xs transition transform hover:-translate-y-0.5"
            >
              <GoogleIcon />
              <span>Continue with Google</span>
            </button>
          )}
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-16 text-left border-t border-zinc-100 pt-10">
          <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-100">
            <h3 className="font-semibold text-sm text-zinc-900">Vitals Monitoring</h3>
            <p className="text-xs text-zinc-500 mt-1">
              Log weight, blood pressure, resting heart rate, and BMI throughout pregnancy.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-100">
            <h3 className="font-semibold text-sm text-zinc-900">Milestone Dates</h3>
            <p className="text-xs text-zinc-500 mt-1">
              Automatically calculate gestational age in weeks/days, trimester, and due date from LMP.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-100">
            <h3 className="font-semibold text-sm text-zinc-900">Clinical Checkups</h3>
            <p className="text-xs text-zinc-500 mt-1">
              Schedule, track, and review upcoming antenatal visits with your physician.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-100 py-6 text-center text-xs text-zinc-400">
        Pregnify Platform. Maternal Care Tracking System.
      </footer>
    </div>
  );
}

function DashboardLayout() {
  return (
    <div className="min-h-screen bg-zinc-50 flex">
      <Sidebar />

      <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-5xl">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/pregnancy" element={<Pregnancy />} />
          <Route path="/health" element={<Health />} />
          <Route path="/appointments" element={<Appointments />} />
          <Route path="/medicines" element={<Medicines />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function AuthenticatedApp() {
  const { profile } = usePregnancy();

  return (
    <Routes>
      {/* Standalone Full-Screen Details / Onboarding Route (WITHOUT SIDEBAR) */}
      <Route path="/info" element={<Onboarding />} />
      <Route path="/onboarding" element={<Onboarding />} />

      {/* If profile is not complete yet, redirect to /info */}
      {!profile.isProfileComplete ? (
        <Route path="*" element={<Navigate to="/info" replace />} />
      ) : (
        /* Main Dashboard with Sidebar */
        <Route path="/*" element={<DashboardLayout />} />
      )}
    </Routes>
  );
}

function App() {
  const { isSignedIn } = useAuth();

  return (
    <BrowserRouter>
      {isSignedIn ? (
        <PregnancyProvider>
          <AuthenticatedApp />
        </PregnancyProvider>
      ) : (
        <LandingPage />
      )}
    </BrowserRouter>
  );
}

export default App;