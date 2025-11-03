import { useState, useEffect } from 'react'
import PhoneInputWithCountry from 'react-phone-number-input'
import { cn } from '@/lib/utils'

interface PhoneInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function PhoneInput({
  value,
  onChange,
  placeholder = '+1 555 000 0000',
  disabled = false,
  className,
}: PhoneInputProps) {
  const [defaultCountry, setDefaultCountry] = useState<'MX' | 'US' | undefined>('MX')

  useEffect(() => {
    // Try to detect user's country from browser
    const detectCountry = async () => {
      try {
        // Try to get timezone-based country detection
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

        // Common timezone to country mapping
        if (timezone.includes('Mexico') || timezone.includes('Tijuana') || timezone.includes('Monterrey')) {
          setDefaultCountry('MX')
        } else if (timezone.includes('America/New_York') || timezone.includes('America/Chicago') ||
                   timezone.includes('America/Los_Angeles') || timezone.includes('America/Denver')) {
          setDefaultCountry('US')
        } else {
          // Try using locale
          const locale = navigator.language || 'es-MX'
          if (locale.includes('MX')) {
            setDefaultCountry('MX')
          } else if (locale.includes('US')) {
            setDefaultCountry('US')
          } else {
            // Default to Mexico
            setDefaultCountry('MX')
          }
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Error intentionally ignored, fallback to Mexico
      } catch (_error) {
        setDefaultCountry('MX')
      }
    }

    detectCountry()
  }, [])

  return (
    <PhoneInputWithCountry
      international
      defaultCountry={defaultCountry}
      value={value}
      onChange={(val) => onChange(val || '')}
      disabled={disabled}
      placeholder={placeholder}
      className={cn(
        'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      numberInputProps={{
        className: 'flex-1 outline-none bg-transparent'
      }}
      countrySelectProps={{
        className: 'outline-none bg-transparent border-none'
      }}
    />
  )
}
