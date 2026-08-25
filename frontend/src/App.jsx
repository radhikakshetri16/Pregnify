import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Sidebar from "./components/Sidebar";

import Register from "./pages/Register";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Pregnancy from "./pages/Pregnancy";
import Appointments from "./pages/Appointments";
import Medicines from "./pages/Medicines";
import Reports from "./pages/Reports";
import Medicalhistory from "./pages/Medicalhistory";
import Settings from "./pages/Settings";
import Health from "./pages/Health";

function AppLayout() {
  const user = localStorage.getItem("user");

  // User is not logged in
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />

      <main className="flex-1 p-8 overflow-y-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />

          <Route path="/pregnancy" element={<Pregnancy />} />

          <Route
            path="/appointments"
            element={<Appointments />}
          />

          <Route
            path="/medicines"
            element={<Medicines />}
          />

          <Route
            path="/reports"
            element={<Reports />}
          />

          <Route
            path="/medicalhistory"
            element={<Medicalhistory />}
          />

          <Route
            path="/settings"
            element={<Settings />}
          />

          <Route
            path="/health"
            element={<Health />}
          />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Public pages */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Dashboard/application */}
        <Route path="/*" element={<AppLayout />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;