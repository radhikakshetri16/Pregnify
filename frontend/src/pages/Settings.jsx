import { useEffect, useState } from "react";

import {
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Users,
  Lock,
  Eye,
  EyeOff,
  Save,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";

const API_URL = "http://127.0.0.1:5000/api";

// =========================================================
// PASSWORD INPUT COMPONENT
// IMPORTANT:
// Keep this component OUTSIDE Settings().
// Otherwise React can remount it on every keystroke.
// =========================================================

const PasswordInput = ({
  label,
  name,
  value,
  placeholder,
  visible,
  onToggle,
  onChange,
}) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>

      <div className="relative">
        <Lock
          size={17}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
        />

        <input
          type={visible ? "text" : "password"}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full pl-11 pr-11 py-3 rounded-xl border border-gray-200 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-100 focus:border-pink-400 transition"
        />

        <button
          type="button"
          onClick={onToggle}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
};

// =========================================================
// SETTINGS PAGE
// =========================================================

function Settings() {
  // =======================================================
  // PROFILE STATE
  // =======================================================

  const [profile, setProfile] = useState({
    name: "",
    email: "",
    age: "",
    gender: "",
    phone: "",
    address: "",
    relationship_type: "",
    patient_id: null,
  });

  // =======================================================
  // PASSWORD STATE
  // =======================================================

  const [passwordData, setPasswordData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  // =======================================================
  // LOADING / SUBMITTING STATES
  // =======================================================

  const [loading, setLoading] = useState(true);

  const [savingProfile, setSavingProfile] =
    useState(false);

  const [changingPassword, setChangingPassword] =
    useState(false);

  // =======================================================
  // MESSAGES
  // =======================================================

  const [profileError, setProfileError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [profileSuccess, setProfileSuccess] =
    useState("");

  const [passwordSuccess, setPasswordSuccess] =
    useState("");

  // =======================================================
  // PASSWORD VISIBILITY
  // =======================================================

  const [showCurrentPassword, setShowCurrentPassword] =
    useState(false);

  const [showNewPassword, setShowNewPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  // =======================================================
  // GET LOGGED-IN USER
  // =======================================================

  const getLoggedInUser = () => {
    try {
      const storedUser = localStorage.getItem("user");

      if (!storedUser) {
        return null;
      }

      const parsedUser = JSON.parse(storedUser);

      return parsedUser;
    } catch (error) {
      console.error(
        "Unable to read logged-in user:",
        error
      );

      return null;
    }
  };

  // =======================================================
  // LOAD PROFILE
  // =======================================================

  const fetchProfile = async () => {
    const user = getLoggedInUser();

    if (!user || !user.id) {
      setProfileError(
        "Unable to identify the logged-in user."
      );

      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/settings/profile?user_id=${user.id}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to load profile."
        );
      }

      const savedProfile = data.profile;

      setProfile({
        name: savedProfile.name || "",
        email: savedProfile.email || "",
        age: savedProfile.age ?? "",
        gender: savedProfile.gender || "",
        phone: savedProfile.phone || "",
        address: savedProfile.address || "",
        relationship_type:
          savedProfile.relationship_type || "",
        patient_id:
          savedProfile.patient_id || null,
      });
    } catch (error) {
      console.error(
        "Load profile error:",
        error
      );

      setProfileError(
        error.message ||
          "Unable to load profile."
      );
    } finally {
      setLoading(false);
    }
  };

  // =======================================================
  // LOAD PROFILE ON PAGE OPEN
  // =======================================================

  useEffect(() => {
    fetchProfile();
  }, []);

  // =======================================================
  // PROFILE INPUT CHANGE
  // =======================================================

  const handleProfileChange = (event) => {
    const { name, value } = event.target;

    setProfile((previous) => ({
      ...previous,
      [name]: value,
    }));

    setProfileError("");
    setProfileSuccess("");
  };

  // =======================================================
  // PASSWORD INPUT CHANGE
  // =======================================================

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;

    setPasswordData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setPasswordError("");
    setPasswordSuccess("");
  };

  // =======================================================
  // UPDATE PROFILE
  // =======================================================

  const handleProfileSubmit = async (event) => {
    event.preventDefault();

    const user = getLoggedInUser();

    if (!user || !user.id) {
      setProfileError(
        "Unable to identify the logged-in user."
      );
      return;
    }

    // -------------------------------------------------------
    // NAME
    // -------------------------------------------------------

    if (!profile.name.trim()) {
      setProfileError("Name is required.");
      return;
    }

    // -------------------------------------------------------
    // EMAIL
    // -------------------------------------------------------

    if (!profile.email.trim()) {
      setProfileError("Email is required.");
      return;
    }

    // -------------------------------------------------------
    // PHONE
    // -------------------------------------------------------

    if (
      profile.phone &&
      !/^\d{10}$/.test(profile.phone)
    ) {
      setProfileError(
        "Phone number must contain exactly 10 digits."
      );
      return;
    }

    // -------------------------------------------------------
    // AGE
    //
    // Account holder's age can be changed, but must be
    // between 20 and 100.
    // -------------------------------------------------------

    if (
      profile.age === "" ||
      profile.age === null ||
      profile.age === undefined
    ) {
      setProfileError(
        "Please enter your age."
      );
      return;
    }

    const ageNumber = Number(profile.age);

    if (
      !Number.isInteger(ageNumber) ||
      ageNumber < 20 ||
      ageNumber > 100
    ) {
      setProfileError(
        "Age must be between 20 and 100 years."
      );
      return;
    }

    // -------------------------------------------------------
    // GENDER
    //
    // If relationship is Self, the account holder is also
    // the patient and must remain Female.
    //
    // If the account holder is a representative, their own
    // gender can be changed.
    // -------------------------------------------------------

    if (!profile.gender) {
      setProfileError(
        "Please select your gender."
      );
      return;
    }

    if (
      profile.relationship_type === "Self" &&
      profile.gender !== "Female"
    ) {
      setProfileError(
        "A patient registered as Self must have Female as their gender."
      );
      return;
    }

    // -------------------------------------------------------
    // SAVE PROFILE
    // -------------------------------------------------------

    setSavingProfile(true);
    setProfileError("");
    setProfileSuccess("");

    try {
      const response = await fetch(
        `${API_URL}/settings/profile`,
        {
          method: "PUT",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            user_id: user.id,

            name:
              profile.name.trim(),

            email:
              profile.email.trim(),

            age:
              ageNumber,

            gender:
              profile.gender,

            phone:
              profile.phone || null,

            address:
              profile.address || null,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to update profile."
        );
      }

      setProfileSuccess(
        "Your profile has been updated successfully."
      );

      // -----------------------------------------------------
      // UPDATE LOCAL STORAGE
      // -----------------------------------------------------

      const storedUser =
        getLoggedInUser();

      if (storedUser) {
        const updatedUser = {
          ...storedUser,

          name:
            profile.name.trim(),

          email:
            profile.email.trim(),
        };

        localStorage.setItem(
          "user",
          JSON.stringify(updatedUser)
        );
      }

      // -----------------------------------------------------
      // RELOAD PROFILE
      // -----------------------------------------------------

      await fetchProfile();

    } catch (error) {
      console.error(
        "Update profile error:",
        error
      );

      setProfileError(
        error.message ||
          "Unable to update profile."
      );
    } finally {
      setSavingProfile(false);
    }
  };

  // =======================================================
  // CHANGE PASSWORD
  // =======================================================

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();

    const user = getLoggedInUser();

    // -------------------------------------------------------
    // CHECK LOGGED-IN USER
    // -------------------------------------------------------

    if (!user || !user.id) {
      setPasswordError(
        "Unable to identify the logged-in user."
      );
      return;
    }

    // -------------------------------------------------------
    // CURRENT PASSWORD
    // -------------------------------------------------------

    if (
      !passwordData.current_password
    ) {
      setPasswordError(
        "Please enter your current password."
      );
      return;
    }

    // -------------------------------------------------------
    // NEW PASSWORD
    // -------------------------------------------------------

    if (
      !passwordData.new_password
    ) {
      setPasswordError(
        "Please enter a new password."
      );
      return;
    }

    // -------------------------------------------------------
    // MINIMUM LENGTH
    // -------------------------------------------------------

    if (
      passwordData.new_password.length < 6
    ) {
      setPasswordError(
        "New password must be at least 6 characters long."
      );
      return;
    }

    // -------------------------------------------------------
    // UPPERCASE
    // -------------------------------------------------------

    if (
      !/[A-Z]/.test(
        passwordData.new_password
      )
    ) {
      setPasswordError(
        "New password must contain at least one uppercase letter."
      );
      return;
    }

    // -------------------------------------------------------
    // LOWERCASE
    // -------------------------------------------------------

    if (
      !/[a-z]/.test(
        passwordData.new_password
      )
    ) {
      setPasswordError(
        "New password must contain at least one lowercase letter."
      );
      return;
    }

    // -------------------------------------------------------
    // NUMBER
    // -------------------------------------------------------

    if (
      !/[0-9]/.test(
        passwordData.new_password
      )
    ) {
      setPasswordError(
        "New password must contain at least one number."
      );
      return;
    }

    // -------------------------------------------------------
    // SPECIAL CHARACTER
    // -------------------------------------------------------

    if (
      !/[^A-Za-z0-9]/.test(
        passwordData.new_password
      )
    ) {
      setPasswordError(
        "New password must contain at least one special character."
      );
      return;
    }

    // -------------------------------------------------------
    // CONFIRM PASSWORD
    // -------------------------------------------------------

    if (
      passwordData.new_password !==
      passwordData.confirm_password
    ) {
      setPasswordError(
        "New passwords do not match."
      );
      return;
    }

    // -------------------------------------------------------
    // CHANGE PASSWORD
    // -------------------------------------------------------

    setChangingPassword(true);
    setPasswordError("");
    setPasswordSuccess("");

    try {
      const response = await fetch(
        `${API_URL}/settings/password`,
        {
          method: "PUT",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            user_id: user.id,

            current_password:
              passwordData.current_password,

            new_password:
              passwordData.new_password,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to change password."
        );
      }

      setPasswordSuccess(
        "Your password has been changed successfully."
      );

      setPasswordData({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });

    } catch (error) {
      console.error(
        "Change password error:",
        error
      );

      setPasswordError(
        error.message ||
          "Unable to change password."
      );
    } finally {
      setChangingPassword(false);
    }
  };

  // =======================================================
  // LOADING STATE
  // =======================================================

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">

          <div className="w-8 h-8 border-2 border-pink-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />

          <p className="text-gray-500">
            Loading your settings...
          </p>

        </div>
      </div>
    );
  }

  // =======================================================
  // MAIN UI
  // =======================================================

  return (
    <div className="max-w-5xl mx-auto pb-10">

      {/* ===================================================
          PAGE HEADER
      =================================================== */}

      <div className="mb-8">

        <div className="flex items-center gap-3">

          <div className="w-11 h-11 rounded-xl bg-pink-50 flex items-center justify-center">
            <User
              size={22}
              className="text-pink-600"
            />
          </div>

          <div>

            <h1 className="text-3xl font-bold text-gray-800">
              Settings
            </h1>

            <p className="text-gray-500 mt-1">
              Manage your personal information and account security.
            </p>

          </div>

        </div>

      </div>

      {/* ===================================================
          PERSONAL INFORMATION
      =================================================== */}

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden mb-6">

        {/* HEADER */}

        <div className="px-6 py-5 border-b border-gray-100">

          <div className="flex items-center gap-3">

            <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center">

              <User
                size={19}
                className="text-pink-600"
              />

            </div>

            <div>

              <h2 className="text-lg font-semibold text-gray-800">
                Personal Information
              </h2>

              <p className="text-sm text-gray-500 mt-0.5">
                View and update your account details.
              </p>

            </div>

          </div>

        </div>

        <form onSubmit={handleProfileSubmit}>

          <div className="p-6">

            {/* PROFILE ERROR */}

            {profileError && (
              <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-600 flex items-start gap-2.5">

                <AlertCircle
                  size={18}
                  className="mt-0.5 flex-shrink-0"
                />

                <p className="text-sm">
                  {profileError}
                </p>

              </div>
            )}

            {/* PROFILE SUCCESS */}

            {profileSuccess && (
              <div className="mb-5 p-3.5 rounded-xl bg-green-50 border border-green-100 text-green-600 flex items-start gap-2.5">

                <CheckCircle2
                  size={18}
                  className="mt-0.5 flex-shrink-0"
                />

                <p className="text-sm">
                  {profileSuccess}
                </p>

              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              {/* FULL NAME */}

              <div>

                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>

                <div className="relative">

                  <User
                    size={17}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                  />

                  <input
                    type="text"
                    name="name"
                    value={profile.name}
                    onChange={handleProfileChange}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 text-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-100 focus:border-pink-400 transition"
                  />

                </div>

              </div>

              {/* EMAIL */}

              <div>

                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>

                <div className="relative">

                  <Mail
                    size={17}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                  />

                  <input
                    type="email"
                    name="email"
                    value={profile.email}
                    onChange={handleProfileChange}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 text-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-100 focus:border-pink-400 transition"
                  />

                </div>

              </div>

              {/* AGE */}

              <div>

                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Age
                </label>

                <div className="relative">

                  <Calendar
                    size={17}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                  />

                  <input
                    type="number"
                    name="age"
                    min={20}
                    max={100}
                    step={1}
                    value={profile.age}
                    onChange={handleProfileChange}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 text-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-100 focus:border-pink-400 transition"
                  />

                </div>

                <p className="text-xs text-gray-400 mt-1.5">
                  Age must be between 20 and 100 years.
                </p>

              </div>

              {/* GENDER */}

              <div>

                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gender
                </label>

                <select
                  name="gender"
                  value={profile.gender}
                  onChange={handleProfileChange}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-100 focus:border-pink-400 transition"
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

                {profile.relationship_type ===
                  "Self" && (
                  <p className="text-xs text-gray-400 mt-1.5">
                    Patients registered as Self must remain Female.
                  </p>
                )}

              </div>

              {/* PHONE */}

              <div>

                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>

                <div className="relative">

                  <Phone
                    size={17}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                  />

                  <input
                    type="tel"
                    name="phone"
                    value={profile.phone}
                    onChange={handleProfileChange}
                    maxLength={10}
                    inputMode="numeric"
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 text-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-100 focus:border-pink-400 transition"
                  />

                </div>

                <p className="text-xs text-gray-400 mt-1.5">
                  Enter exactly 10 digits.
                </p>

              </div>

              {/* RELATIONSHIP */}

              <div>

                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Relationship to Patient
                </label>

                <div className="relative">

                  <Users
                    size={17}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                  />

                  <input
                    type="text"
                    value={
                      profile.relationship_type ||
                      "Not specified"
                    }
                    disabled
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed"
                  />

                </div>

                <p className="text-xs text-gray-400 mt-1.5">
                  This relationship is fixed when the account is created.
                </p>

              </div>

              {/* ADDRESS */}

              <div className="md:col-span-2">

                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>

                <div className="relative">

                  <MapPin
                    size={17}
                    className="absolute left-4 top-4 text-gray-400"
                  />

                  <textarea
                    name="address"
                    rows="3"
                    value={profile.address}
                    onChange={handleProfileChange}
                    placeholder="Enter your address"
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 text-gray-700 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-pink-100 focus:border-pink-400 transition"
                  />

                </div>

              </div>

            </div>

          </div>

          {/* SAVE PROFILE */}

          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end">

            <button
              type="submit"
              disabled={savingProfile}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-pink-600 text-white text-sm font-medium hover:bg-pink-700 transition disabled:opacity-60"
            >

              {savingProfile ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={17} />
                  Save Changes
                </>
              )}

            </button>

          </div>

        </form>

      </div>

      {/* ===================================================
          SECURITY
      =================================================== */}

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">

        {/* SECURITY HEADER */}

        <div className="px-6 py-5 border-b border-gray-100">

          <div className="flex items-center gap-3">

            <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center">

              <ShieldCheck
                size={19}
                className="text-pink-600"
              />

            </div>

            <div>

              <h2 className="text-lg font-semibold text-gray-800">
                Security
              </h2>

              <p className="text-sm text-gray-500 mt-0.5">
                Change your password to keep your account secure.
              </p>

            </div>

          </div>

        </div>

        <form onSubmit={handlePasswordSubmit}>

          <div className="p-6">

            {/* PASSWORD ERROR */}

            {passwordError && (
              <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-600 flex items-start gap-2.5">

                <AlertCircle
                  size={18}
                  className="mt-0.5 flex-shrink-0"
                />

                <p className="text-sm">
                  {passwordError}
                </p>

              </div>
            )}

            {/* PASSWORD SUCCESS */}

            {passwordSuccess && (
              <div className="mb-5 p-3.5 rounded-xl bg-green-50 border border-green-100 text-green-600 flex items-start gap-2.5">

                <CheckCircle2
                  size={18}
                  className="mt-0.5 flex-shrink-0"
                />

                <p className="text-sm">
                  {passwordSuccess}
                </p>

              </div>
            )}

            <div className="max-w-xl space-y-5">

              {/* CURRENT PASSWORD */}

              <PasswordInput
                label="Current Password"
                name="current_password"
                value={
                  passwordData.current_password
                }
                placeholder="Enter your current password"
                visible={showCurrentPassword}
                onChange={
                  handlePasswordChange
                }
                onToggle={() =>
                  setShowCurrentPassword(
                    (previous) => !previous
                  )
                }
              />

              {/* NEW PASSWORD */}

              <PasswordInput
                label="New Password"
                name="new_password"
                value={
                  passwordData.new_password
                }
                placeholder="Enter your new password"
                visible={showNewPassword}
                onChange={
                  handlePasswordChange
                }
                onToggle={() =>
                  setShowNewPassword(
                    (previous) => !previous
                  )
                }
              />

              {/* CONFIRM PASSWORD */}

              <PasswordInput
                label="Confirm New Password"
                name="confirm_password"
                value={
                  passwordData.confirm_password
                }
                placeholder="Re-enter your new password"
                visible={showConfirmPassword}
                onChange={
                  handlePasswordChange
                }
                onToggle={() =>
                  setShowConfirmPassword(
                    (previous) => !previous
                  )
                }
              />

            </div>

            {/* PASSWORD REQUIREMENTS */}

            <div className="mt-5 p-4 rounded-xl bg-gray-50 border border-gray-100">

              <p className="text-xs font-medium text-gray-600 mb-2">
                Password requirements
              </p>

              <ul className="text-xs text-gray-500 space-y-1">

                <li>
                  • At least 6 characters
                </li>

                <li>
                  • At least one uppercase letter
                </li>

                <li>
                  • At least one lowercase letter
                </li>

                <li>
                  • At least one number
                </li>

                <li>
                  • At least one special character
                </li>

              </ul>

            </div>

          </div>

          {/* CHANGE PASSWORD BUTTON */}

          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end">

            <button
              type="submit"
              disabled={changingPassword}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-pink-600 text-white text-sm font-medium hover:bg-pink-700 transition disabled:opacity-60"
            >

              {changingPassword ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Lock size={17} />
                  Change Password
                </>
              )}

            </button>

          </div>

        </form>

      </div>

    </div>
  );
}

export default Settings;
