import { useState } from "react";
import { HeartPulse, Save } from "lucide-react";

function Health() {
  const [formData, setFormData] = useState({
    weight: "",
    bloodPressure: "",
    heartRate: "",
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

    setSaved(true);
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800">
          Health Tracker
        </h1>

        <p className="mt-1 text-gray-500">
          Record and monitor your pregnancy health information.
        </p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">

        <div className="flex items-center gap-3 mb-6">

          <div className="w-11 h-11 rounded-xl bg-pink-50 flex items-center justify-center">
            <HeartPulse
              className="text-pink-600"
              size={24}
            />
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              Record Today's Health
            </h2>

            <p className="text-sm text-gray-500">
              Enter your latest health measurements.
            </p>
          </div>

        </div>

        <form onSubmit={handleSubmit}>

          {/* Measurements */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

            {/* Weight */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Weight (kg)
              </label>

              <input
                type="number"
                step="0.1"
                name="weight"
                value={formData.weight}
                onChange={handleChange}
                placeholder="e.g. 62.5"
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400"
              />
            </div>

            {/* Blood Pressure */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Blood Pressure
              </label>

              <input
                type="text"
                name="bloodPressure"
                value={formData.bloodPressure}
                onChange={handleChange}
                placeholder="e.g. 118/78"
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400"
              />
            </div>

            {/* Heart Rate */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Heart Rate (bpm)
              </label>

              <input
                type="number"
                name="heartRate"
                value={formData.heartRate}
                onChange={handleChange}
                placeholder="e.g. 76"
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400"
              />
            </div>

          </div>

          {/* Symptoms */}
          <div className="mt-5">

            <label className="block text-sm font-medium text-gray-700 mb-2">
              Symptoms
            </label>

            <input
              type="text"
              name="symptoms"
              value={formData.symptoms}
              onChange={handleChange}
              placeholder="e.g. Headache, nausea, back pain"
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400"
            />

          </div>

          {/* Notes */}
          <div className="mt-5">

            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes
            </label>

            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="4"
              placeholder="Add any additional information..."
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 resize-none"
            />

          </div>

          {/* Save */}
          <div className="mt-6 flex items-center gap-4">

            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 bg-pink-600 text-white rounded-lg font-medium hover:bg-pink-700 transition"
            >
              <Save size={18} />
              Save Health Record
            </button>

            {saved && (
              <p className="text-sm text-green-600 font-medium">
                Health record saved successfully!
              </p>
            )}

          </div>

        </form>

      </div>

      {/* Latest Record */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">

        <h2 className="text-lg font-semibold text-gray-800">
          Latest Health Record
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-5">

          <div className="bg-gray-50 rounded-xl p-5">
            <p className="text-sm text-gray-500">
              Weight
            </p>

            <p className="text-2xl font-bold text-gray-800 mt-2">
              {formData.weight || "--"} kg
            </p>
          </div>

          <div className="bg-gray-50 rounded-xl p-5">
            <p className="text-sm text-gray-500">
              Blood Pressure
            </p>

            <p className="text-2xl font-bold text-gray-800 mt-2">
              {formData.bloodPressure || "--"}
            </p>
          </div>

          <div className="bg-gray-50 rounded-xl p-5">
            <p className="text-sm text-gray-500">
              Heart Rate
            </p>

            <p className="text-2xl font-bold text-gray-800 mt-2">
              {formData.heartRate || "--"} bpm
            </p>
          </div>

        </div>

        {formData.symptoms && (
          <div className="mt-5">
            <p className="text-sm text-gray-500">
              Symptoms
            </p>

            <p className="text-gray-700 mt-1">
              {formData.symptoms}
            </p>
          </div>
        )}

      </div>

    </div>
  );
}

export default Health;