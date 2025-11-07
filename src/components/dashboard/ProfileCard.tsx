import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Edit } from 'lucide-react'
import type { User } from '@/types'

interface ProfileCardProps {
  profile: User
  onEdit: () => void
  editText: string
  title?: string
}

/**
 * Reusable profile card component for dashboard pages
 * Displays user avatar, name, email, role, and optional bio
 * Includes edit button
 */
export function ProfileCard({
  profile,
  onEdit,
  editText,
  title,
}: ProfileCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        {title && <CardTitle>{title}</CardTitle>}
        <Button onClick={onEdit} variant="outline" size="sm">
          <Edit className="w-4 h-4 mr-2" />
          {editText}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar
            src={profile.avatar_url}
            alt={profile.name || 'User'}
            fallbackText={profile.name || 'User'}
            size="lg"
          />
          <div>
            <h3 className="text-xl font-semibold">{profile.name}</h3>
            <p className="text-muted-foreground">{profile.email}</p>
            <p className="text-sm text-muted-foreground capitalize">
              {profile.role}
            </p>
          </div>
        </div>
        {profile.bio && (
          <p className="text-sm text-muted-foreground">{profile.bio}</p>
        )}
      </CardContent>
    </Card>
  )
}
