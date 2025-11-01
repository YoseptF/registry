import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Drawer } from '@/components/ui/drawer'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { QRCodeSVG } from 'qrcode.react'
import { LogOut, User, Mail, Phone, MapPin, ChevronRight } from 'lucide-react'
import type { Class, CheckIn, User as UserType } from '@/types'
import { format } from 'date-fns'

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
  const { profile, signOut } = useAuth()
  const [classes, setClasses] = useState<Class[]>([])
  const [checkIns, setCheckIns] = useState<CheckIn[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedClass, setSelectedClass] = useState<Class | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
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
      <LanguageSwitcher />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
            {t('user.dashboard')}
          </h1>
          <Button onClick={signOut} variant="outline">
            <LogOut className="w-4 h-4 mr-2" />
            {t('auth.signOut')}
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>{t('user.profile')}</CardTitle>
              <CardDescription>{t('user.myProfile')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
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

        <ClassDrawer
          open={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          classInfo={selectedClass}
        />
      </div>
    </div>
  )
}
