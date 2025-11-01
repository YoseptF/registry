import { cn } from '@/lib/utils'

interface AvatarProps {
  src?: string | null
  alt: string
  fallbackText: string
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-12 h-12 text-sm',
  lg: 'w-24 h-24 text-2xl',
  xl: 'w-32 h-32 text-4xl',
}

export function Avatar({ src, alt, fallbackText, className, size = 'md' }: AvatarProps) {
  const getInitials = (text: string) => {
    const words = text.trim().split(' ')
    if (words.length >= 2) {
      return `${words[0][0]}${words[1][0]}`.toUpperCase()
    }
    return text.substring(0, 2).toUpperCase()
  }

  const initials = getInitials(fallbackText)

  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className={cn(
          'rounded-full object-cover',
          sizeClasses[size],
          className
        )}
      />
    )
  }

  return (
    <div
      className={cn(
        'rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white font-semibold',
        sizeClasses[size],
        className
      )}
    >
      {initials}
    </div>
  )
}
