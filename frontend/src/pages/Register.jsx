import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check,
  Eye,
  EyeOff,
  AlertCircle,
} from "lucide-react";

import {
  checkPasswordRequirements,
  validateRegistrationAges,
} from "../utils/validation";

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

  const [showPassword, setShowPassword] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isSelf = relationshipType === "Self";

  // Password requirements
  const pwStatus = checkPasswordRequirements(formData.password);

  // Automatically copy account-holder details to patient details
  // when the account holder is the patient.
  useEffect(() => {
    if (relationshipType === "Self") {
      setFormData((previous) => ({
        ...previous,
        patient_name: previous.name,
        patient_age: previous.age,
        patient_gender: "Female",
        patient_phone: previous.phone,
      }));
    }
  }, [
    relationshipType,
    formData.name,
    formData.age,
    formData.phone,
  ]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    // Phone number validation:
    // Allow only digits and maximum 10 digits.
    if (name === "phone" || name === "patient_phone") {
      const digitsOnly = value.replace(/\D/g, "").slice(0, 10);

      setFormData((previous) => ({
        ...previous,
        [name]: digitsOnly,
      }));

      return;
    }

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

  // --------------------------------------------------
  // AGE WARNING MESSAGES
  // --------------------------------------------------

  const holderAgeNum = Number(formData.age);
  const patientAgeNum = Number(formData.patient_age);

  let selfAgeWarning = null;

  if (isSelf && formData.age) {
    if (holderAgeNum < 16) {
      selfAgeWarning =
        "Registration is not supported for individuals under 16 years of age.";
    } else if (holderAgeNum < 18) {
      selfAgeWarning =
        "Patients aged 16–17 cannot create an account independently. An adult representative (18+) must create and manage the account.";
    }
  }

  let repHolderAgeWarning = null;

  if (!isSelf && formData.age && holderAgeNum < 18) {
    repHolderAgeWarning =
      "The Account Holder / Representative must be at least 18 years old.";
  }

  let repPatientAgeWarning = null;

  if (!isSelf && formData.patient_age && patientAgeNum < 16) {
    repPatientAgeWarning =
      "Patient must be at least 16 years old. Pregnify does not support registrations for patients below 16.";
  }

  // --------------------------------------------------
  // FORM SUBMISSION
  // --------------------------------------------------

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    // 1. Password validation
    if (!pwStatus.isValid) {
      setError(pwStatus.errorMessage);
      setPasswordTouched(true);
      return;
    }

    // 2. Age validation
    const ageValidation = validateRegistrationAges(
      relationshipType,
      formData.age,
      formData.patient_age
    );

    if (!ageValidation.isValid) {
      setError(ageValidation.error);
      return;
    }

    // 3. Account holder phone validation
    if (!/^\d{10}$/.test(formData.phone)) {
      setError("Phone number must contain exactly 10 digits.");
      return;
    }

    // 4. Patient phone validation
    const patientPhone = isSelf
      ? formData.phone
      : formData.patient_phone;

    if (!/^\d{10}$/.test(patientPhone)) {
      setError("Patient phone number must contain exactly 10 digits.");
      return;
    }

    // 5. Patient gender validation
    if (formData.patient_gender !== "Female") {
      setError("Patient must be female.");
      return;
    }

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

            age: Number(formData.age),

            patient_age: isSelf
              ? Number(formData.age)
              : Number(formData.patient_age),

            patient_gender: "Female",

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
    } catch (err) {
      console.error(err);
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
          <h1 className="text-3xl font-bold text-pink-600 tracking-tight">
            Pregnify
          </h1>

          <p className="text-gray-500 mt-2">
            Create an account to keep track of your pregnancy care and health.
          </p>
        </div>

        <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-10">

          <form onSubmit={handleSubmit} className="space-y-8">

            {/* ---------------------------------------- */}
            {/* ACCOUNT HOLDER INFORMATION */}
            {/* ---------------------------------------- */}

            <div>
              <div className="mb-5 pb-3 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-800">
                  Account Holder Information
                </h2>

                <p className="text-xs text-gray-500 mt-0.5">
                  Details of the person who creates and manages this
                  Pregnify account (Must be 18+).
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                {/* Full Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Full Name *
                  </label>

                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    required
                    className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email Address *
                  </label>

                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    required
                    className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                  />
                </div>

                {/* Password */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Password *
                  </label>

                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={(event) => {
                        handleChange(event);

                        if (!passwordTouched) {
                          setPasswordTouched(true);
                        }
                      }}
                      onFocus={() => setPasswordTouched(true)}
                      placeholder="Enter a secure password"
                      required
                      className="w-full pl-4 pr-11 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                    >
                      {showPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>

                  {/* Password Requirements */}
                  {(passwordTouched || formData.password) && (
                    <div className="mt-3 p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xs space-y-1.5">

                      <p className="font-semibold text-gray-700 mb-2">
                        Password Requirements:
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">

                        {/* Minimum Length */}
                        <PasswordRule
                          valid={pwStatus.rules.minLength}
                          text="At least 6 characters"
                        />

                        {/* Uppercase */}
                        <PasswordRule
                          valid={pwStatus.rules.hasUppercase}
                          text="At least one uppercase letter (A-Z)"
                        />

                        {/* Lowercase */}
                        <PasswordRule
                          valid={pwStatus.rules.hasLowercase}
                          text="At least one lowercase letter (a-z)"
                        />

                        {/* Number */}
                        <PasswordRule
                          valid={pwStatus.rules.hasNumber}
                          text="At least one number (0-9)"
                        />

                        {/* Special Character */}
                        <PasswordRule
                          valid={pwStatus.rules.hasSpecial}
                          text="At least one special character (!@#$%...)"
                        />

                      </div>
                    </div>
                  )}
                </div>

                {/* Account Holder Age */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Account Holder Age *
                  </label>

                  <input
                    type="number"
                    name="age"
                    value={formData.age}
                    onChange={handleChange}
                    placeholder="e.g. 25"
                    min="1"
                    max="100"
                    required
                    className={`w-full px-4 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 ${
                      formData.age && holderAgeNum < 18
                        ? "border-amber-400 bg-amber-50/40"
                        : "border-gray-300"
                    }`}
                  />

                  <p className="text-xs text-gray-400 mt-1">
                    Must be 18 years or older to hold an account.
                  </p>
                </div>

                {/* Account Holder Gender */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Gender
                  </label>

                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                  >
                    <option value="">Select gender</option>
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Phone */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Phone Number *
                  </label>

                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Enter 10-digit phone number"
                    inputMode="numeric"
                    maxLength={10}
                    pattern="[0-9]{10}"
                    required
                    className={`w-full px-4 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 ${
                      formData.phone &&
                      formData.phone.length !== 10
                        ? "border-amber-400"
                        : "border-gray-300"
                    }`}
                  />

                  <p className="text-xs text-gray-400 mt-1">
                    Must contain exactly 10 digits.
                  </p>
                </div>
              </div>

              {/* Representative Holder Age Warning */}
              {repHolderAgeWarning && (
                <div className="mt-4 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
                  <AlertCircle
                    size={16}
                    className="shrink-0 mt-0.5 text-red-600"
                  />

                  <div>
                    <span className="font-semibold">
                      Account Holder Age Requirement:{" "}
                    </span>

                    {repHolderAgeWarning}
                  </div>
                </div>
              )}
            </div>

            {/* ---------------------------------------- */}
            {/* RELATIONSHIP */}
            {/* ---------------------------------------- */}

            <div className="pt-6 border-t border-gray-100">

              <div className="mb-5 pb-3 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-800">
                  Pregnancy / Patient Relationship
                </h2>

                <p className="text-xs text-gray-500 mt-0.5">
                  Who does this pregnancy record belong to?
                </p>
              </div>

              <div className="space-y-3">

                {/* Self */}
                <label
                  className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition ${
                    relationshipType === "Self"
                      ? "border-pink-500 bg-pink-50/60 shadow-xs"
                      : "border-gray-200 hover:border-gray-300 bg-white"
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
                    <p className="font-semibold text-gray-800 text-sm">
                      I am the patient
                    </p>

                    <p className="text-xs text-gray-500 mt-0.5">
                      I am creating and managing my own record.
                      (Requires age 18+ for self-registration).
                    </p>
                  </div>
                </label>

                {/* Husband */}
                <label
                  className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition ${
                    relationshipType === "Husband"
                      ? "border-pink-500 bg-pink-50/60 shadow-xs"
                      : "border-gray-200 hover:border-gray-300 bg-white"
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
                    <p className="font-semibold text-gray-800 text-sm">
                      Husband
                    </p>

                    <p className="text-xs text-gray-500 mt-0.5">
                      I am registering and managing the account on behalf
                      of my wife.
                    </p>
                  </div>
                </label>

                {/* Other Representatives */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: "Guardian", label: "Guardian" },
                    { id: "Caretaker", label: "Caretaker" },
                    { id: "Other", label: "Other Representative" },
                  ].map((option) => (
                    <label
                      key={option.id}
                      className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
                        relationshipType === option.id
                          ? "border-pink-500 bg-pink-50/60 shadow-xs"
                          : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                    >
                      <input
                        type="radio"
                        name="relationship"
                        value={option.id}
                        checked={relationshipType === option.id}
                        onChange={handleRelationshipChange}
                        className="accent-pink-600"
                      />

                      <span className="text-xs font-semibold text-gray-800">
                        {option.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Self Age Warning */}
              {selfAgeWarning && (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-xs text-amber-800">
                  <AlertCircle
                    size={18}
                    className="shrink-0 mt-0.5 text-amber-600"
                  />

                  <div>
                    <p className="font-bold text-amber-900 mb-1">
                      Age Requirement Notice
                    </p>

                    <p>{selfAgeWarning}</p>
                  </div>
                </div>
              )}
            </div>

            {/* ---------------------------------------- */}
            {/* PATIENT DETAILS */}
            {/* ---------------------------------------- */}

            <div className="pt-6 border-t border-gray-100">

              <div className="mb-5 pb-3 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-800">
                  Patient Details
                </h2>

                <p className="text-xs text-gray-500 mt-0.5">
                  {isSelf
                    ? "Automatically filled from your account details above."
                    : "Information of the pregnant patient (Must be 16+ and female)."}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                {/* Patient Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Patient Full Name *
                  </label>

                  <input
                    type="text"
                    name="patient_name"
                    value={formData.patient_name}
                    onChange={handleChange}
                    placeholder="Patient's full name"
                    required
                    readOnly={isSelf}
                    className={`w-full px-4 py-2.5 text-sm border rounded-xl outline-none ${
                      isSelf
                        ? "bg-gray-100 border-gray-200 text-gray-600 cursor-not-allowed"
                        : "border-gray-300 focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                    }`}
                  />
                </div>

                {/* Patient Age */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Patient Age *
                  </label>

                  <input
                    type="number"
                    name="patient_age"
                    value={formData.patient_age}
                    onChange={handleChange}
                    placeholder="e.g. 24"
                    min="1"
                    max="120"
                    required
                    readOnly={isSelf}
                    className={`w-full px-4 py-2.5 text-sm border rounded-xl outline-none ${
                      isSelf
                        ? "bg-gray-100 border-gray-200 text-gray-600 cursor-not-allowed"
                        : "border-gray-300 focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                    }`}
                  />

                  {!isSelf && (
                    <p className="text-xs text-gray-400 mt-1">
                      Minimum supported patient age is 16 years.
                    </p>
                  )}
                </div>

                {/* Patient Gender */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Patient Gender *
                  </label>

                  <select
                    name="patient_gender"
                    value={formData.patient_gender}
                    onChange={handleChange}
                    disabled={isSelf}
                    required
                    className={`w-full px-4 py-2.5 text-sm border rounded-xl outline-none ${
                      isSelf
                        ? "bg-gray-100 border-gray-200 text-gray-600 cursor-not-allowed"
                        : "bg-white border-gray-300 focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                    }`}
                  >
                    <option value="">Select gender</option>
                    <option value="Female">Female</option>
                  </select>

                  <p className="text-xs text-gray-400 mt-1">
                    Only female patients can be registered for pregnancy care.
                  </p>
                </div>

                {/* Patient Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Patient Phone Number *
                  </label>

                  <input
                    type="text"
                    name="patient_phone"
                    value={formData.patient_phone}
                    onChange={handleChange}
                    placeholder="Enter 10-digit phone number"
                    inputMode="numeric"
                    maxLength={10}
                    pattern="[0-9]{10}"
                    required
                    readOnly={isSelf}
                    className={`w-full px-4 py-2.5 text-sm border rounded-xl outline-none ${
                      isSelf
                        ? "bg-gray-100 border-gray-200 text-gray-600 cursor-not-allowed"
                        : "border-gray-300 focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                    }`}
                  />

                  <p className="text-xs text-gray-400 mt-1">
                    Must contain exactly 10 digits.
                  </p>
                </div>

                {/* Patient Address */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Patient Address
                  </label>

                  <textarea
                    name="patient_address"
                    value={formData.patient_address}
                    onChange={handleChange}
                    placeholder="Enter patient's residence address"
                    rows="2"
                    required
                    className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 resize-none"
                  />
                </div>
              </div>

              {/* Representative Patient Age Warning */}
              {repPatientAgeWarning && (
                <div className="mt-4 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
                  <AlertCircle
                    size={16}
                    className="shrink-0 mt-0.5 text-red-600"
                  />

                  <div>
                    <span className="font-semibold">
                      Patient Age Requirement:{" "}
                    </span>

                    {repPatientAgeWarning}
                  </div>
                </div>
              )}
            </div>

            {/* ---------------------------------------- */}
            {/* ERROR MESSAGE */}
            {/* ---------------------------------------- */}

            {error && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3">
                <AlertCircle
                  size={18}
                  className="shrink-0 mt-0.5 text-red-600"
                />

                <span>{error}</span>
              </div>
            )}

            {/* ---------------------------------------- */}
            {/* SUBMIT */}
            {/* ---------------------------------------- */}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-pink-600 text-white py-3 rounded-xl font-semibold hover:bg-pink-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-xs cursor-pointer"
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
                  className="text-pink-600 font-semibold hover:underline cursor-pointer"
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

// --------------------------------------------------
// PASSWORD RULE COMPONENT
// --------------------------------------------------

function PasswordRule({ valid, text }) {
  return (
    <div
      className={`flex items-center gap-2 ${
        valid
          ? "text-green-600 font-medium"
          : "text-gray-500"
      }`}
    >
      {valid ? (
        <Check
          size={14}
          className="text-green-600 shrink-0"
        />
      ) : (
        <span className="w-3.5 h-3.5 rounded-full border border-gray-300 inline-block shrink-0" />
      )}

      <span>{text}</span>
    </div>
  );
}

export default Register;