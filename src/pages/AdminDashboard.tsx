import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { LogOut, Users, GraduationCap, UserCheck } from 'lucide-react'
import type { User, Class, CheckIn } from '@/types'
import { format } from 'date-fns'

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
                    <div key={cls.id} className="p-3 border rounded-lg hover:bg-accent transition-colors">
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
      </div>
    </div>
  )
}
