import {
  CalendarDays,
  HeartPulse,
  Baby,
  Clock,
} from "lucide-react";

function Dashboard() {
  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800">
          Welcome back, Sita 👋
        </h1>

        <p className="mt-1 text-gray-500">
          Here's an overview of your pregnancy journey.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        {/* Pregnancy Week */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">
                Pregnancy
              </p>

              <h2 className="text-3xl font-bold text-gray-800 mt-2">
                28 Weeks
              </h2>

              <p className="text-sm text-pink-500 mt-2">
                196 days
              </p>
            </div>

            <div className="w-12 h-12 rounded-xl bg-pink-50 flex items-center justify-center">
              <Baby className="text-pink-600" size={25} />
            </div>
          </div>
        </div>

        {/* Due Date */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">
                Expected Due Date
              </p>

              <h2 className="text-2xl font-bold text-gray-800 mt-2">
                12 Oct 2026
              </h2>

              <p className="text-sm text-gray-500 mt-2">
                84 days remaining
              </p>
            </div>

            <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
              <CalendarDays className="text-purple-600" size={25} />
            </div>
          </div>
        </div>

        {/* Trimester */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">
                Current Trimester
              </p>

              <h2 className="text-2xl font-bold text-gray-800 mt-2">
                3rd Trimester
              </h2>

              <p className="text-sm text-green-500 mt-2">
                Almost there!
              </p>
            </div>

            <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
              <HeartPulse className="text-green-600" size={25} />
            </div>
          </div>
        </div>

      </div>

      {/* Middle Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Pregnancy Progress */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">

          <h2 className="text-lg font-semibold text-gray-800">
            Pregnancy Progress
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            You're doing great! Keep taking care of yourself.
          </p>

          <div className="mt-6">

            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-500">
                Progress
              </span>

              <span className="font-semibold text-pink-600">
                70%
              </span>
            </div>

            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-pink-500 rounded-full"
                style={{ width: "70%" }}
              />
            </div>

            <div className="flex justify-between mt-3 text-sm text-gray-400">
              <span>Week 1</span>
              <span>Week 40</span>
            </div>

          </div>
        </div>

        {/* Next Appointment */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">

          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">
              Next Appointment
            </h2>

            <Clock className="text-pink-500" size={20} />
          </div>

          <div className="mt-5 flex items-center gap-4">

            <div className="w-14 h-14 rounded-xl bg-pink-50 flex items-center justify-center">
              <CalendarDays
                className="text-pink-600"
                size={26}
              />
            </div>

            <div>
              <h3 className="font-semibold text-gray-800">
                25 August 2026
              </h3>

              <p className="text-sm text-gray-500">
                10:00 AM · Dr. Sharma
              </p>

              <p className="text-sm text-pink-500 mt-1">
                Regular ANC Checkup
              </p>
            </div>

          </div>

          <button className="mt-5 w-full py-2.5 rounded-lg bg-pink-600 text-white font-medium hover:bg-pink-700 transition">
            View Appointment
          </button>

        </div>

      </div>

      {/* Health Overview */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">

        <h2 className="text-lg font-semibold text-gray-800">
          Latest Health Overview
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-5">

          <div className="bg-gray-50 rounded-xl p-5">
            <p className="text-sm text-gray-500">
              Weight
            </p>

            <p className="text-2xl font-bold text-gray-800 mt-2">
              62.5 kg
            </p>

            <p className="text-xs text-green-600 mt-1">
              Last recorded today
            </p>
          </div>

          <div className="bg-gray-50 rounded-xl p-5">
            <p className="text-sm text-gray-500">
              Blood Pressure
            </p>

            <p className="text-2xl font-bold text-gray-800 mt-2">
              118/78
            </p>

            <p className="text-xs text-green-600 mt-1">
              Last recorded today
            </p>
          </div>

          <div className="bg-gray-50 rounded-xl p-5">
            <p className="text-sm text-gray-500">
              Heart Rate
            </p>

            <p className="text-2xl font-bold text-gray-800 mt-2">
              76 bpm
            </p>

            <p className="text-xs text-green-600 mt-1">
              Last recorded today
            </p>
          </div>

        </div>
      </div>

    </div>
  );
}

export default Dashboard;