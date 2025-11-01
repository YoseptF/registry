import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Drawer } from '@/components/ui/drawer'
import { Label } from '@/components/ui/label'
import { Navigation } from '@/components/Navigation'
import { Users, GraduationCap, UserCheck, Trash2, ChevronRight } from 'lucide-react'
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

export function InstructorDashboard() {
  const { t } = useTranslation()
  usePageTitle('pages.instructorDashboard')
  const { profile } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [checkIns, setCheckIns] = useState<CheckIn[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedClass, setSelectedClass] = useState<Class | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

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
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
            {t('instructor.dashboard')}
          </h1>
          <p className="text-muted-foreground mt-2">{t('instructor.manageYourClasses')}</p>
        </div>

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
      </div>
    </div>
  )
}
