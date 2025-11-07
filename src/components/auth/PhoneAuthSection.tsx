import { PhoneInput } from '@/components/ui/phone-input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

interface PhoneAuthSectionProps {
  phone: string
  onPhoneChange: (value: string) => void
  phoneLabel: string
  sendCodeText: string
  soonText: string
  inputId: string
}

/**
 * Phone authentication section (currently disabled, coming soon)
 * Shows phone input and verification button with "coming soon" badge
 */
export function PhoneAuthSection({
  phone,
  onPhoneChange,
  phoneLabel,
  sendCodeText,
  soonText,
  inputId,
}: PhoneAuthSectionProps) {
  return (
    <div className="relative opacity-50 pointer-events-none">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={inputId}>{phoneLabel}</Label>
          <PhoneInput value={phone} onChange={onPhoneChange} disabled={true} />
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full relative"
          disabled={true}
        >
          {sendCodeText}
          <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
            {soonText}
          </span>
        </Button>
      </div>
    </div>
  )
}
