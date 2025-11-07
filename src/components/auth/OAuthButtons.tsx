import { Button } from '@/components/ui/button'

interface OAuthButtonsProps {
  onGoogleClick: () => void
  loading: boolean
  soonText: string
}

/**
 * OAuth authentication buttons for Google and Apple
 * Google is functional, Apple shows "coming soon" badge
 */
export function OAuthButtons({
  onGoogleClick,
  loading,
  soonText,
}: OAuthButtonsProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Button
        type="button"
        variant="outline"
        onClick={onGoogleClick}
        disabled={loading}
      >
        Google
      </Button>
      <Button
        type="button"
        variant="outline"
        disabled={true}
        className="relative"
      >
        Apple
        <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
          {soonText}
        </span>
      </Button>
    </div>
  )
}
