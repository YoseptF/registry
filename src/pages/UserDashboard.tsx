import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Drawer } from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar } from '@/components/ui/avatar'
import { Navigation } from '@/components/Navigation'
import { QRCodeSVG } from 'qrcode.react'
import { User, Mail, Phone, MapPin, ChevronRight, Edit, Upload, X } from 'lucide-react'
import { usePageTitle } from '@/hooks/usePageTitle'
import type { Class, CheckIn, User as UserType } from '@/types'
import { format } from 'date-fns'

function ProfileEditDrawer({
  open,
  onClose,
  profile,
  onProfileUpdated,
}: {
  open: boolean
  onClose: () => void
  profile: UserType | null
  onProfileUpdated: () => void
}) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState(profile?.name || '')
  const [phone, setPhone] = useState(profile?.phone || '')
  const [address, setAddress] = useState(profile?.address || '')
  const [bio, setBio] = useState(profile?.bio || '')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url || null)
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

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath)

    return publicUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return

    setLoading(true)
    setError(null)

    try {
      // Validate password if provided
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

      // Update password if provided
      if (newPassword) {
        const { error: passwordError } = await supabase.auth.updateUser({
          password: newPassword
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
            {showPasswordSection ? t('user.hidePasswordSection') : t('user.changePassword')}
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
                <Label htmlFor="confirmPassword">{t('user.confirmNewPassword')}</Label>
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
          <Button type="submit" className="flex-1" disabled={loading}>
            {loading ? t('common.loading') : t('user.saveChanges')}
          </Button>
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            {t('admin.cancel')}
          </Button>
        </div>
      </form>
    </Drawer>
  )
}

function ClassDrawer({
  open,
  onClose,
  classInfo,
}: {
  open: boolean
  onClose: () => void
  classInfo: Class | null
}) {
  const { t } = useTranslation()
  const [members, setMembers] = useState<UserType[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (classInfo && open) {
      fetchMembers()
    }
  }, [classInfo?.id, open])

  const fetchMembers = async () => {
    if (!classInfo) return

    setLoading(true)
    try {
      const { data: memberships } = await supabase
        .from('class_memberships')
        .select('user_id')
        .eq('class_id', classInfo.id)

      if (memberships && memberships.length > 0) {
        const userIds = memberships.map((m) => m.user_id)
        const { data: usersData } = await supabase
          .from('profiles')
          .select('*')
          .in('id', userIds)

        setMembers(usersData || [])
      } else {
        setMembers([])
      }
    } catch (error) {
      console.error('Error fetching members:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!classInfo) return null

  return (
    <Drawer open={open} onClose={onClose} title={classInfo.name}>
      <div className="space-y-6">
        {classInfo.description && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">{t('admin.description')}</h3>
            <p className="text-sm">{classInfo.description}</p>
          </div>
        )}

        {classInfo.instructor && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">{t('admin.instructor')}</h3>
            <p className="text-sm">{classInfo.instructor}</p>
          </div>
        )}

        {classInfo.schedule && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">{t('admin.schedule')}</h3>
            <p className="text-sm">{classInfo.schedule}</p>
          </div>
        )}

        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4">
            {t('admin.enrolledUsers')} ({members.length})
          </h3>
          {loading ? (
            <div className="text-sm text-muted-foreground">{t('common.loading')}</div>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('admin.noUsersEnrolled')}</p>
          ) : (
            <div className="space-y-2">
              {members.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div>
                    <div className="font-medium">{user.name}</div>
                    <div className="text-xs text-muted-foreground">{user.email}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Drawer>
  )
}

export function UserDashboard() {
  const { t } = useTranslation()
  usePageTitle('pages.userDashboard')
  const { profile, refreshProfile } = useAuth()
  const [classes, setClasses] = useState<Class[]>([])
  const [checkIns, setCheckIns] = useState<CheckIn[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedClass, setSelectedClass] = useState<Class | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false)
  const [classMap, setClassMap] = useState<Record<string, string>>({})

  useEffect(() => {
    if (profile) {
      fetchUserData()
      subscribeToCheckIns()
    }
  }, [profile])

  const fetchUserData = async () => {
    if (!profile) return

    try {
      const { data: memberships } = await supabase
        .from('class_memberships')
        .select('class_id')
        .eq('user_id', profile.id)

      if (memberships && memberships.length > 0) {
        const classIds = memberships.map((m) => m.class_id)
        const { data: classData } = await supabase
          .from('classes')
          .select('*')
          .in('id', classIds)
        setClasses(classData || [])
      }

      const { data: checkInData } = await supabase
        .from('check_ins')
        .select('*')
        .eq('user_id', profile.id)
        .order('checked_in_at', { ascending: false })
        .limit(10)
      setCheckIns(checkInData || [])

      const uniqueClassIds = [...new Set(checkInData?.map((ci) => ci.class_id) || [])]
      if (uniqueClassIds.length > 0) {
        const { data: allClasses } = await supabase
          .from('classes')
          .select('id, name')
          .in('id', uniqueClassIds)

        const map: Record<string, string> = {}
        allClasses?.forEach((cls) => {
          map[cls.id] = cls.name
        })
        setClassMap(map)
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const subscribeToCheckIns = () => {
    if (!profile) return

    const channel = supabase
      .channel('user_check_ins_dashboard')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'check_ins',
          filter: `user_id=eq.${profile.id}`,
        },
        async (payload) => {
          const newCheckIn = payload.new as CheckIn

          const { data: classData } = await supabase
            .from('classes')
            .select('name')
            .eq('id', newCheckIn.class_id)
            .single()

          setCheckIns((prev) => [newCheckIn, ...prev].slice(0, 10))

          if (classData) {
            setClassMap((prev) => ({
              ...prev,
              [newCheckIn.class_id]: classData.name,
            }))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const generateQRData = () => {
    if (!profile) return ''
    return JSON.stringify({
      userId: profile.id,
      name: profile.name,
      timestamp: Date.now(),
    })
  }

  const handleClassClick = (cls: Class) => {
    setSelectedClass(cls)
    setIsDrawerOpen(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white dark:from-gray-900 dark:to-gray-800">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
            {t('user.dashboard')}
          </h1>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle>{t('user.profile')}</CardTitle>
                <CardDescription>{t('user.myProfile')}</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setIsProfileEditOpen(true)}>
                <Edit className="w-4 h-4 mr-2" />
                {t('user.edit')}
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-center mb-4">
                <Avatar
                  src={profile?.avatar_url}
                  alt={profile?.name || 'User'}
                  fallbackText={profile?.name || profile?.email || 'User'}
                  size="lg"
                  className="border-4 border-primary/20"
                />
              </div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span>{profile?.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span>{profile?.email}</span>
              </div>
              {profile?.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>{profile.phone}</span>
                </div>
              )}
              {profile?.address && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span>{profile.address}</span>
                </div>
              )}
              {profile?.bio && (
                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground">{profile.bio}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('user.myQrCode')}</CardTitle>
              <CardDescription>{t('user.qrCodeDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <QRCodeSVG
                  value={generateQRData()}
                  size={200}
                  level="H"
                  includeMargin
                  imageSettings={{
                    src: '/qr-center.png',
                    height: 40,
                    width: 40,
                    excavate: true,
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('user.myClasses')}</CardTitle>
              <CardDescription>{t('user.myClassesDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              {classes.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t('user.noClasses')}</p>
              ) : (
                <div className="space-y-2">
                  {classes.map((cls) => (
                    <button
                      key={cls.id}
                      onClick={() => handleClassClick(cls)}
                      className="w-full text-left p-3 border rounded-lg hover:bg-accent transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-semibold">{cls.name}</div>
                          {cls.description && (
                            <div className="text-sm text-muted-foreground">{cls.description}</div>
                          )}
                          {cls.schedule && (
                            <div className="text-xs text-muted-foreground mt-1">{cls.schedule}</div>
                          )}
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>{t('user.recentCheckIns')}</CardTitle>
                <CardDescription>{t('user.checkInsDesc')}</CardDescription>
              </div>
              <Link to="/check-ins-history">
                <Button variant="outline" size="sm">
                  {t('user.viewAll')}
                  <ChevronRight className="ml-1 w-4 h-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {checkIns.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t('user.noCheckIns')}</p>
              ) : (
                <div className="space-y-2">
                  {checkIns.map((checkIn) => (
                    <div
                      key={checkIn.id}
                      className="p-3 border rounded-lg hover:bg-accent transition-colors"
                    >
                      <div className="text-sm font-medium">
                        {format(new Date(checkIn.checked_in_at), 'PPp')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {classMap[checkIn.class_id] || t('user.unknownClass')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <ProfileEditDrawer
          open={isProfileEditOpen}
          onClose={() => setIsProfileEditOpen(false)}
          profile={profile}
          onProfileUpdated={refreshProfile}
        />

        <ClassDrawer
          open={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          classInfo={selectedClass}
        />
      </div>
    </div>
  )
}
