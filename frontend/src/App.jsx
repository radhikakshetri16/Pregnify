import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Layouts
import UserLayout from "./layouts/UserLayout";
import DoctorLayout from "./layouts/DoctorLayout";
import AdminLayout from "./layouts/AdminLayout";

// Public User Auth Pages
import Login from "./pages/Login";
import Register from "./pages/Register";

// Public Doctor Auth Pages
import DoctorLogin from "./pages/DoctorLogin";
import DoctorChangePassword from "./pages/DoctorChangePassword";

// Public Admin Auth Pages
import AdminLogin from "./pages/AdminLogin";
import AdminRegister from "./pages/AdminRegister";

// Protected User Pages
import Dashboard from "./pages/Dashboard";
import Pregnancy from "./pages/Pregnancy";
import Health from "./pages/Health";
import Medicalhistory from "./pages/Medicalhistory";
import Reports from "./pages/Reports";
import Medicines from "./pages/Medicines";
import Appointments from "./pages/Appointments";
import Settings from "./pages/Settings";

// Protected Doctor Pages
import DoctorDashboard from "./pages/DoctorDashboard";
import DoctorPatients from "./pages/DoctorPatients";
import DoctorPatientDetail from "./pages/DoctorPatientDetail";
import DoctorAppointments from "./pages/DoctorAppointments";
import DoctorSettings from "./pages/DoctorSettings";

// Protected Admin Pages
import AdminDashboard from "./pages/AdminDashboard";
import AdminDoctors from "./pages/AdminDoctors";
import AdminUsers from "./pages/AdminUsers";
import AdminSettings from "./pages/AdminSettings";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* =========================================
            PUBLIC AUTHENTICATION ROUTES
           ========================================= */}

        {/* User Auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Doctor Auth */}
        <Route path="/doctor/login" element={<DoctorLogin />} />
        <Route
          path="/doctor/change-password"
          element={<DoctorChangePassword />}
        />

        {/* Admin Auth */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/register" element={<AdminRegister />} />

        {/* =========================================
            PROTECTED USER PORTAL ROUTES
           ========================================= */}
        <Route path="/" element={<UserLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="pregnancy" element={<Pregnancy />} />
          <Route path="health" element={<Health />} />
          <Route path="medicalhistory" element={<Medicalhistory />} />
          <Route path="reports" element={<Reports />} />
          <Route path="medicines" element={<Medicines />} />
          <Route path="appointments" element={<Appointments />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* =========================================
            PROTECTED DOCTOR PORTAL ROUTES
           ========================================= */}
        <Route path="/doctor" element={<DoctorLayout />}>
          <Route index element={<Navigate to="/doctor/dashboard" replace />} />
          <Route path="dashboard" element={<DoctorDashboard />} />
          <Route path="patients" element={<DoctorPatients />} />
          <Route path="patients/:patientId" element={<DoctorPatientDetail />} />
          <Route path="appointments" element={<DoctorAppointments />} />
          <Route path="settings" element={<DoctorSettings />} />
        </Route>

        {/* =========================================
            PROTECTED ADMIN PORTAL ROUTES
           ========================================= */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="doctors" element={<AdminDoctors />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        {/* Catch-all fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;