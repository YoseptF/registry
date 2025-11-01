import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Drawer } from '@/components/ui/drawer'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Avatar } from '@/components/ui/avatar'
import { Navigation } from '@/components/Navigation'
import { Users, GraduationCap, UserCheck, Trash2, ChevronRight, Upload, X, Edit, User as UserIcon } from 'lucide-react'
import { usePageTitle } from '@/hooks/usePageTitle'
import type { Class, CheckIn, User } from '@/types'
import { format } from 'date-fns'

function ClassDrawer({
  open,
  onClose,
  classInfo,
  users,
  onClassUpdated
}: {
  open: boolean
  onClose: () => void
  classInfo: Class | null
  users: User[]
  onClassUpdated: () => void
}) {
  const { t } = useTranslation()
  const [members, setMembers] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUserId, setSelectedUserId] = useState('')

  useEffect(() => {
    if (classInfo && open) {
      fetchMembers()
    }
  }, [classInfo?.id, open])

  const fetchMembers = async () => {
    if (!classInfo) return

    setLoading(true)
    try {
      const { data } = await supabase
        .from('class_memberships')
        .select('user_id')
        .eq('class_id', classInfo.id)

      setMembers(data?.map((m) => m.user_id) || [])
    } catch (error) {
      console.error('Error fetching members:', error)
    } finally {
      setLoading(false)
    }
  }

  const addMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!classInfo || !selectedUserId) return

    try {
      const { error } = await supabase.from('class_memberships').insert({
        class_id: classInfo.id,
        user_id: selectedUserId,
      })

      if (error) throw error

      setSelectedUserId('')
      fetchMembers()
    } catch (error) {
      console.error('Error adding user:', error)
    }
  }

  const removeMember = async (userId: string) => {
    if (!classInfo || !confirm('Remove this user from the class?')) return

    try {
      const { error } = await supabase
        .from('class_memberships')
        .delete()
        .eq('class_id', classInfo.id)
        .eq('user_id', userId)

      if (error) throw error
      fetchMembers()
    } catch (error) {
      console.error('Error removing member:', error)
    }
  }

  if (!classInfo) return null

  const enrolledUsers = users.filter((u) => members.includes(u.id))
  const availableUsers = users.filter((u) => !members.includes(u.id) && u.role === 'user')

  return (
    <Drawer open={open} onClose={onClose} title={classInfo.name}>
      <div className="space-y-6">
        {classInfo.banner_url && (
          <div>
            <img
              src={classInfo.banner_url}
              alt={classInfo.name}
              className="w-full h-48 object-cover rounded-lg"
            />
          </div>
        )}

        {classInfo.description && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">{t('admin.description')}</h3>
            <p className="text-sm">{classInfo.description}</p>
          </div>
        )}

        {(classInfo.schedule_days && classInfo.schedule_days.length > 0) || classInfo.schedule_time || classInfo.duration_minutes ? (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">{t('admin.schedule')}</h3>
            <p className="text-sm">
              {classInfo.schedule_days && classInfo.schedule_days.length > 0 && (
                <span>{classInfo.schedule_days.map(day => t(`admin.${day}`)).join(', ')}</span>
              )}
              {classInfo.schedule_time && (
                <span> {t('admin.at')} {classInfo.schedule_time}</span>
              )}
              {classInfo.duration_minutes && (
                <span> ({classInfo.duration_minutes} {t('admin.minutes')})</span>
              )}
            </p>
          </div>
        ) : null}

        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4">{t('admin.addUserToClass')}</h3>
          <form onSubmit={addMember} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="selectUser">{t('admin.selectUser')}</Label>
              <select
                id="selectUser"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                required
              >
                <option value="">{t('admin.chooseUser')}</option>
                {availableUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" className="w-full">
              {t('admin.addUser')}
            </Button>
          </form>
        </div>

        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4">
            {t('admin.enrolledUsers')} ({enrolledUsers.length})
          </h3>
          {loading ? (
            <div className="text-sm text-muted-foreground">{t('common.loading')}</div>
          ) : enrolledUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('admin.noUsersEnrolled')}</p>
          ) : (
            <div className="space-y-2">
              {enrolledUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div>
                    <div className="font-medium">{user.name}</div>
                    <div className="text-xs text-muted-foreground">{user.email}</div>
                  </div>
                  <button
                    onClick={() => removeMember(user.id)}
                    className="text-destructive hover:text-destructive/80 p-2 rounded-md hover:bg-destructive/10"
                    title={t('admin.removeFromClass')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Drawer>
  )
}

function ProfileEditDrawer({
  open,
  onClose,
  profile,
  onProfileUpdated,
}: {
  open: boolean
  onClose: () => void
  profile: User | null
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

  useEffect(() => {
    if (profile) {
      setName(profile.name || '')
      setPhone(profile.phone || '')
      setAddress(profile.address || '')
      setBio(profile.bio || '')
      setAvatarPreview(profile.avatar_url || null)
    }
  }, [profile])

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
    if (!avatarFile) return avatarPreview

    const fileExt = avatarFile.name.split('.').pop()
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`
    const filePath = `${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, avatarFile)

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
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      let avatarUrl = avatarPreview
      if (avatarFile) {
        avatarUrl = await uploadAvatar()
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
        .eq('id', user.id)

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
                className="absolute -top-2 -right-2 rounded-full"
                onClick={removeAvatar}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-pink-100 to-purple-100 dark:from-pink-900/30 dark:to-purple-900/30 flex items-center justify-center">
                <UserIcon className="w-10 h-10 text-pink-600 dark:text-pink-400" />
              </div>
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
          <Label htmlFor="phone">{t('auth.phone')} ({t('auth.optional')})</Label>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">{t('auth.address')} ({t('auth.optional')})</Label>
          <Input
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">{t('user.bio')} ({t('auth.optional')})</Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder={t('user.bioPlaceholder')}
            rows={4}
          />
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

export function InstructorDashboard() {
  const { t } = useTranslation()
  usePageTitle('pages.instructorDashboard')
  const { profile, refreshProfile } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [checkIns, setCheckIns] = useState<CheckIn[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedClass, setSelectedClass] = useState<Class | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false)

  useEffect(() => {
    fetchInstructorData()
    subscribeToCheckIns()
  }, [profile])

  const fetchInstructorData = async () => {
    if (!profile) return

    try {
      const [usersResult, classesResult, checkInsResult] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase
          .from('classes')
          .select('*')
          .eq('instructor_id', profile.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('check_ins')
          .select('*')
          .order('checked_in_at', { ascending: false })
          .limit(20),
      ])

      setUsers(usersResult.data || [])
      setClasses(classesResult.data || [])

      const instructorCheckIns = checkInsResult.data?.filter((ci) =>
        classesResult.data?.some((cls) => cls.id === ci.class_id)
      ) || []
      setCheckIns(instructorCheckIns)
    } catch (error) {
      console.error('Error fetching instructor data:', error)
    } finally {
      setLoading(false)
    }
  }

  const subscribeToCheckIns = () => {
    if (!profile) return

    const channel = supabase
      .channel('instructor_check_ins_changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'check_ins' },
        async (payload) => {
          const newCheckIn = payload.new as CheckIn
          const isMyClass = classes.some((cls) => cls.id === newCheckIn.class_id)
          if (isMyClass) {
            setCheckIns((prev) => [newCheckIn, ...prev].slice(0, 20))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
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

  const todaysCheckIns = checkIns.filter(
    (ci) => new Date(ci.checked_in_at).toDateString() === new Date().toDateString()
  ).length

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white dark:from-gray-900 dark:to-gray-800">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
              {t('instructor.dashboard')}
            </h1>
            <p className="text-muted-foreground mt-2">{t('instructor.manageYourClasses')}</p>
          </div>
          <Button variant="outline" onClick={() => setIsProfileEditOpen(true)}>
            <Edit className="w-4 h-4 mr-2" />
            {t('user.editProfile')}
          </Button>
        </div>

        {profile && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>{t('user.profile')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Avatar
                  src={profile.avatar_url}
                  alt={profile.name}
                  fallbackText={profile.name || profile.email}
                  size="lg"
                  className="border-4 border-primary/20"
                />
                <div>
                  <h3 className="text-xl font-semibold">{profile.name}</h3>
                  <p className="text-sm text-muted-foreground">{profile.email}</p>
                  <p className="text-xs text-primary font-medium mt-1 capitalize">{profile.role}</p>
                  {profile.bio && (
                    <p className="text-sm text-muted-foreground mt-2 max-w-2xl">{profile.bio}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('instructor.myClasses')}</CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{classes.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('instructor.totalStudents')}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.filter(u => u.role === 'user').length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('admin.todaysCheckIns')}</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todaysCheckIns}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('instructor.myClasses')}</CardTitle>
              <CardDescription>{t('instructor.classesYouTeach')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {classes.length === 0 ? (
                  <p className="text-muted-foreground text-sm">{t('instructor.noClassesAssigned')}</p>
                ) : (
                  classes.map((cls) => (
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
                            <div className="text-xs text-muted-foreground">{cls.schedule}</div>
                          )}
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </div>
                    </button>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>{t('instructor.recentCheckIns')}</CardTitle>
                <CardDescription>{t('instructor.checkInsInYourClasses')}</CardDescription>
              </div>
              <Link to="/check-ins-history">
                <Button variant="outline" size="sm">
                  {t('user.viewAll')}
                  <ChevronRight className="ml-1 w-4 h-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {checkIns.length === 0 ? (
                  <p className="text-muted-foreground text-sm">{t('user.noCheckIns')}</p>
                ) : (
                  checkIns.map((checkIn) => (
                    <div key={checkIn.id} className="p-3 border rounded-lg hover:bg-accent transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-sm font-medium">
                            {checkIn.is_temporary_user ? t('admin.guestUser') : `User ID: ${checkIn.user_id}`}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Class ID: {checkIn.class_id}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(checkIn.checked_in_at), 'p')}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <ClassDrawer
          open={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          classInfo={selectedClass}
          users={users}
          onClassUpdated={fetchInstructorData}
        />

        <ProfileEditDrawer
          open={isProfileEditOpen}
          onClose={() => setIsProfileEditOpen(false)}
          profile={profile}
          onProfileUpdated={refreshProfile}
        />
      </div>
    </div>
  )
}
