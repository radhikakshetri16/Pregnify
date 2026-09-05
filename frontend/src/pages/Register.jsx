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
  validatePatientGender,
} from "../utils/validation";


function Register() {
  const navigate = useNavigate();

  // =========================================================
  // RELATIONSHIP
  // =========================================================

  const [relationshipType, setRelationshipType] =
    useState("Self");

  const isSelf = relationshipType === "Self";


  // =========================================================
  // FORM DATA
  // =========================================================

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


  // =========================================================
  // UI STATE
  // =========================================================

  const [showPassword, setShowPassword] =
    useState(false);

  const [passwordTouched, setPasswordTouched] =
    useState(false);

  const [error, setError] = useState("");

  const [loading, setLoading] = useState(false);


  // =========================================================
  // PASSWORD STATUS
  // =========================================================

  const pwStatus =
    checkPasswordRequirements(
      formData.password
    );


  // =========================================================
  // SELF REGISTRATION
  //
  // When the account holder is the patient:
  //
  // Patient name  = Account holder name
  // Patient age   = Account holder age
  // Patient gender = Account holder gender
  // Patient phone = Account holder phone
  //
  // IMPORTANT:
  // We DO NOT automatically force the gender to Female.
  // This allows validationPatientGender() to detect if
  // someone selected Male or Other.
  // =========================================================

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


  // =========================================================
  // HANDLE INPUT CHANGE
  // =========================================================

  const handleChange = (event) => {
    const { name, value } = event.target;


    // -------------------------------------------------------
    // Phone number
    //
    // Only digits
    // Maximum 10 digits
    // -------------------------------------------------------

    if (
      name === "phone" ||
      name === "patient_phone"
    ) {
      const digitsOnly = value
        .replace(/\D/g, "")
        .slice(0, 10);

      setFormData((previous) => ({
        ...previous,
        [name]: digitsOnly,
      }));

      return;
    }


    // -------------------------------------------------------
    // Normal input
    // -------------------------------------------------------

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));


    // -------------------------------------------------------
    // If account holder gender changes while Self is
    // selected, update patient gender immediately.
    // -------------------------------------------------------

    if (
      name === "gender" &&
      relationshipType === "Self"
    ) {
      setFormData((previous) => ({
        ...previous,
        gender: value,
        patient_gender: value,
      }));
    }
  };


  // =========================================================
  // HANDLE RELATIONSHIP CHANGE
  // =========================================================

  const handleRelationshipChange = (event) => {
    const value = event.target.value;

    setRelationshipType(value);
    setError("");


    // -------------------------------------------------------
    // Switching from Self to representative
    //
    // Clear patient-specific fields.
    // -------------------------------------------------------

    if (value !== "Self") {
      setFormData((previous) => ({
        ...previous,

        patient_name: "",
        patient_age: "",
        patient_gender: "",
        patient_phone: "",
        patient_address: "",
      }));
    }


    // -------------------------------------------------------
    // Switching to Self
    //
    // Patient fields will automatically be populated by
    // the useEffect above.
    // -------------------------------------------------------
  };


  // =========================================================
  // AGE WARNING MESSAGES
  // =========================================================

  const holderAgeNum = Number(
    formData.age
  );

  const patientAgeNum = Number(
    formData.patient_age
  );


  // ---------------------------------------------------------
  // Self age warning
  // ---------------------------------------------------------

  let selfAgeWarning = null;

  if (
    isSelf &&
    formData.age !== "" &&
    Number.isFinite(holderAgeNum) &&
    holderAgeNum < 20
  ) {
    selfAgeWarning =
      "Patients registering themselves must be at least 20 years old.";
  }


  // ---------------------------------------------------------
  // Representative age warning
  // ---------------------------------------------------------

  let repHolderAgeWarning = null;

  if (
    !isSelf &&
    formData.age !== "" &&
    Number.isFinite(holderAgeNum) &&
    holderAgeNum < 18
  ) {
    repHolderAgeWarning =
      "The account holder / representative must be at least 18 years old.";
  }


  // ---------------------------------------------------------
  // Representative patient age warning
  // ---------------------------------------------------------

  let repPatientAgeWarning = null;

  if (
    !isSelf &&
    formData.patient_age !== "" &&
    Number.isFinite(patientAgeNum) &&
    patientAgeNum < 20
  ) {
    repPatientAgeWarning =
      "The patient must be at least 20 years old.";
  }


  // ---------------------------------------------------------
  // Self gender warning
  // ---------------------------------------------------------

  let selfGenderWarning = null;

  if (
    isSelf &&
    formData.gender &&
    formData.gender !== "Female"
  ) {
    selfGenderWarning =
      "You cannot register yourself as the patient because the patient must be female.";
  }


  // =========================================================
  // FORM SUBMISSION
  // =========================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");


    // -------------------------------------------------------
    // 1. PASSWORD VALIDATION
    // -------------------------------------------------------

    if (!pwStatus.isValid) {
      setError(
        pwStatus.errorMessage
      );

      setPasswordTouched(true);

      return;
    }


    // -------------------------------------------------------
    // 2. AGE VALIDATION
    // -------------------------------------------------------

    const ageValidation =
      validateRegistrationAges(
        relationshipType,
        formData.age,
        formData.patient_age
      );


    if (!ageValidation.isValid) {
      setError(
        ageValidation.error
      );

      return;
    }


    // -------------------------------------------------------
    // 3. ACCOUNT HOLDER PHONE
    // -------------------------------------------------------

    if (
      !/^\d{10}$/.test(
        formData.phone
      )
    ) {
      setError(
        "Phone number must contain exactly 10 digits."
      );

      return;
    }


    // -------------------------------------------------------
    // 4. PATIENT PHONE
    // -------------------------------------------------------

    const patientPhone = isSelf
      ? formData.phone
      : formData.patient_phone;


    if (
      !/^\d{10}$/.test(
        patientPhone
      )
    ) {
      setError(
        "Patient phone number must contain exactly 10 digits."
      );

      return;
    }


    // -------------------------------------------------------
    // 5. PATIENT GENDER
    // -------------------------------------------------------

    const genderValidation =
      validatePatientGender(
        formData.patient_gender
      );


    if (!genderValidation.isValid) {
      setError(
        genderValidation.error
      );

      return;
    }


    // -------------------------------------------------------
    // 6. PATIENT NAME
    // -------------------------------------------------------

    if (
      !formData.patient_name.trim()
    ) {
      setError(
        "Please enter the patient's full name."
      );

      return;
    }


    // -------------------------------------------------------
    // 7. PATIENT ADDRESS
    // -------------------------------------------------------

    if (
      !formData.patient_address.trim()
    ) {
      setError(
        "Please enter the patient's address."
      );

      return;
    }


    // -------------------------------------------------------
    // START REGISTRATION
    // -------------------------------------------------------

    setLoading(true);


    try {
      const response = await fetch(
        "http://127.0.0.1:5000/api/auth/register",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            // Account holder
            name: formData.name,
            email: formData.email,
            password: formData.password,
            age: Number(formData.age),
            gender: formData.gender,
            phone: formData.phone,

            // Patient
            patient_name:
              formData.patient_name,

            patient_age: isSelf
              ? Number(formData.age)
              : Number(formData.patient_age),

            // IMPORTANT:
            // Do NOT hardcode "Female".
            // Send the actual validated value.
            patient_gender:
              formData.patient_gender,

            patient_phone:
              patientPhone,

            patient_address:
              formData.patient_address,

            // Relationship
            relationship_type:
              relationshipType,
          }),
        }
      );


      // -----------------------------------------------------
      // Parse response safely
      // -----------------------------------------------------

      let data = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }


      // -----------------------------------------------------
      // Backend error
      // -----------------------------------------------------

      if (!response.ok) {
        setError(
          data.error ||
          data.message ||
          "Registration failed."
        );

        return;
      }


      // -----------------------------------------------------
      // SUCCESS
      // -----------------------------------------------------

      navigate("/login");

    } catch (err) {

      console.error(
        "Registration error:",
        err
      );

      setError(
        "Unable to connect to the server. Please make sure the backend is running."
      );

    } finally {

      setLoading(false);

    }
  };


  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">

      <div className="w-full max-w-3xl">


        {/* =================================================
            HEADER
        ================================================= */}

        <div className="text-center mb-8">

          <h1 className="text-3xl font-bold text-pink-600 tracking-tight">
            Pregnify
          </h1>

          <p className="text-gray-500 mt-2">
            Create an account to keep track
            of your pregnancy care and health.
          </p>

        </div>


        {/* =================================================
            CARD
        ================================================= */}

        <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-10">

          <form
            onSubmit={handleSubmit}
            className="space-y-8"
          >


            {/* =================================================
                ACCOUNT HOLDER
            ================================================= */}

            <div>

              <div className="mb-5 pb-3 border-b border-gray-100">

                <h2 className="text-xl font-bold text-gray-800">
                  Account Holder Information
                </h2>

                <p className="text-xs text-gray-500 mt-0.5">
                  Details of the person who creates
                  and manages this Pregnify account.
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
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      name="password"
                      value={formData.password}
                      onChange={(event) => {

                        handleChange(event);

                        if (!passwordTouched) {
                          setPasswordTouched(true);
                        }

                      }}
                      onFocus={() =>
                        setPasswordTouched(true)
                      }
                      placeholder="Enter a secure password"
                      required
                      className="w-full pl-4 pr-11 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          !showPassword
                        )
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                    >

                      {showPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}

                    </button>

                  </div>


                  {/* Password requirements */}

                  {(passwordTouched ||
                    formData.password) && (

                    <div className="mt-3 p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xs space-y-1.5">

                      <p className="font-semibold text-gray-700 mb-2">
                        Password Requirements:
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">

                        <PasswordRule
                          valid={
                            pwStatus.rules.minLength
                          }
                          text="At least 6 characters"
                        />

                        <PasswordRule
                          valid={
                            pwStatus.rules.hasUppercase
                          }
                          text="At least one uppercase letter (A-Z)"
                        />

                        <PasswordRule
                          valid={
                            pwStatus.rules.hasLowercase
                          }
                          text="At least one lowercase letter (a-z)"
                        />

                        <PasswordRule
                          valid={
                            pwStatus.rules.hasNumber
                          }
                          text="At least one number (0-9)"
                        />

                        <PasswordRule
                          valid={
                            pwStatus.rules.hasSpecial
                          }
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
                    max="120"
                    required
                    className={`w-full px-4 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 ${
                      formData.age &&
                      (
                        isSelf
                          ? holderAgeNum < 20
                          : holderAgeNum < 18
                      )
                        ? "border-amber-400 bg-amber-50/40"
                        : "border-gray-300"
                    }`}
                  />

                  <p className="text-xs text-gray-400 mt-1">

                    {isSelf
                      ? "Must be at least 20 years old because you are registering as the patient."
                      : "Must be at least 18 years old to create and manage the account."}

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

                    <option value="">
                      Select gender
                    </option>

                    <option value="Female">
                      Female
                    </option>

                    <option value="Male">
                      Male
                    </option>

                    <option value="Other">
                      Other
                    </option>

                  </select>


                  {isSelf &&
                    formData.gender === "Male" && (

                    <p className="text-xs text-red-600 mt-1.5 flex items-start gap-1.5">

                      <AlertCircle
                        size={14}
                        className="shrink-0 mt-0.5"
                      />

                      A male cannot register as
                      the patient.

                    </p>

                  )}


                  {isSelf &&
                    formData.gender === "Other" && (

                    <p className="text-xs text-red-600 mt-1.5 flex items-start gap-1.5">

                      <AlertCircle
                        size={14}
                        className="shrink-0 mt-0.5"
                      />

                      The patient must be female.

                    </p>

                  )}

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


              {/* Representative Age Warning */}

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


            {/* =================================================
                RELATIONSHIP
            ================================================= */}

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
                    checked={
                      relationshipType === "Self"
                    }
                    onChange={
                      handleRelationshipChange
                    }
                    className="mt-1 accent-pink-600"
                  />

                  <div>

                    <p className="font-semibold text-gray-800 text-sm">
                      I am the patient
                    </p>

                    <p className="text-xs text-gray-500 mt-0.5">
                      I am creating and managing my own record.
                      The patient must be female and at least 20 years old.
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
                    checked={
                      relationshipType === "Husband"
                    }
                    onChange={
                      handleRelationshipChange
                    }
                    className="mt-1 accent-pink-600"
                  />

                  <div>

                    <p className="font-semibold text-gray-800 text-sm">
                      Husband
                    </p>

                    <p className="text-xs text-gray-500 mt-0.5">
                      I am registering and managing the account on behalf of my wife.
                      The representative must be 18+ and the patient must be female and 20+.
                    </p>

                  </div>

                </label>


                {/* Other representatives */}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

                  {[
                    {
                      id: "Guardian",
                      label: "Guardian",
                    },
                    {
                      id: "Caretaker",
                      label: "Caretaker",
                    },
                    {
                      id: "Other",
                      label: "Other Representative",
                    },
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
                        checked={
                          relationshipType ===
                          option.id
                        }
                        onChange={
                          handleRelationshipChange
                        }
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

                    <p>
                      {selfAgeWarning}
                    </p>

                  </div>

                </div>

              )}


              {/* Self Gender Warning */}

              {selfGenderWarning && (

                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-xs text-red-700">

                  <AlertCircle
                    size={18}
                    className="shrink-0 mt-0.5 text-red-600"
                  />

                  <div>

                    <p className="font-bold text-red-800 mb-1">
                      Patient Gender Requirement
                    </p>

                    <p>
                      {selfGenderWarning}
                    </p>

                  </div>

                </div>

              )}

            </div>


            {/* =================================================
                PATIENT DETAILS
            ================================================= */}

            <div className="pt-6 border-t border-gray-100">

              <div className="mb-5 pb-3 border-b border-gray-100">

                <h2 className="text-xl font-bold text-gray-800">
                  Patient Details
                </h2>

                <p className="text-xs text-gray-500 mt-0.5">

                  {isSelf
                    ? "Automatically filled from your account details above."
                    : "Information of the pregnant patient. The patient must be female and at least 20 years old."}

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
                    value={
                      formData.patient_name
                    }
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
                    value={
                      formData.patient_age
                    }
                    onChange={handleChange}
                    placeholder="e.g. 24"
                    min="20"
                    max="120"
                    required
                    readOnly={isSelf}
                    className={`w-full px-4 py-2.5 text-sm border rounded-xl outline-none ${
                      isSelf
                        ? "bg-gray-100 border-gray-200 text-gray-600 cursor-not-allowed"
                        : formData.patient_age &&
                          patientAgeNum < 20
                          ? "border-amber-400 bg-amber-50/40"
                          : "border-gray-300 focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                    }`}
                  />

                  {!isSelf && (

                    <p className="text-xs text-gray-400 mt-1">
                      Patient must be at least 20 years old.
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
                    value={
                      formData.patient_gender
                    }
                    onChange={handleChange}
                    disabled={isSelf}
                    required
                    className={`w-full px-4 py-2.5 text-sm border rounded-xl outline-none ${
                      isSelf
                        ? "bg-gray-100 border-gray-200 text-gray-600 cursor-not-allowed"
                        : "bg-white border-gray-300 focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                    }`}
                  >

                    <option value="">
                      Select gender
                    </option>

                    <option value="Female">
                      Female
                    </option>

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
                    value={
                      formData.patient_phone
                    }
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
                    Patient Address *
                  </label>

                  <textarea
                    name="patient_address"
                    value={
                      formData.patient_address
                    }
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


            {/* =================================================
                GENERAL ERROR
            ================================================= */}

            {error && (

              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3">

                <AlertCircle
                  size={18}
                  className="shrink-0 mt-0.5 text-red-600"
                />

                <span>
                  {error}
                </span>

              </div>

            )}


            {/* =================================================
                SUBMIT
            ================================================= */}

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
                  onClick={() =>
                    navigate("/login")
                  }
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


// =========================================================
// PASSWORD RULE COMPONENT
// =========================================================

function PasswordRule({
  valid,
  text,
}) {
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

      <span>
        {text}
      </span>

    </div>
  );
}


export default Register;
