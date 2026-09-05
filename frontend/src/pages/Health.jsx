import { useEffect, useState } from "react";
import {
  Activity,
  Moon,
  Droplets,
  Weight,
  Plus,
  CalendarDays,
} from "lucide-react";

function Health() {
  const user = JSON.parse(localStorage.getItem("user"));

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    weight: "",
    sleep_hours: "",
    hydration: "",
    symptoms: "",
    nutrition_notes: "",
  });

  const fetchLogs = async () => {
    if (!user?.id) {
      setError("You must be logged in.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `http://127.0.0.1:5000/api/health?user_id=${user.id}`
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to load health history.");
        return;
      }

      setLogs(data.health_logs || []);
    } catch (err) {
      console.error(err);
      setError("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const response = await fetch(
        "http://127.0.0.1:5000/api/health",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: user.id,
            weight: formData.weight
              ? Number(formData.weight)
              : null,
            sleep_hours: formData.sleep_hours
              ? Number(formData.sleep_hours)
              : null,
            hydration: formData.hydration,
            symptoms: formData.symptoms,
            nutrition_notes: formData.nutrition_notes,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to save health log.");
        return;
      }

      setSuccess("Health log added successfully.");

      setFormData({
        weight: "",
        sleep_hours: "",
        hydration: "",
        symptoms: "",
        nutrition_notes: "",
      });

      await fetchLogs();
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
        <p className="text-gray-500">
          Loading health history...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800">
          Health Logs
        </h1>

        <p className="text-gray-500 mt-2">
          Track your daily health records throughout your pregnancy.
        </p>
      </div>

      {/* Add log form */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">

        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-pink-50 rounded-xl">
            <Activity className="text-pink-600" size={22} />
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              Add Today's Health Log
            </h2>

            <p className="text-sm text-gray-500">
              Record weight, sleep, hydration, and symptoms.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* Weight */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Weight (kg)
              </label>

              <div className="relative">
                <Weight
                  size={18}
                  className="absolute left-3 top-3.5 text-gray-400"
                />

                <input
                  type="number"
                  step="0.1"
                  name="weight"
                  value={formData.weight}
                  onChange={handleChange}
                  placeholder="e.g. 62.5"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg
                             focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>
            </div>

            {/* Sleep */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sleep Hours
              </label>

              <div className="relative">
                <Moon
                  size={18}
                  className="absolute left-3 top-3.5 text-gray-400"
                />

                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="24"
                  name="sleep_hours"
                  value={formData.sleep_hours}
                  onChange={handleChange}
                  placeholder="e.g. 7.5"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg
                             focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>
            </div>

          </div>

          {/* Hydration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hydration
            </label>

            <div className="relative">
              <Droplets
                size={18}
                className="absolute left-3 top-3.5 text-gray-400"
              />

              <select
                name="hydration"
                value={formData.hydration}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-pink-500"
              >
                <option value="">
                  Select hydration level
                </option>

                <option value="Good">Good</option>
                <option value="Moderate">Moderate</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          {/* Symptoms */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Symptoms
            </label>

            <textarea
              name="symptoms"
              value={formData.symptoms}
              onChange={handleChange}
              rows="3"
              placeholder="Describe any symptoms..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>

          {/* Nutrition */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nutrition Notes
            </label>

            <textarea
              name="nutrition_notes"
              value={formData.nutrition_notes}
              onChange={handleChange}
              rows="3"
              placeholder="Add notes about your nutrition..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
              {success}
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
            <Plus size={18} />

            {saving ? "Saving..." : "Add Health Log"}
          </button>

        </form>
      </div>

      {/* Previous logs */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">

        <div className="flex items-center gap-3 mb-6">
          <CalendarDays
            className="text-pink-600"
            size={22}
          />

          <h2 className="text-xl font-semibold text-gray-800">
            Previous Health Logs
          </h2>
        </div>

        {logs.length === 0 ? (
          <div className="text-center py-10">
            <Activity
              size={40}
              className="mx-auto text-gray-300 mb-3"
            />

            <p className="text-gray-500">
              No health logs recorded yet.
            </p>
          </div>
        ) : (
          <div className="space-y-4">

            {logs.map((log) => (
              <div
                key={log.healthlog_id}
                className="border border-gray-100 rounded-xl p-5 hover:bg-gray-50 transition"
              >

                <div className="flex justify-between items-start mb-4">

                  <div>
                    <p className="font-semibold text-gray-800">
                      Health Log
                    </p>

                    <p className="text-sm text-gray-500 mt-1">
                      {new Date(log.log_date).toLocaleString()}
                    </p>
                  </div>

                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                  <div>
                    <p className="text-xs text-gray-500">
                      Weight
                    </p>

                    <p className="font-medium text-gray-800">
                      {log.weight ?? "Not recorded"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">
                      Sleep
                    </p>

                    <p className="font-medium text-gray-800">
                      {log.sleep_hours != null
                        ? `${log.sleep_hours} hours`
                        : "Not recorded"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">
                      Hydration
                    </p>

                    <p className="font-medium text-gray-800">
                      {log.hydration || "Not recorded"}
                    </p>
                  </div>

                </div>

                {log.symptoms && (
                  <div className="mt-4">
                    <p className="text-xs text-gray-500">
                      Symptoms
                    </p>

                    <p className="text-gray-700 mt-1">
                      {log.symptoms}
                    </p>
                  </div>
                )}

                {log.nutrition_notes && (
                  <div className="mt-4">
                    <p className="text-xs text-gray-500">
                      Nutrition Notes
                    </p>

                    <p className="text-gray-700 mt-1">
                      {log.nutrition_notes}
                    </p>
                  </div>
                )}

              </div>
            ))}

          </div>
        )}

      </div>

    </div>
  );
}

export default Health;