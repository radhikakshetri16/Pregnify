import { Navigate, Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";

function UserLayout() {
  const user = localStorage.getItem("user");

  // User is not logged in
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}

export default UserLayout;
