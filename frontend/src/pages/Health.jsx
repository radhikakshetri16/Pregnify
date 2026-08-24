import { useState } from "react";
import { HeartPulse, Save, CheckCircle2, History } from "lucide-react";
import { usePregnancy } from "../context/PregnancyContext";

function Health() {
  const { profile, healthLogs, addHealthRecord } = usePregnancy();

  const [formData, setFormData] = useState({
    weight: profile.weight || "",
    bloodPressure: profile.bloodPressure || "",
    heartRate: profile.heartRate || "",
    symptoms: "",
    notes: "",
  });

  const [saved, setSaved] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setSaved(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    addHealthRecord(formData);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">
          Health and Clinical Vitals
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Record daily vitals. Entries automatically update your dashboard and backend history.
        </p>
      </div>

      {/* Entry Form */}
      <div className="bg-white rounded-xl p-6 border border-zinc-200">
        <h2 className="text-base font-semibold text-zinc-900 mb-4">
          Record Today's Health Entry
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1.5">
                Weight (kg)
              </label>
              <input
                type="number"
                step="0.1"
                name="weight"
                value={formData.weight}
                onChange={handleChange}
                placeholder="62.5"
                className="w-full border border-zinc-300 rounded-lg px-3.5 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1.5">
                Blood Pressure (mmHg)
              </label>
              <input
                type="text"
                name="bloodPressure"
                value={formData.bloodPressure}
                onChange={handleChange}
                placeholder="118/78"
                className="w-full border border-zinc-300 rounded-lg px-3.5 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1.5">
                Heart Rate (bpm)
              </label>
              <input
                type="number"
                name="heartRate"
                value={formData.heartRate}
                onChange={handleChange}
                placeholder="76"
                className="w-full border border-zinc-300 rounded-lg px-3.5 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1.5">
              Observed Symptoms
            </label>
            <input
              type="text"
              name="symptoms"
              value={formData.symptoms}
              onChange={handleChange}
              placeholder="e.g. Mild headache, back fatigue"
              className="w-full border border-zinc-300 rounded-lg px-3.5 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1.5">
              Clinical Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="3"
              placeholder="Medication compliance, hydration, nutritional notes..."
              className="w-full border border-zinc-300 rounded-lg px-3.5 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 resize-none"
            />
          </div>

          <div className="flex items-center gap-4 pt-2">
            <button
              type="submit"
              className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-sm font-medium transition"
            >
              Save Health Record
            </button>

            {saved && (
              <span className="text-xs text-green-600 font-medium">
                Record saved and synchronized.
              </span>
            )}
          </div>
        </form>
      </div>

      {/* History Log */}
      {healthLogs.length > 0 && (
        <div className="bg-white rounded-xl p-6 border border-zinc-200 space-y-3">
          <h2 className="text-base font-semibold text-zinc-900">Recent Health Logs</h2>

          <div className="divide-y divide-zinc-100">
            {healthLogs.map((log) => (
              <div key={log.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <p className="font-semibold text-zinc-800">{log.date}</p>
                  <p className="text-zinc-500 mt-0.5">
                    {log.symptoms || "Regular checkup"} {log.notes && `· ${log.notes}`}
                  </p>
                </div>
                <div className="text-right text-zinc-700 font-medium">
                  {log.weight && <span className="mr-3">{log.weight} kg</span>}
                  {log.bloodPressure && <span className="mr-3">{log.bloodPressure} mmHg</span>}
                  {log.heartRate && <span>{log.heartRate} bpm</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Health;