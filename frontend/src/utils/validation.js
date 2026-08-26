/**
 * Password complexity validation helper.
 * Rules:
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
    minLength && hasUppercase && hasLowercase && hasNumber && hasSpecial;

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
 * Validates registration ages based on Pregnify policy:
 * - Account Holder must be >= 18
 * - Patient must be >= 16
 * - If Self (Account Holder == Patient): Must be >= 18 (16-17 cannot self-register, <16 not supported)
 */
export function validateRegistrationAges(relationshipType, accountHolderAge, patientAge) {
  const holderAgeNum = Number(accountHolderAge);

  if (!accountHolderAge || isNaN(holderAgeNum)) {
    return {
      isValid: false,
      error: "Please enter a valid age for the account holder.",
    };
  }

  if (relationshipType === "Self") {
    if (holderAgeNum < 16) {
      return {
        isValid: false,
        error: "Pregnify is only available for patients aged 16 and above.",
      };
    }
    if (holderAgeNum < 18) {
      return {
        isValid: false,
        error:
          "Patients aged 16–17 cannot create an account independently. An adult representative (18+) must create and manage the account.",
      };
    }
    return { isValid: true, error: null };
  }

  // Representative Case
  if (holderAgeNum < 18) {
    return {
      isValid: false,
      error: "The account holder / representative must be at least 18 years old.",
    };
  }

  const patientAgeNum = Number(patientAge);
  if (!patientAge || isNaN(patientAgeNum)) {
    return {
      isValid: false,
      error: "Please enter a valid age for the patient.",
    };
  }

  if (patientAgeNum < 16) {
    return {
      isValid: false,
      error:
        "Patient must be at least 16 years old. Pregnify does not support registrations for patients below 16.",
    };
  }

  return { isValid: true, error: null };
}
