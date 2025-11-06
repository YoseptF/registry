/**
 * Extracts a readable error message from various error types
 *
 * @param error - The error object (can be Error, string, or unknown)
 * @param defaultMessage - Fallback message if error type is unknown
 * @returns A readable error message string
 */
export function getErrorMessage(
  error: unknown,
  defaultMessage = 'An error occurred'
): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return defaultMessage
}
