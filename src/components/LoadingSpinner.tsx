interface LoadingSpinnerProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Reusable loading spinner component
 * Displays a centered, animated spinner
 */
export function LoadingSpinner({
  className = '',
  size = 'md',
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  }

  return (
    <div className={`min-h-screen flex items-center justify-center ${className}`}>
      <div
        className={`animate-spin rounded-full border-b-2 border-primary ${sizeClasses[size]}`}
      />
    </div>
  )
}
