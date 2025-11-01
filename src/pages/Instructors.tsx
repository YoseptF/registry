import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { Navigation } from '@/components/Navigation'
import { GraduationCap, ChevronRight } from 'lucide-react'
import { usePageTitle } from '@/hooks/usePageTitle'
import type { User } from '@/types'

interface InstructorWithStats extends User {
  classes_count: number
}

export function Instructors() {
  const { t } = useTranslation()
  usePageTitle('pages.instructors')
  const [instructors, setInstructors] = useState<InstructorWithStats[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchInstructors()
  }, [])

  const fetchInstructors = async () => {
    try {
      const { data: instructorsData, error } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['instructor', 'admin'])
        .order('name')

      if (error) throw error

      const instructorsWithCounts = await Promise.all(
        (instructorsData || []).map(async (instructor) => {
          const { count } = await supabase
            .from('classes')
            .select('*', { count: 'exact', head: true })
            .eq('instructor_id', instructor.id)

          return {
            ...instructor,
            classes_count: count || 0,
          }
        })
      )

      setInstructors(instructorsWithCounts as InstructorWithStats[])
    } catch (error) {
      console.error('Error fetching instructors:', error)
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white dark:from-gray-900 dark:to-gray-800">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent mb-2">
            {t('instructor.ourInstructors')}
          </h1>
          <p className="text-muted-foreground">{t('instructor.meetOurTeam')}</p>
        </div>

        {instructors.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <p className="text-center text-muted-foreground">{t('instructor.noInstructorsYet')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {instructors.map((instructor) => (
              <Link
                key={instructor.id}
                to={`/instructor/${instructor.id}`}
                className="group"
              >
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col items-center text-center space-y-4">
                      <Avatar
                        src={instructor.avatar_url}
                        alt={instructor.name}
                        fallbackText={instructor.name}
                        size="lg"
                        className="border-4 border-primary/20 group-hover:border-primary/40 transition-colors"
                      />
                      <div className="w-full">
                        <h3 className="text-xl font-semibold mb-1 group-hover:text-primary transition-colors">
                          {instructor.name}
                        </h3>
                        <p className="text-sm text-muted-foreground capitalize mb-3">
                          {instructor.role}
                        </p>
                        {instructor.bio && (
                          <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                            {instructor.bio}
                          </p>
                        )}
                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                          <GraduationCap className="w-4 h-4" />
                          <span>
                            {instructor.classes_count === 0
                              ? t('instructor.noClasses')
                              : instructor.classes_count === 1
                              ? t('instructor.oneClass')
                              : t('instructor.multipleClasses', { count: instructor.classes_count })}
                          </span>
                          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
