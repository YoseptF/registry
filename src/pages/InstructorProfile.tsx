import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { Navigation } from '@/components/Navigation'
import { Mail, GraduationCap, Calendar, Clock, ArrowLeft } from 'lucide-react'
import { usePageTitle } from '@/hooks/usePageTitle'
import type { User, Class } from '@/types'

export function InstructorProfile() {
  const { t } = useTranslation()
  const { instructorId } = useParams<{ instructorId: string }>()
  const [instructor, setInstructor] = useState<User | null>(null)
  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(true)

  usePageTitle(instructor ? instructor.name : 'pages.instructorProfile')

  useEffect(() => {
    if (instructorId) {
      fetchInstructorData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchInstructorData is stable
  }, [instructorId])

  const fetchInstructorData = async () => {
    if (!instructorId) return

    try {
      const { data: instructorData, error: instructorError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', instructorId)
        .single()

      if (instructorError) throw instructorError
      setInstructor(instructorData as User)

      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('*')
        .eq('instructor_id', instructorId)
        .order('name')

      if (classesError) throw classesError
      setClasses(classesData || [])
    } catch (error) {
      console.error('Error fetching instructor data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!instructor) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">{t('instructor.notFound')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <Link
          to="/instructors"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('instructor.backToInstructors')}
        </Link>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="md:col-span-1">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <Avatar
                  src={instructor.avatar_url}
                  alt={instructor.name}
                  fallbackText={instructor.name}
                  size="xl"
                  className="border-4 border-primary/20"
                />
                <div>
                  <h1 className="text-2xl font-bold">{instructor.name}</h1>
                  <p className="text-sm text-muted-foreground capitalize">
                    {instructor.role}
                  </p>
                </div>
                {instructor.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    <span>{instructor.email}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>{t('instructor.about')}</CardTitle>
            </CardHeader>
            <CardContent>
              {instructor.bio ? (
                <p className="text-muted-foreground whitespace-pre-wrap">{instructor.bio}</p>
              ) : (
                <p className="text-muted-foreground italic">{t('instructor.noBio')}</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5" />
              {t('instructor.classesTaught')}
            </CardTitle>
            <CardDescription>
              {classes.length === 1
                ? t('instructor.teachingOneClass')
                : t('instructor.teachingMultipleClasses', { count: classes.length })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {classes.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">{t('instructor.noClassesYet')}</p>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {classes.map((cls) => (
                  <div
                    key={cls.id}
                    className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    {cls.banner_url && (
                      <img
                        src={cls.banner_url}
                        alt={cls.name}
                        className="w-full h-48 object-cover"
                      />
                    )}
                    <div className="p-4">
                      <h3 className="font-semibold text-lg mb-2">{cls.name}</h3>
                      {cls.description && (
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {cls.description}
                        </p>
                      )}
                      {(cls.schedule_days && cls.schedule_days.length > 0) || cls.schedule_time ? (
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {cls.schedule_days && cls.schedule_days.length > 0 && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>{cls.schedule_days.map(day => t(`admin.${day}`)).join(', ')}</span>
                            </div>
                          )}
                          {cls.schedule_time && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{cls.schedule_time}</span>
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
