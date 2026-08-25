import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function Register() {
  const navigate = useNavigate();

  const [relationshipType, setRelationshipType] = useState("Self");

  const [formData, setFormData] = useState({
    // Account holder
    name: "",
    email: "",
    password: "",
    age: "",
    gender: "",
    phone: "",

    // Patient
    patient_name: "",
    patient_age: "",
    patient_gender: "",
    patient_phone: "",
    patient_address: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isSelf = relationshipType === "Self";

  // Automatically copy account details to patient details
  // when the account holder is the patient.
  useEffect(() => {
    if (relationshipType === "Self") {
      setFormData((previous) => ({
        ...previous,
        patient_name: previous.name,
        patient_age: previous.age,
        patient_gender: previous.gender,
        patient_phone: previous.phone,
      }));
    }
  }, [
    relationshipType,
    formData.name,
    formData.age,
    formData.gender,
    formData.phone,
  ]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleRelationshipChange = (event) => {
    const value = event.target.value;

    setRelationshipType(value);

    if (value !== "Self") {
      setFormData((previous) => ({
        ...previous,
        patient_name: "",
        patient_age: "",
        patient_gender: "",
        patient_phone: "",
      }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        "http://127.0.0.1:5000/api/auth/register",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...formData,
            relationship_type: relationshipType,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Registration failed.");
        return;
      }

      navigate("/login");
    } catch (error) {
      console.error(error);
      setError("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-3xl">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-pink-600">
            Pregnify
          </h1>

          <p className="text-gray-500 mt-2">
            Create your account
          </p>
        </div>

        <div className="w-full bg-white rounded-2xl shadow-md p-8">

          <form onSubmit={handleSubmit} className="space-y-8">

            {/* Account Details */}
            <div>
              <div className="mb-5">
                <h2 className="text-xl font-semibold text-gray-800">
                  Account Details
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  Enter the details of the person creating this account.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full name
                  </label>

                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl
                               focus:outline-none focus:ring-2 focus:ring-pink-500
                               focus:border-pink-500"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email address
                  </label>

                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl
                               focus:outline-none focus:ring-2 focus:ring-pink-500
                               focus:border-pink-500"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>

                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="At least 6 characters"
                    required
                    minLength={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl
                               focus:outline-none focus:ring-2 focus:ring-pink-500
                               focus:border-pink-500"
                  />
                </div>

                {/* Age */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Age
                  </label>

                  <input
                    type="number"
                    name="age"
                    value={formData.age}
                    onChange={handleChange}
                    placeholder="Your age"
                    min="1"
                    max="120"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl
                               focus:outline-none focus:ring-2 focus:ring-pink-500
                               focus:border-pink-500"
                  />
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gender
                  </label>

                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl
                               bg-white focus:outline-none focus:ring-2
                               focus:ring-pink-500 focus:border-pink-500"
                  >
                    <option value="">Select gender</option>
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone number
                  </label>

                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Enter your phone number"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl
                               focus:outline-none focus:ring-2 focus:ring-pink-500
                               focus:border-pink-500"
                  />
                </div>

              </div>
            </div>

            {/* Patient Relationship */}
            <div className="pt-6 border-t border-gray-100">

              <div className="mb-5">
                <h2 className="text-xl font-semibold text-gray-800">
                  Patient Information
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  Tell us who the pregnancy information belongs to.
                </p>
              </div>

              <div className="space-y-3">

                {/* Self */}
                <label
                  className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition ${
                    relationshipType === "Self"
                      ? "border-pink-500 bg-pink-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="relationship"
                    value="Self"
                    checked={relationshipType === "Self"}
                    onChange={handleRelationshipChange}
                    className="mt-1 accent-pink-600"
                  />

                  <div>
                    <p className="font-medium text-gray-800">
                      I am the patient
                    </p>

                    <p className="text-sm text-gray-500 mt-1">
                      My account details will also be used as the patient
                      details.
                    </p>
                  </div>
                </label>

                {/* Husband */}
                <label
                  className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition ${
                    relationshipType === "Husband"
                      ? "border-pink-500 bg-pink-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="relationship"
                    value="Husband"
                    checked={relationshipType === "Husband"}
                    onChange={handleRelationshipChange}
                    className="mt-1 accent-pink-600"
                  />

                  <div>
                    <p className="font-medium text-gray-800">
                      I am the patient's husband
                    </p>

                    <p className="text-sm text-gray-500 mt-1">
                      I am creating an account on behalf of the patient.
                    </p>
                  </div>
                </label>

                {/* Caretaker / Guardian / Other */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

                  {["Caretaker", "Guardian", "Other"].map((type) => (
                    <label
                      key={type}
                      className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition ${
                        relationshipType === type
                          ? "border-pink-500 bg-pink-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="relationship"
                        value={type}
                        checked={relationshipType === type}
                        onChange={handleRelationshipChange}
                        className="accent-pink-600"
                      />

                      <span className="text-sm font-medium text-gray-800">
                        {type === "Other"
                          ? "Other representative"
                          : `I am the ${type.toLowerCase()}`}
                      </span>
                    </label>
                  ))}

                </div>
              </div>
            </div>

            {/* Patient Details */}
            <div className="pt-6 border-t border-gray-100">

              <div className="mb-5">
                <div className="flex items-center justify-between gap-4">

                  <div>
                    <h2 className="text-xl font-semibold text-gray-800">
                      Patient Details
                    </h2>

                    <p className="text-sm text-gray-500 mt-1">
                      {isSelf
                        ? "These details are automatically taken from your account."
                        : "Enter the details of the patient you are representing."}
                    </p>
                  </div>

                  {isSelf && (
                    <span className="hidden sm:inline-flex px-3 py-1 rounded-full
                                     text-xs font-medium bg-pink-100 text-pink-700">
                      Automatically filled
                    </span>
                  )}

                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                {/* Patient Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Patient full name
                  </label>

                  <input
                    type="text"
                    name="patient_name"
                    value={formData.patient_name}
                    onChange={handleChange}
                    placeholder="Patient's full name"
                    required
                    readOnly={isSelf}
                    className={`w-full px-4 py-3 border rounded-xl outline-none ${
                      isSelf
                        ? "bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed"
                        : "border-gray-300 focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                    }`}
                  />
                </div>

                {/* Patient Age */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Patient age
                  </label>

                  <input
                    type="number"
                    name="patient_age"
                    value={formData.patient_age}
                    onChange={handleChange}
                    placeholder="Patient's age"
                    min="1"
                    max="120"
                    readOnly={isSelf}
                    className={`w-full px-4 py-3 border rounded-xl outline-none ${
                      isSelf
                        ? "bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed"
                        : "border-gray-300 focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                    }`}
                  />
                </div>

                {/* Patient Gender */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Patient gender
                  </label>

                  <select
                    name="patient_gender"
                    value={formData.patient_gender}
                    onChange={handleChange}
                    disabled={isSelf}
                    className={`w-full px-4 py-3 border rounded-xl bg-white outline-none ${
                      isSelf
                        ? "bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed"
                        : "border-gray-300 focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                    }`}
                  >
                    <option value="">Select gender</option>
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Patient Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Patient phone
                  </label>

                  <input
                    type="text"
                    name="patient_phone"
                    value={formData.patient_phone}
                    onChange={handleChange}
                    placeholder="Patient's phone number"
                    readOnly={isSelf}
                    className={`w-full px-4 py-3 border rounded-xl outline-none ${
                      isSelf
                        ? "bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed"
                        : "border-gray-300 focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                    }`}
                  />
                </div>

                {/* Address */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Patient address
                  </label>

                  <textarea
                    name="patient_address"
                    value={formData.patient_address}
                    onChange={handleChange}
                    placeholder="Enter the patient's address"
                    rows="3"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl
                               focus:outline-none focus:ring-2 focus:ring-pink-500
                               focus:border-pink-500 resize-none"
                  />
                </div>

              </div>

              {/* Self information note */}
              {isSelf && (
                <div className="mt-5 p-4 rounded-xl bg-pink-50 border border-pink-100">
                  <p className="text-sm text-pink-700">
                    <span className="font-semibold">Note:</span>{" "}
                    Because you are registering yourself as the patient,
                    your account name, age, gender, and phone number are
                    automatically used for the patient record.
                  </p>
                </div>
              )}

            </div>

            {/* Error */}
            {error && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
                {error}
              </div>
            )}

            {/* Submit */}
            <div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-pink-600 text-white py-3 rounded-xl
                           font-medium hover:bg-pink-700 transition
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading
                  ? "Creating account..."
                  : "Create Pregnify Account"}
              </button>

              <p className="text-center text-sm text-gray-500 mt-5">
                Already have an account?{" "}

                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="text-pink-600 font-medium hover:underline"
                >
                  Login
                </button>
              </p>

            </div>

          </form>
        </div>
      </div>
    </div>
  );
}

export default Register;