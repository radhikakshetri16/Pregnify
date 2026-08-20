import { BrowserRouter, Routes, Route } from "react-router-dom";

import Sidebar from "./components/Sidebar";

import Dashboard from "./pages/Dashboard";
import Pregnancy from "./pages/Pregnancy";
import Appointments from "./pages/Appointments";
import Medicines from "./pages/Medicines";
import Reports from "./pages/Reports";
import Messages from "./pages/Messages";
import Settings from "./pages/Settings";
import Health from "./pages/Health";

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 flex">

        <Sidebar />

        <main className="flex-1 p-8 overflow-y-auto">

          <Routes>

            <Route
              path="/"
              element={<Dashboard />}
            />

            <Route
              path="/pregnancy"
              element={<Pregnancy />}
            />

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
              path="/messages"
              element={<Messages />}
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
    </BrowserRouter>
  );
}

export default App;