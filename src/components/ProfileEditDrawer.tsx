import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { useOnlineStatus } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Upload, X } from 'lucide-react'
import type { User } from '@/types'

interface ProfileEditDrawerProps {
  open: boolean
  onClose: () => void
  profile: User | null
  onProfileUpdated: () => void
}

export function ProfileEditDrawer({
  open,
  onClose,
  profile,
  onProfileUpdated,
}: ProfileEditDrawerProps) {
  const { t } = useTranslation()
  const isOnline = useOnlineStatus()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState(profile?.name || '')
  const [phone, setPhone] = useState(profile?.phone || '')
  const [address, setAddress] = useState(profile?.address || '')
  const [bio, setBio] = useState(profile?.bio || '')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    profile?.avatar_url || null
  )
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswordSection, setShowPasswordSection] = useState(false)

  useEffect(() => {
    if (profile && open) {
      setName(profile.name || '')
      setPhone(profile.phone || '')
      setAddress(profile.address || '')
      setBio(profile.bio || '')
      setAvatarPreview(profile.avatar_url || null)
      setNewPassword('')
      setConfirmPassword('')
      setShowPasswordSection(false)
    }
  }, [profile, open])

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Avatar image must be less than 5MB')
        return
      }
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file')
        return
      }
      setAvatarFile(file)
      setAvatarPreview(URL.createObjectURL(file))
      setError(null)
    }
  }

  const removeAvatar = () => {
    setAvatarFile(null)
    setAvatarPreview(null)
  }

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile || !profile) return avatarPreview

    const fileExt = avatarFile.name.split('.').pop()
    const fileName = `${profile.id}-${Date.now()}.${fileExt}`
    const filePath = `${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, avatarFile, { upsert: true })

    if (uploadError) {
      console.error('Error uploading avatar:', uploadError)
      throw new Error('Failed to upload avatar image')
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('avatars').getPublicUrl(filePath)

    return publicUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return

    setLoading(true)
    setError(null)

    try {
      if (newPassword) {
        if (newPassword !== confirmPassword) {
          setError(t('errors.passwordsDontMatch'))
          setLoading(false)
          return
        }
        if (newPassword.length < 6) {
          setError(t('errors.passwordTooShort'))
          setLoading(false)
          return
        }
      }

      let avatarUrl = avatarPreview
      if (avatarFile) {
        avatarUrl = await uploadAvatar()
      }

      if (newPassword) {
        const { error: passwordError } = await supabase.auth.updateUser({
          password: newPassword,
        })
        if (passwordError) throw passwordError
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          name,
          phone: phone || null,
          address: address || null,
          bio: bio || null,
          avatar_url: avatarUrl,
        })
        .eq('id', profile.id)

      if (updateError) throw updateError

      onProfileUpdated()
      onClose()
    } catch (err) {
      console.error('Error updating profile:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (!profile) return null

  return (
    <Drawer open={open} onClose={onClose} title={t('user.editProfile')}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="avatar">{t('user.profilePicture')}</Label>
          {avatarPreview ? (
            <div className="relative w-32 h-32 mx-auto">
              <img
                src={avatarPreview}
                alt="Avatar preview"
                className="w-full h-full object-cover rounded-full"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2"
                onClick={removeAvatar}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <Label
                htmlFor="avatar"
                className="cursor-pointer text-sm text-muted-foreground hover:text-foreground"
              >
                {t('user.uploadAvatar')}
              </Label>
              <Input
                id="avatar"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">{t('auth.name')} *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">{t('auth.phone')}</Label>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">{t('auth.address')}</Label>
          <Input
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">{t('user.bio')}</Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder={t('user.bioPlaceholder')}
            rows={4}
          />
        </div>

        <div className="border-t pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowPasswordSection(!showPasswordSection)}
            className="w-full"
          >
            {showPasswordSection
              ? t('user.hidePasswordSection')
              : t('user.changePassword')}
          </Button>

          {showPasswordSection && (
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">{t('user.newPassword')}</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t('user.enterNewPassword')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  {t('user.confirmNewPassword')}
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t('user.confirmPasswordPlaceholder')}
                />
              </div>

              <p className="text-xs text-muted-foreground">
                {t('user.passwordRequirement')}
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <Button type="submit" className="flex-1" disabled={loading || !isOnline}>
            {!isOnline ? t('common.offline', 'Offline') : loading ? t('common.loading') : t('user.saveChanges')}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            {t('admin.cancel')}
          </Button>
        </div>
      </form>
    </Drawer>
  )
}
