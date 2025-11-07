export interface PasswordValidationResult {
  valid: boolean
  error?: string
}

/**
 * Validates password meets requirements and matches confirmation
 *
 * @param password - The password to validate
 * @param confirmPassword - The password confirmation
 * @param t - Translation function
 * @returns Validation result with error message if invalid
 */
export function validatePassword(
  password: string,
  confirmPassword: string,
  t: (key: string) => string
): PasswordValidationResult {
  if (password !== confirmPassword) {
    return { valid: false, error: t('errors.passwordsDontMatch') }
  }

  if (password.length < 6) {
    return { valid: false, error: t('errors.passwordTooShort') }
  }

  return { valid: true }
}
