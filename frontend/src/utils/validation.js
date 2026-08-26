/**
 * Password complexity validation helper.
 *
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
 * Validates registration ages based on Pregnify policy:
 *
 * - Account Holder must be >= 18
 * - Patient must be >= 16
 * - If Self, Account Holder == Patient and must be >= 18
 */
export function validateRegistrationAges(
  relationshipType,
  accountHolderAge,
  patientAge
) {
  const holderAgeNum = Number(accountHolderAge);

  // Account holder age missing/invalid
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

  // Account holder cannot be below 18
  if (holderAgeNum < 18) {
    if (relationshipType === "Self") {
      if (holderAgeNum < 16) {
        return {
          isValid: false,
          error:
            "Pregnify is only available for patients aged 16 and above.",
        };
      }

      return {
        isValid: false,
        error:
          "Patients aged 16–17 cannot create an account independently. An adult representative (18+) must create and manage the account.",
      };
    }

    return {
      isValid: false,
      error:
        "The account holder / representative must be at least 18 years old.",
    };
  }

  // Self registration is valid once account holder is 18+
  if (relationshipType === "Self") {
    return {
      isValid: true,
      error: null,
    };
  }

  // Representative registration:
  // Patient age is required.
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

  // Patient must be at least 16
  if (patientAgeNum < 16) {
    return {
      isValid: false,
      error:
        "Patient must be at least 16 years old. Pregnify does not support registrations for patients below 16.",
    };
  }

  return {
    isValid: true,
    error: null,
  };
}