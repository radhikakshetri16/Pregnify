import { useEffect, useState } from "react";
import {
  Users,
  Search,
  Trash2,
  AlertCircle,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  const fetchUsers = async () => {
    try {
      const response = await fetch("http://127.0.0.1:5000/api/admin/users");
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to load users.");
        return;
      }

      setUsers(data.users || []);
    } catch (err) {
      console.error(err);
      setError("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDeleteUser = async (userId, userName) => {
    if (
      !window.confirm(
        `Are you sure you want to delete the user account for "${userName}"? This will also remove associated patient profile.`
      )
    ) {
      return;
    }

    setDeletingId(userId);
    setError("");

    try {
      const response = await fetch(
        `http://127.0.0.1:5000/api/admin/users/${userId}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to delete user account.");
        return;
      }

      fetchUsers();
    } catch (err) {
      console.error(err);
      setError("Unable to connect to the server.");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchTerm.toLowerCase();
    return (
      u.user_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.user_phone?.toLowerCase().includes(q) ||
      u.patient_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">
          Users / Patients
        </h1>
        <p className="text-gray-500 mt-2">
          Manage application user accounts and associated patient profiles.
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6">
        <div className="relative w-full sm:w-96">
          <Search
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, email, phone..."
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <p className="text-gray-500">Loading user accounts...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <Users size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-800">
            No Users Found
          </h3>
          <p className="text-gray-500 mt-2 text-sm">
            {searchTerm
              ? "No accounts match the search query."
              : "No user accounts have registered yet."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-4 px-6">User Account</th>
                  <th className="py-4 px-6">Associated Patient</th>
                  <th className="py-4 px-6">Relationship</th>
                  <th className="py-4 px-6">Contact & Address</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {filteredUsers.map((u) => (
                  <tr
                    key={u.user_id}
                    className="hover:bg-gray-50/50 transition"
                  >
                    {/* User Account Details */}
                    <td className="py-4 px-6">
                      <div className="font-semibold text-gray-800">
                        {u.user_name}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                        <Mail size={13} className="text-gray-400" />
                        <span>{u.email}</span>
                      </div>
                      {u.user_phone && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                          <Phone size={13} className="text-gray-400" />
                          <span>{u.user_phone}</span>
                        </div>
                      )}
                    </td>

                    {/* Patient Profile */}
                    <td className="py-4 px-6">
                      {u.patient_name ? (
                        <div>
                          <span className="font-medium text-gray-800">
                            {u.patient_name}
                          </span>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {u.patient_gender || "Female"}
                            {u.patient_age ? `, ${u.patient_age} yrs` : ""}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">
                          No profile
                        </span>
                      )}
                    </td>

                    {/* Relationship */}
                    <td className="py-4 px-6">
                      {u.relationship_type ? (
                        <span className="inline-block px-2.5 py-1 bg-pink-50 text-pink-600 text-xs font-medium rounded-lg">
                          {u.relationship_type}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>

                    {/* Contact & Address */}
                    <td className="py-4 px-6">
                      <div className="text-xs text-gray-600 space-y-1">
                        {u.patient_address ? (
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <MapPin size={13} className="text-gray-400 shrink-0" />
                            <span>{u.patient_address}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">No address recorded</span>
                        )}
                        {u.patient_phone && (
                          <div className="flex items-center gap-1.5 text-gray-500">
                            <Phone size={13} className="text-gray-400 shrink-0" />
                            <span>{u.patient_phone}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-right">
                      <button
                        type="button"
                        disabled={deletingId === u.user_id}
                        onClick={() => handleDeleteUser(u.user_id, u.user_name)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition cursor-pointer disabled:opacity-50 inline-flex items-center"
                        title="Delete User Account"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminUsers;
