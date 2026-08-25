import { useEffect, useState } from "react";
import {
  HeartPulse,
  CalendarDays,
  Activity,
  Weight,
  Clock,
} from "lucide-react";

function Dashboard() {
  const user = JSON.parse(localStorage.getItem("user"));

  const [pregnancy, setPregnancy] = useState(null);
  const [healthLogs, setHealthLogs] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboardData = async () => {
    if (!user?.id) {
      setError("You must be logged in.");
      setLoading(false);
      return;
    }

    try {
      const [pregnancyResponse, healthResponse] =
        await Promise.all([
          fetch(
            `http://127.0.0.1:5000/api/pregnancy?user_id=${user.id}`
          ),

          fetch(
            `http://127.0.0.1:5000/api/health?user_id=${user.id}`
          ),
        ]);

      const pregnancyData = await pregnancyResponse.json();
      const healthData = await healthResponse.json();

      if (!pregnancyResponse.ok) {
        setError(
          pregnancyData.error ||
            "Unable to load pregnancy information."
        );
        return;
      }

      if (!healthResponse.ok) {
        setError(
          healthData.error ||
            "Unable to load health information."
        );
        return;
      }

      setPregnancy(pregnancyData.pregnancy);
      setHealthLogs(healthData.health_logs || []);

    } catch (err) {
      console.error(err);
      setError("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-500">
          Loading dashboard...
        </p>
      </div>
    );
  }

  const latestHealthLog =
    healthLogs.length > 0
      ? healthLogs[0]
      : null;

  return (
    <div className="max-w-6xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">
          Welcome, {user?.name || "User"}
        </h1>

        <p className="text-gray-500 mt-2">
          Here's a simple overview of your pregnancy.
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {!pregnancy ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">

          <HeartPulse
            size={48}
            className="mx-auto text-pink-400 mb-4"
          />

          <h2 className="text-xl font-semibold text-gray-800">
            Pregnancy information not added yet
          </h2>

          <p className="text-gray-500 mt-2">
            Add your pregnancy information to see your
            pregnancy overview here.
          </p>

        </div>
      ) : (
        <>
          {/* Pregnancy cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-4">

                <div className="p-3 bg-pink-50 rounded-xl">
                  <HeartPulse
                    className="text-pink-600"
                    size={23}
                  />
                </div>

                <div>
                  <p className="text-sm text-gray-500">
                    Pregnancy Week
                  </p>

                  <p className="text-2xl font-bold text-gray-800">
                    Week {pregnancy.pregnancy_week}
                  </p>
                </div>

              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-4">

                <div className="p-3 bg-purple-50 rounded-xl">
                  <Activity
                    className="text-purple-600"
                    size={23}
                  />
                </div>

                <div>
                  <p className="text-sm text-gray-500">
                    Trimester
                  </p>

                  <p className="text-lg font-bold text-gray-800">
                    {pregnancy.trimester}
                  </p>
                </div>

              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-4">

                <div className="p-3 bg-green-50 rounded-xl">
                  <Clock
                    className="text-green-600"
                    size={23}
                  />
                </div>

                <div>
                  <p className="text-sm text-gray-500">
                    Pregnancy Progress
                  </p>

                  <p className="text-2xl font-bold text-gray-800">
                    {pregnancy.progress_percentage}%
                  </p>
                </div>

              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-4">

                <div className="p-3 bg-blue-50 rounded-xl">
                  <CalendarDays
                    className="text-blue-600"
                    size={23}
                  />
                </div>

                <div>
                  <p className="text-sm text-gray-500">
                    Expected Due Date
                  </p>

                  <p className="text-lg font-bold text-gray-800">
                    {pregnancy.due_date}
                  </p>
                </div>

              </div>
            </div>

          </div>

          {/* Progress */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7 mt-6">

            <div className="flex justify-between mb-3">

              <h2 className="font-semibold text-gray-800">
                Pregnancy Progress
              </h2>

              <span className="text-sm text-gray-500">
                {pregnancy.progress_percentage}%
              </span>

            </div>

            <div className="w-full bg-gray-100 rounded-full h-3">

              <div
                className="bg-pink-500 h-3 rounded-full transition-all"
                style={{
                  width: `${pregnancy.progress_percentage}%`,
                }}
              />

            </div>

          </div>

          {/* Health summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">

              <div className="flex items-center gap-3 mb-5">

                <div className="p-3 bg-orange-50 rounded-xl">
                  <Weight
                    className="text-orange-600"
                    size={22}
                  />
                </div>

                <div>
                  <h2 className="font-semibold text-gray-800">
                    Latest Health
                  </h2>

                  <p className="text-sm text-gray-500">
                    Most recently recorded weight
                  </p>
                </div>

              </div>

              {latestHealthLog ? (
                <div>
                  <p className="text-3xl font-bold text-gray-800">
                    {latestHealthLog.weight ?? "—"}
                  </p>

                  <p className="text-sm text-gray-500 mt-1">
                    Latest recorded weight
                  </p>
                </div>
              ) : (
                <p className="text-gray-500">
                  No health information recorded yet.
                </p>
              )}

            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">

              <div className="flex items-center gap-3 mb-5">

                <div className="p-3 bg-blue-50 rounded-xl">
                  <CalendarDays
                    className="text-blue-600"
                    size={22}
                  />
                </div>

                <div>
                  <h2 className="font-semibold text-gray-800">
                    Next Appointment
                  </h2>

                  <p className="text-sm text-gray-500">
                    Your upcoming appointment
                  </p>
                </div>

              </div>

              <p className="text-gray-500">
                No upcoming appointment available.
              </p>

            </div>

          </div>
        </>
      )}

    </div>
  );
}

export default Dashboard;