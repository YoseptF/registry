interface ErrorMessageProps {
  message: string | null
  className?: string
}

/**
 * Reusable error message component
 * Displays error in a consistent styled format
 * Returns null if no message provided
 */
export function ErrorMessage({ message, className = '' }: ErrorMessageProps) {
  if (!message) return null

  return (
    <div
      className={`text-sm text-destructive bg-destructive/10 p-3 rounded-md ${className}`}
    >
      {message}
    </div>
  )
}
