import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { QRCodeSVG } from 'qrcode.react'
import { LogOut, User, Mail, Phone, MapPin } from 'lucide-react'
import type { Class, ClassMembership, CheckIn } from '@/types'
import { format } from 'date-fns'

export function UserDashboard() {
  const { profile, signOut } = useAuth()
  const [classes, setClasses] = useState<Class[]>([])
  const [checkIns, setCheckIns] = useState<CheckIn[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile) {
      fetchUserData()
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
        const classIds = memberships.map((m: ClassMembership) => m.class_id)
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
    } catch (error) {
      console.error('Error fetching user data:', error)
    } finally {
      setLoading(false)
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
            My Dashboard
          </h1>
          <Button onClick={signOut} variant="outline">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>My Profile</CardTitle>
              <CardDescription>Your account information</CardDescription>
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
              <CardTitle>My QR Code</CardTitle>
              <CardDescription>Use this to check in to classes</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <QRCodeSVG
                  value={generateQRData()}
                  size={200}
                  level="H"
                  includeMargin
                  imageSettings={{
                    src: '/logo.svg',
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
              <CardTitle>My Classes</CardTitle>
              <CardDescription>Classes you're enrolled in</CardDescription>
            </CardHeader>
            <CardContent>
              {classes.length === 0 ? (
                <p className="text-muted-foreground text-sm">No classes yet</p>
              ) : (
                <div className="space-y-2">
                  {classes.map((cls) => (
                    <div
                      key={cls.id}
                      className="p-3 border rounded-lg hover:bg-accent transition-colors"
                    >
                      <div className="font-semibold">{cls.name}</div>
                      {cls.description && (
                        <div className="text-sm text-muted-foreground">{cls.description}</div>
                      )}
                      {cls.schedule && (
                        <div className="text-xs text-muted-foreground mt-1">{cls.schedule}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Check-ins</CardTitle>
              <CardDescription>Your attendance history</CardDescription>
            </CardHeader>
            <CardContent>
              {checkIns.length === 0 ? (
                <p className="text-muted-foreground text-sm">No check-ins yet</p>
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
                      <div className="text-xs text-muted-foreground">Class ID: {checkIn.class_id}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
