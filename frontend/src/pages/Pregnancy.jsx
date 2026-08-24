import { useState } from "react";
import { usePregnancy } from "../context/PregnancyContext";

function Pregnancy() {
  const { profile, saveProfile, gestationalInfo } = usePregnancy();
  const [lmpDate, setLmpDate] = useState(profile.lmpDate || "");
  const [pregnancyType, setPregnancyType] = useState(profile.pregnancyType || "Single");
  const [saved, setSaved] = useState(false);

  const handleUpdate = (e) => {
    e.preventDefault();
    saveProfile({
      lmpDate,
      pregnancyType,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">
          Pregnancy Milestone Tracker
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Monitor gestational timeline and calculate expected delivery dates.
        </p>
      </div>

      {/* Configuration Form */}
      <div className="bg-white rounded-xl p-6 border border-zinc-200">
        <h2 className="text-base font-semibold text-zinc-900 mb-4">
          LMP and Pregnancy Parameters
        </h2>

        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1.5">
                Last Menstrual Period (LMP) Date
              </label>
              <input
                type="date"
                value={lmpDate}
                onChange={(e) => setLmpDate(e.target.value)}
                required
                className="w-full border border-zinc-300 rounded-lg px-3.5 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1.5">
                Pregnancy Type
              </label>
              <select
                value={pregnancyType}
                onChange={(e) => setPregnancyType(e.target.value)}
                className="w-full border border-zinc-300 rounded-lg px-3.5 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 bg-white"
              >
                <option value="Single">Single</option>
                <option value="Twins">Twins</option>
                <option value="Triplets">Triplets / Multiple</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-4 pt-2">
            <button
              type="submit"
              className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-sm font-medium transition"
            >
              Update Parameters
            </button>

            {saved && (
              <span className="text-xs text-green-600 font-medium">
                Milestones recalculated and saved.
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Calculated Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 border border-zinc-200">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
            Current Trimester
          </p>
          <p className="text-2xl font-bold text-zinc-900 mt-2">
            {gestationalInfo.trimester}
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            Status: Normal progression
          </p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-zinc-200">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
            Gestational Age
          </p>
          <p className="text-2xl font-bold text-zinc-900 mt-2">
            {gestationalInfo.weeks} Weeks {gestationalInfo.days > 0 ? `${gestationalInfo.days} Days` : ""}
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            {gestationalInfo.totalDays} total days elapsed
          </p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-zinc-200">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
            Expected Due Date
          </p>
          <p className="text-2xl font-bold text-zinc-900 mt-2">
            {gestationalInfo.dueDateFormatted}
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            {gestationalInfo.daysRemaining} days remaining
          </p>
        </div>
      </div>
    </div>
  );
}

export default Pregnancy;