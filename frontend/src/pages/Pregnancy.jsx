import { useEffect, useState } from "react";
import {
  CalendarDays,
  HeartPulse,
  Clock,
  Activity,
  Save,
} from "lucide-react";

function Pregnancy() {
  const [pregnancy, setPregnancy] = useState(null);
  const [lmp, setLmp] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const user = JSON.parse(localStorage.getItem("user"));

  const fetchPregnancy = async () => {
    if (!user?.id) {
      setError("You must be logged in.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `http://127.0.0.1:5000/api/pregnancy?user_id=${user.id}`
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to load pregnancy information.");
        return;
      }

      setPregnancy(data.pregnancy);

      if (data.pregnancy) {
        setLmp(data.pregnancy.last_menstrual_date || "");
        setNotes(data.pregnancy.notes || "");
      }
    } catch (err) {
      console.error(err);
      setError("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPregnancy();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const response = await fetch(
        "http://127.0.0.1:5000/api/pregnancy",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: user.id,
            last_menstrual_date: lmp,
            notes,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to save pregnancy.");
        return;
      }

      setSuccess("Pregnancy information saved successfully.");

      await fetchPregnancy();
    } catch (err) {
      console.error(err);
      setError("Unable to connect to the server.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-500">Loading pregnancy information...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">
          Pregnancy
        </h1>

        <p className="text-gray-500 mt-2">
          Track your pregnancy progress and important dates.
        </p>
      </div>

      {/* No pregnancy yet */}
      {!pregnancy && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">

          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-pink-50 rounded-xl">
              <HeartPulse className="text-pink-600" size={24} />
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-800">
                Add Pregnancy Information
              </h2>

              <p className="text-sm text-gray-500">
                Enter your Last Menstrual Period (LMP).
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Menstrual Period
              </label>

              <input
                type="date"
                value={lmp}
                onChange={(e) => setLmp(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-pink-500"
              />

              <p className="text-xs text-gray-500 mt-2">
                Your expected due date and pregnancy progress will be
                calculated automatically.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes <span className="text-gray-400">(optional)</span>
              </label>

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows="4"
                placeholder="Add any pregnancy-related notes..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="flex items-center justify-center gap-2 w-full
                         bg-pink-600 text-white py-3 rounded-lg
                         font-medium hover:bg-pink-700
                         disabled:opacity-50 transition"
            >
              <Save size={18} />

              {saving ? "Saving..." : "Save Pregnancy Information"}
            </button>

          </form>
        </div>
      )}

      {/* Pregnancy information */}
      {pregnancy && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">
                    Pregnancy Week
                  </p>

                  <p className="text-2xl font-bold text-gray-800 mt-2">
                    Week {pregnancy.pregnancy_week}
                  </p>
                </div>

                <div className="p-3 bg-pink-50 rounded-xl">
                  <HeartPulse className="text-pink-600" size={22} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">
                    Trimester
                  </p>

                  <p className="text-lg font-bold text-gray-800 mt-2">
                    {pregnancy.trimester}
                  </p>
                </div>

                <div className="p-3 bg-purple-50 rounded-xl">
                  <Activity className="text-purple-600" size={22} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">
                    Progress
                  </p>

                  <p className="text-2xl font-bold text-gray-800 mt-2">
                    {pregnancy.progress_percentage}%
                  </p>
                </div>

                <div className="p-3 bg-green-50 rounded-xl">
                  <Clock className="text-green-600" size={22} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">
                    Status
                  </p>

                  <p className="text-lg font-bold text-green-600 mt-2">
                    {pregnancy.pregnancy_status}
                  </p>
                </div>

                <div className="p-3 bg-green-50 rounded-xl">
                  <CalendarDays
                    className="text-green-600"
                    size={22}
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Pregnancy details */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">

            <h2 className="text-xl font-semibold text-gray-800 mb-6">
              Pregnancy Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              <div>
                <p className="text-sm text-gray-500">
                  Last Menstrual Period
                </p>

                <p className="text-lg font-medium text-gray-800 mt-1">
                  {pregnancy.last_menstrual_date}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">
                  Expected Due Date
                </p>

                <p className="text-lg font-medium text-gray-800 mt-1">
                  {pregnancy.due_date}
                </p>
              </div>

            </div>

            {pregnancy.notes && (
              <div className="mt-6">
                <p className="text-sm text-gray-500">
                  Notes
                </p>

                <p className="text-gray-700 mt-1">
                  {pregnancy.notes}
                </p>
              </div>
            )}

          </div>

          {success && (
            <div className="mt-5 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
              {success}
            </div>
          )}
        </>
      )}

      {error && pregnancy && (
        <div className="mt-5 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

    </div>
  );
}

export default Pregnancy;