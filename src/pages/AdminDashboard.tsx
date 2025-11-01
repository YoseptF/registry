import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Drawer } from '@/components/ui/drawer'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { LogOut, Users, GraduationCap, UserCheck, Trash2, ChevronRight, QrCode, ArrowRight } from 'lucide-react'
import type { User, Class, CheckIn } from '@/types'
import { format } from 'date-fns'

function ClassDrawer({
  open,
  onClose,
  classInfo,
  users
}: {
  open: boolean
  onClose: () => void
  classInfo: Class | null
  users: User[]
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
  const availableUsers = users.filter((u) => !members.includes(u.id) && u.role !== 'admin')

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

        <div className="border-t pt-6 pb-6">
          <Link to={`/checkin/${classInfo.id}`}>
            <Button className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white rounded-full py-6 text-lg font-semibold shadow-lg group">
              <QrCode className="mr-2 w-5 h-5" />
              {t('admin.startCheckIn')}
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-2 transition-transform" />
            </Button>
          </Link>
        </div>

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

export function AdminDashboard() {
  const { t } = useTranslation()
  const { signOut } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [recentCheckIns, setRecentCheckIns] = useState<CheckIn[]>([])
  const [showCreateClass, setShowCreateClass] = useState(false)
  const [newClassName, setNewClassName] = useState('')
  const [newClassDescription, setNewClassDescription] = useState('')
  const [newClassInstructor, setNewClassInstructor] = useState('')
  const [newClassSchedule, setNewClassSchedule] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedClass, setSelectedClass] = useState<Class | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  useEffect(() => {
    fetchAdminData()
    subscribeToCheckIns()
  }, [])

  const fetchAdminData = async () => {
    try {
      const [usersResult, classesResult, checkInsResult] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('classes').select('*').order('created_at', { ascending: false }),
        supabase
          .from('check_ins')
          .select('*')
          .order('checked_in_at', { ascending: false })
          .limit(20),
      ])

      setUsers(usersResult.data || [])
      setClasses(classesResult.data || [])
      setRecentCheckIns(checkInsResult.data || [])
    } catch (error) {
      console.error('Error fetching admin data:', error)
    } finally {
      setLoading(false)
    }
  }

  const subscribeToCheckIns = () => {
    const channel = supabase
      .channel('check_ins_changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'check_ins' },
        (payload) => {
          setRecentCheckIns((prev) => [payload.new as CheckIn, ...prev].slice(0, 20))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    try {
      const { error } = await supabase.from('classes').insert({
        name: newClassName,
        description: newClassDescription || null,
        instructor: newClassInstructor || null,
        schedule: newClassSchedule || null,
        created_by: user.id,
      })

      if (error) throw error

      setNewClassName('')
      setNewClassDescription('')
      setNewClassInstructor('')
      setNewClassSchedule('')
      setShowCreateClass(false)
      fetchAdminData()
    } catch (error) {
      console.error('Error creating class:', error)
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white dark:from-gray-900 dark:to-gray-800">
      <LanguageSwitcher />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
            {t('admin.dashboard')}
          </h1>
          <Button onClick={signOut} variant="outline">
            <LogOut className="w-4 h-4 mr-2" />
            {t('auth.signOut')}
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('admin.totalUsers')}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('admin.totalClasses')}</CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{classes.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('admin.todaysCheckIns')}</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {
                  recentCheckIns.filter(
                    (ci) =>
                      new Date(ci.checked_in_at).toDateString() === new Date().toDateString()
                  ).length
                }
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{t('admin.classes')}</CardTitle>
                <CardDescription>{t('admin.manageClasses')}</CardDescription>
              </div>
              <Button onClick={() => setShowCreateClass(!showCreateClass)} size="sm">
                {showCreateClass ? t('admin.cancel') : t('admin.newClass')}
              </Button>
            </CardHeader>
            <CardContent>
              {showCreateClass && (
                <form onSubmit={handleCreateClass} className="space-y-4 mb-4 p-4 border rounded-lg">
                  <div className="space-y-2">
                    <Label htmlFor="className">{t('admin.className')} *</Label>
                    <Input
                      id="className"
                      value={newClassName}
                      onChange={(e) => setNewClassName(e.target.value)}
                      placeholder="Yoga 101"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="classDescription">{t('admin.description')}</Label>
                    <Input
                      id="classDescription"
                      value={newClassDescription}
                      onChange={(e) => setNewClassDescription(e.target.value)}
                      placeholder={t('admin.description')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="classInstructor">{t('admin.instructor')}</Label>
                    <Input
                      id="classInstructor"
                      value={newClassInstructor}
                      onChange={(e) => setNewClassInstructor(e.target.value)}
                      placeholder="Jane Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="classSchedule">{t('admin.schedule')}</Label>
                    <Input
                      id="classSchedule"
                      value={newClassSchedule}
                      onChange={(e) => setNewClassSchedule(e.target.value)}
                      placeholder="Mon/Wed 6pm"
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    {t('admin.createClass')}
                  </Button>
                </form>
              )}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {classes.length === 0 ? (
                  <p className="text-muted-foreground text-sm">{t('user.noClasses')}</p>
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
                          {cls.instructor && (
                            <div className="text-xs text-muted-foreground">{t('admin.instructor')}: {cls.instructor}</div>
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
            <CardHeader>
              <CardTitle>{t('admin.recentCheckIns')}</CardTitle>
              <CardDescription>{t('admin.liveUpdates')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {recentCheckIns.length === 0 ? (
                  <p className="text-muted-foreground text-sm">{t('user.noCheckIns')}</p>
                ) : (
                  recentCheckIns.map((checkIn) => (
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

        <Card>
          <CardHeader>
            <CardTitle>{t('admin.allUsers')}</CardTitle>
            <CardDescription>{t('admin.userManagement')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {users.map((user) => (
                <div key={user.id} className="p-3 border rounded-lg hover:bg-accent transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold">{user.name}</div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                      {user.phone && (
                        <div className="text-xs text-muted-foreground">{user.phone}</div>
                      )}
                    </div>
                    <div className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                      {user.role}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <ClassDrawer
          open={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          classInfo={selectedClass}
          users={users}
        />
      </div>
    </div>
  )
}
