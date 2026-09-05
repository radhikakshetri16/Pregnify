/**
 * =========================================================
 * PASSWORD VALIDATION
 * =========================================================
 *
 * Password requirements:
 * - At least 6 characters
 * - At least one uppercase letter (A-Z)
 * - At least one lowercase letter (a-z)
 * - At least one number (0-9)
 * - At least one special character
 */

export function checkPasswordRequirements(password = "") {
  const minLength = password.length >= 6;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const isValid =
    minLength &&
    hasUppercase &&
    hasLowercase &&
    hasNumber &&
    hasSpecial;

  return {
    isValid,

    rules: {
      minLength,
      hasUppercase,
      hasLowercase,
      hasNumber,
      hasSpecial,
    },

    errorMessage: !isValid
      ? "Password must be at least 6 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character."
      : "",
  };
}


/**
 * =========================================================
 * REGISTRATION AGE VALIDATION
 * =========================================================
 *
 * Pregnify age policy:
 *
 * SELF:
 * - Account holder is the patient.
 * - Patient must be at least 20 years old.
 *
 * REPRESENTATIVE:
 * - Account holder / representative must be at least 18.
 * - Patient must be at least 20.
 *
 * Relationship types:
 * - Self
 * - Husband
 * - Caretaker
 * - Guardian
 * - Other
 */

export function validateRegistrationAges(
  relationshipType,
  accountHolderAge,
  patientAge
) {
  // -------------------------------------------------------
  // Convert account holder age to number
  // -------------------------------------------------------

  const holderAgeNum = Number(accountHolderAge);

  // -------------------------------------------------------
  // Account holder age is required
  // -------------------------------------------------------

  if (
    accountHolderAge === "" ||
    accountHolderAge === null ||
    accountHolderAge === undefined ||
    !Number.isFinite(holderAgeNum)
  ) {
    return {
      isValid: false,
      error: "Please enter a valid age for the account holder.",
    };
  }

  // -------------------------------------------------------
  // SELF
  //
  // The account holder is also the patient.
  // Therefore, the person must be at least 20.
  // -------------------------------------------------------

  if (relationshipType === "Self") {
    if (holderAgeNum < 20) {
      return {
        isValid: false,
        error:
          "Patients registering themselves must be at least 20 years old.",
      };
    }

    return {
      isValid: true,
      error: null,
    };
  }

  // -------------------------------------------------------
  // REPRESENTATIVE
  //
  // Husband / Caretaker / Guardian / Other
  //
  // The person managing the account must be 18+.
  // -------------------------------------------------------

  if (holderAgeNum < 18) {
    return {
      isValid: false,
      error:
        "The account holder / representative must be at least 18 years old.",
    };
  }

  // -------------------------------------------------------
  // Patient age is required
  // -------------------------------------------------------

  const patientAgeNum = Number(patientAge);

  if (
    patientAge === "" ||
    patientAge === null ||
    patientAge === undefined ||
    !Number.isFinite(patientAgeNum)
  ) {
    return {
      isValid: false,
      error: "Please enter a valid age for the patient.",
    };
  }

  // -------------------------------------------------------
  // Patient must be at least 20
  // -------------------------------------------------------

  if (patientAgeNum < 20) {
    return {
      isValid: false,
      error: "The patient must be at least 20 years old.",
    };
  }

  // -------------------------------------------------------
  // Valid
  // -------------------------------------------------------

  return {
    isValid: true,
    error: null,
  };
}


/**
 * =========================================================
 * PATIENT GENDER VALIDATION
 * =========================================================
 *
 * Pregnify is a pregnancy-care system.
 *
 * Therefore:
 * - Patient must be Female.
 *
 * This is separate from account-holder gender because a
 * representative may be male or female.
 */

export function validatePatientGender(patientGender) {
  if (!patientGender) {
    return {
      isValid: false,
      error: "Please select the patient's gender.",
    };
  }

  if (patientGender !== "Female") {
    return {
      isValid: false,
      error:
        "The patient must be female because Pregnify is designed for pregnancy care.",
    };
  }

  return {
    isValid: true,
    error: null,
  };
}