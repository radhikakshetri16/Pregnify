import { useState } from "react";
import { Baby, CalendarDays, HeartPulse } from "lucide-react";

function Pregnancy() {
  const [lmpDate, setLmpDate] = useState("");

  const calculateDueDate = () => {
    if (!lmpDate) return null;

    const date = new Date(lmpDate);
    date.setDate(date.getDate() + 280);

    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const dueDate = calculateDueDate();

  return (
    <div className="space-y-6">

      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800">
          Pregnancy Tracker
        </h1>

        <p className="mt-1 text-gray-500">
          Track your pregnancy journey and important dates.
        </p>
      </div>

      {/* Pregnancy Information */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">

        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-pink-50 flex items-center justify-center">
            <Baby className="text-pink-600" size={24} />
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              Pregnancy Information
            </h2>

            <p className="text-sm text-gray-500">
              Enter your last menstrual period to calculate your estimated due date.
            </p>
          </div>
        </div>

        {/* LMP Input */}
        <div className="max-w-md">

          <label className="block text-sm font-medium text-gray-700 mb-2">
            Last Menstrual Period
          </label>

          <div className="relative">
            <CalendarDays
              size={20}
              className="absolute left-3 top-3 text-gray-400"
            />

            <input
              type="date"
              value={lmpDate}
              onChange={(e) => setLmpDate(e.target.value)}
              className="w-full border border-gray-200 rounded-lg py-2.5 pl-10 pr-3 outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400"
            />
          </div>

        </div>

        {/* Due Date Result */}
        {dueDate && (
          <div className="mt-6 bg-pink-50 border border-pink-100 rounded-xl p-5">

            <p className="text-sm text-pink-600 font-medium">
              Estimated Due Date
            </p>

            <p className="text-2xl font-bold text-gray-800 mt-1">
              {dueDate}
            </p>

            <p className="text-sm text-gray-500 mt-1">
              This is an estimated date based on a 280-day pregnancy.
            </p>

          </div>
        )}

      </div>

      {/* Pregnancy Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <HeartPulse className="text-pink-600" size={22} />

            <p className="text-sm text-gray-500">
              Current Trimester
            </p>
          </div>

          <p className="text-2xl font-bold text-gray-800 mt-4">
            3rd
          </p>

          <p className="text-sm text-gray-500 mt-1">
            Weeks 28–40
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">

          <p className="text-sm text-gray-500">
            Pregnancy Week
          </p>

          <p className="text-2xl font-bold text-gray-800 mt-4">
            28 weeks
          </p>

          <p className="text-sm text-gray-500 mt-1">
            Keep tracking your health.
          </p>

        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">

          <p className="text-sm text-gray-500">
            Pregnancy Progress
          </p>

          <p className="text-2xl font-bold text-gray-800 mt-4">
            70%
          </p>

          <div className="w-full bg-gray-100 h-2 rounded-full mt-3">
            <div
              className="bg-pink-500 h-2 rounded-full"
              style={{ width: "70%" }}
            />
          </div>

        </div>

      </div>

    </div>
  );
}

export default Pregnancy;