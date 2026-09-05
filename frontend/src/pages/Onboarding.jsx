import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { usePregnancy } from "../context/PregnancyContext";

function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, saveProfile } = usePregnancy();

  const [formData, setFormData] = useState({
    name: user?.fullName || profile.name || "",
    email: user?.email || profile.email || "",
    lmpDate: profile.lmpDate || "2026-02-09",
    bloodPressure: profile.bloodPressure || "118/78",
    height: profile.height || "165",
    weight: profile.weight || "62.5",
    heartRate: profile.heartRate || "76",
    bloodGroup: profile.bloodGroup || "O+",
    pregnancyType: profile.pregnancyType || "Single",
    doctorName: profile.doctorName || "Dr. Sharma",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const calculateDueDatePreview = (lmp) => {
    if (!lmp) return "";
    const d = new Date(lmp);
    d.setDate(d.getDate() + 280);
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const calculatedBMI =
    formData.weight && formData.height
      ? (
          parseFloat(formData.weight) /
          Math.pow(parseFloat(formData.height) / 100, 2)
        ).toFixed(1)
      : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    await saveProfile(formData);
    setIsSubmitting(false);
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen w-full bg-zinc-50 text-zinc-900 py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Initial Registration
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">
            Pregnancy & Health Profile Setup
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 max-w-md mx-auto">
            Please provide your clinical parameters and pregnancy timeline below to configure your dynamic dashboard.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-zinc-200 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Account Info */}
            <div className="pb-5 border-b border-zinc-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Your Name"
                  required
                  className="w-full border border-zinc-300 rounded-lg px-3.5 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1">
                  Gmail / Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="your.email@gmail.com"
                  required
                  className="w-full border border-zinc-300 rounded-lg px-3.5 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                />
              </div>
            </div>

            {/* LMP Date Section */}
            <div className="space-y-1.5 pb-5 border-b border-zinc-100">
              <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider">
                Last Menstrual Period (LMP) Date *
              </label>
              <p className="text-[11px] text-zinc-500">
                Used to automatically calculate gestational age in weeks/days, trimester milestones, and expected delivery date.
              </p>
              <input
                type="date"
                name="lmpDate"
                required
                value={formData.lmpDate}
                onChange={handleChange}
                className="w-full border border-zinc-300 rounded-lg px-3.5 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
              />

              {formData.lmpDate && (
                <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg text-xs text-zinc-700 flex items-center justify-between mt-2">
                  <span>Calculated Estimated Due Date:</span>
                  <strong className="text-zinc-900 text-sm">
                    {calculateDueDatePreview(formData.lmpDate)}
                  </strong>
                </div>
              )}
            </div>

            {/* Vitals Section */}
            <div className="space-y-3.5 pb-5 border-b border-zinc-100">
              <h2 className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">
                Physical Vitals & Blood Group
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-zinc-600 mb-1">
                    Current Weight (kg) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    name="weight"
                    required
                    value={formData.weight}
                    onChange={handleChange}
                    placeholder="62.5"
                    className="w-full border border-zinc-300 rounded-lg px-3.5 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                  />
                </div>

                <div>
                  <label className="block text-xs text-zinc-600 mb-1">
                    Height (cm) *
                  </label>
                  <input
                    type="number"
                    name="height"
                    required
                    value={formData.height}
                    onChange={handleChange}
                    placeholder="165"
                    className="w-full border border-zinc-300 rounded-lg px-3.5 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                  />
                </div>

                <div>
                  <label className="block text-xs text-zinc-600 mb-1">
                    Blood Pressure (mmHg) *
                  </label>
                  <input
                    type="text"
                    name="bloodPressure"
                    required
                    value={formData.bloodPressure}
                    onChange={handleChange}
                    placeholder="118/78"
                    className="w-full border border-zinc-300 rounded-lg px-3.5 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-600 mb-1">
                    Resting Heart Rate (bpm)
                  </label>
                  <input
                    type="number"
                    name="heartRate"
                    value={formData.heartRate}
                    onChange={handleChange}
                    placeholder="76"
                    className="w-full border border-zinc-300 rounded-lg px-3.5 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                  />
                </div>

                <div>
                  <label className="block text-xs text-zinc-600 mb-1">
                    Blood Group & Rh Factor *
                  </label>
                  <select
                    name="bloodGroup"
                    value={formData.bloodGroup}
                    onChange={handleChange}
                    className="w-full border border-zinc-300 rounded-lg px-3.5 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 bg-white"
                  >
                    <option value="O+">O Positive (O+)</option>
                    <option value="O-">O Negative (O-)</option>
                    <option value="A+">A Positive (A+)</option>
                    <option value="A-">A Negative (A-)</option>
                    <option value="B+">B Positive (B+)</option>
                    <option value="B-">B Negative (B-)</option>
                    <option value="AB+">AB Positive (AB+)</option>
                    <option value="AB-">AB Negative (AB-)</option>
                  </select>
                </div>
              </div>

              {calculatedBMI && (
                <div className="p-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs text-zinc-700 flex items-center justify-between">
                  <span>Calculated Body Mass Index (BMI):</span>
                  <strong className="text-zinc-900">{calculatedBMI}</strong>
                </div>
              )}
            </div>

            {/* Provider & Type Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1">
                  Pregnancy Type
                </label>
                <select
                  name="pregnancyType"
                  value={formData.pregnancyType}
                  onChange={handleChange}
                  className="w-full border border-zinc-300 rounded-lg px-3.5 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 bg-white"
                >
                  <option value="Single">Single</option>
                  <option value="Twins">Twins</option>
                  <option value="Triplets">Triplets / Multiple</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1">
                  Primary Doctor / Clinic Name
                </label>
                <input
                  type="text"
                  name="doctorName"
                  value={formData.doctorName}
                  onChange={handleChange}
                  placeholder="Dr. Sharma"
                  className="w-full border border-zinc-300 rounded-lg px-3.5 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 flex items-center justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50 shadow-xs"
              >
                {isSubmitting ? "Saving details..." : "Save and Open Dashboard"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Onboarding;
