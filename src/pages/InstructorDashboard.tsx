import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { Navigation } from '@/components/Navigation'
import { RecentCheckInsCard } from '@/components/RecentCheckInsCard'
import { ProfileEditDrawer } from '@/components/ProfileEditDrawer'
import { ClassDrawer } from '@/components/ClassDrawer'
import { Users, GraduationCap, UserCheck, Trash2, ChevronRight, X, Edit, User as UserIcon, DollarSign, TrendingUp } from 'lucide-react'
import { usePageTitle } from '@/hooks/usePageTitle'
import type { Class, User } from '@/types'

export function InstructorDashboard() {
  const { t } = useTranslation()
  usePageTitle('pages.instructorDashboard')
  const { profile, refreshProfile } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [todaysCheckIns, setTodaysCheckIns] = useState(0)
  const [monthlyCheckIns, setMonthlyCheckIns] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selectedClass, setSelectedClass] = useState<Class | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false)

  useEffect(() => {
    fetchInstructorData()
  }, [profile])

  const fetchInstructorData = async () => {
    if (!profile) return

    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const [usersResult, classesResult] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase
          .from('classes')
          .select('*')
          .eq('instructor_id', profile.id)
          .order('created_at', { ascending: false }),
      ])

      setUsers(usersResult.data || [])
      setClasses(classesResult.data || [])

      const classIds = classesResult.data?.map(cls => cls.id) || []

      if (classIds.length > 0) {
        const monthStart = new Date()
        monthStart.setDate(1)
        monthStart.setHours(0, 0, 0, 0)

        const [todayCount, monthCount] = await Promise.all([
          supabase
            .from('check_ins')
            .select('id', { count: 'exact' })
            .in('class_id', classIds)
            .gte('checked_in_at', today.toISOString()),
          supabase
            .from('check_ins')
            .select('id', { count: 'exact' })
            .in('class_id', classIds)
            .gte('checked_in_at', monthStart.toISOString())
        ])

        setTodaysCheckIns(todayCount.count || 0)
        setMonthlyCheckIns(monthCount.count || 0)
      }
    } catch (error) {
      console.error('Error fetching instructor data:', error)
    } finally {
      setLoading(false)
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

  const classIds = classes.map(cls => cls.id)

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

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('instructor.monthlyCheckIns')}</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{monthlyCheckIns}</div>
              <p className="text-xs text-muted-foreground mt-1">{t('instructor.thisMonth')}</p>
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

          <RecentCheckInsCard classIds={classIds} />
        </div>

        <ClassDrawer
          open={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          classInfo={selectedClass}
          mode="instructor"
          users={users}
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
