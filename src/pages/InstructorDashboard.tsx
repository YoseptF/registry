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
import { GraduationCap, UserCheck, ChevronRight, Edit, TrendingUp, DollarSign, Calendar, ExternalLink } from 'lucide-react'
import { usePageTitle } from '@/hooks/usePageTitle'
import type { Class, User } from '@/types'
import type { Database } from '@/types/database'
import { format, addDays } from 'date-fns'
import { Link } from 'react-router-dom'

type PaymentSettings = Database["public"]["Tables"]["payment_settings"]["Row"];

interface UpcomingSession {
  class_id: string;
  class_name: string;
  session_date: string;
  session_time: string;
  count: number;
  earnings: number;
}

export function InstructorDashboard() {
  const { t } = useTranslation()
  usePageTitle('pages.instructorDashboard')
  const { profile, refreshProfile } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [todaysCheckIns, setTodaysCheckIns] = useState(0)
  const [monthlyCheckIns, setMonthlyCheckIns] = useState(0)
  const [pendingEarnings, setPendingEarnings] = useState(0)
  const [upcomingSessions, setUpcomingSessions] = useState<UpcomingSession[]>([])
  const [nextPaymentDate, setNextPaymentDate] = useState<string | null>(null)
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

        const { data: enrollmentsData } = await supabase
          .from('class_enrollments')
          .select(`
            id,
            class_session_id,
            paid_out_at,
            session:class_sessions!class_enrollments_class_session_id_fkey(
              session_date,
              session_time,
              class:classes(
                id,
                name,
                instructor_payment_type,
                instructor_payment_value
              )
            ),
            package:class_package_purchases!class_enrollments_package_purchase_id_fkey(
              amount_paid,
              num_classes
            )
          `)
          .is('paid_out_at', null)

        let totalPending = 0
        const sessionEnrollments = new Map<string, { class_id: string; class_name: string; session_date: string; session_time: string; count: number; earnings: number }>()

        enrollmentsData?.forEach((enrollment: any) => {
          if (!enrollment.session?.class || !enrollment.package) return

          const cls = enrollment.session.class
          if (!classIds.includes(cls.id)) return

          const pkg = enrollment.package
          const amountPerClass = pkg.amount_paid / pkg.num_classes

          let instructorPayment = 0
          if (cls.instructor_payment_type === 'flat') {
            instructorPayment = cls.instructor_payment_value || 0
          } else {
            instructorPayment = amountPerClass * ((cls.instructor_payment_value || 70) / 100)
          }

          totalPending += Math.round(instructorPayment * 100) / 100

          const sessionKey = `${cls.id}-${enrollment.session.session_date}-${enrollment.session.session_time}`
          const existing = sessionEnrollments.get(sessionKey)

          if (existing) {
            existing.count++
            existing.earnings += Math.round(instructorPayment * 100) / 100
          } else {
            sessionEnrollments.set(sessionKey, {
              class_id: cls.id,
              class_name: cls.name,
              session_date: enrollment.session.session_date,
              session_time: enrollment.session.session_time,
              count: 1,
              earnings: Math.round(instructorPayment * 100) / 100
            })
          }
        })

        setPendingEarnings(totalPending)

        const todayStr = format(today, 'yyyy-MM-dd')
        const todaysList: UpcomingSession[] = Array.from(sessionEnrollments.values())
          .filter(session => session.session_date === todayStr)
          .sort((a, b) => a.session_time.localeCompare(b.session_time))

        setUpcomingSessions(todaysList)
      }

      const { data: settingsData } = await supabase
        .from('payment_settings')
        .select('*')
        .limit(1)
        .single()

      if (settingsData) {
        const nextDate = calculateNextPaymentDate(settingsData)
        setNextPaymentDate(nextDate)
      }
    } catch (error) {
      console.error('Error fetching instructor data:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateNextPaymentDate = (settings: PaymentSettings): string => {
    const today = new Date()
    const dayMap: Record<string, number> = {
      'sunday': 0,
      'monday': 1,
      'tuesday': 2,
      'wednesday': 3,
      'thursday': 4,
      'friday': 5,
      'saturday': 6
    }

    const targetDay = dayMap[settings.payment_day]
    const currentDay = today.getDay()

    let daysUntilPayment = targetDay - currentDay
    if (daysUntilPayment <= 0) {
      daysUntilPayment += 7
    }

    const nextPayment = addDays(today, daysUntilPayment)
    return format(nextPayment, 'MMM d, yyyy')
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
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
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
              <CardTitle className="text-sm font-medium">{t('instructor.pendingEarnings')}</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">${pendingEarnings.toFixed(2)}</div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-muted-foreground">
                  {nextPaymentDate ? `${t('instructor.nextPayment')}: ${nextPaymentDate}` : t('instructor.notYetPaid')}
                </p>
                <Link to="/instructor/payments">
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                    <ExternalLink className="w-3 h-3 mr-1" />
                    {t('instructor.viewAllPayments')}
                  </Button>
                </Link>
              </div>
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

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    {t('instructor.todaysSessions')}
                  </CardTitle>
                  <CardDescription>{t('instructor.sessionsWithEnrollments')}</CardDescription>
                </div>
                <Link to="/instructor/calendar">
                  <Button variant="outline" size="sm">
                    <Calendar className="w-4 h-4 mr-2" />
                    {t('user.viewCalendar')}
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {upcomingSessions.length === 0 ? (
                  <p className="text-muted-foreground text-sm">{t('instructor.noSessionsToday')}</p>
                ) : (
                  upcomingSessions.map((session, idx) => (
                    <div key={idx} className="p-3 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-semibold">{session.class_name}</div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {session.session_time}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-green-600">
                            ${session.earnings.toFixed(2)}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {session.count} {session.count === 1 ? t('instructor.student') : t('instructor.students')}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

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
        </div>

        <div className="grid md:grid-cols-2 gap-6">
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
