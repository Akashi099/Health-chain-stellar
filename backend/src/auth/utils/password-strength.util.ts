/**
 * Minimum complexity rules:
 *  - At least 8 characters
 *  - At least one uppercase letter
 *  - At least one lowercase letter
 *  - At least one digit
 *  - At least one special character
 *
 * Common/breached patterns are rejected via a small deny-list of the most
 * frequently seen passwords. For production, replace or augment with a
 * Have I Been Pwned k-anonymity API call.
 */

const COMMON_PASSWORDS = new Set([
  // These pass complexity checks but are extremely common (stored lowercase for case-insensitive matching)
  'password1!', 'password123!', 'welcome123!', 'admin1234!',
  'letmein1!', 'qwerty123!', 'monkey123!', 'dragon123!',
  'master123!', 'sunshine1!', 'football1!', 'baseball1!',
  'trustno1!', 'iloveyou1!', 'princess1!',
]);

const COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

export interface PasswordStrengthResult {
  valid: boolean;
  message?: string;
}

export function validatePasswordStrength(password: string): PasswordStrengthResult {
  if (!COMPLEXITY_REGEX.test(password)) {
    return {
      valid: false,
      message:
        'Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character',
    };
  }

  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return {
      valid: false,
      message: 'Password is too common. Please choose a more unique password',
    };
  }

  return { valid: true };
}
