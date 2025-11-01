import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { Avatar } from '@/components/ui/avatar'
import { Clock, User, ArrowRight, Sparkles, LogIn } from 'lucide-react'
import { usePageTitle } from '@/hooks/usePageTitle'
import type { Class, User as UserType } from '@/types'

export function Landing() {
  const { t } = useTranslation()
  usePageTitle('pages.landing')
  const [classes, setClasses] = useState<Class[]>([])
  const [instructors, setInstructors] = useState<UserType[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchClasses()
    fetchInstructors()
  }, [])

  const fetchClasses = async () => {
    try {
      const { data } = await supabase
        .from('classes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(6)

      setClasses(data || [])
    } catch (error) {
      console.error('Error fetching classes:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchInstructors = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, name, email, role, avatar_url')
        .in('role', ['instructor', 'admin'])
        .order('name')

      setInstructors(data || [])
    } catch (error) {
      console.error('Error fetching instructors:', error)
    }
  }

  const getInstructorForClass = (cls: Class) => {
    if (cls.instructor_id) {
      return instructors.find(i => i.id === cls.instructor_id)
    }
    return null
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <LanguageSwitcher />

      {/* Hero Section */}
      <div className="relative h-[700px] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url(/hero-bg.jpg)' }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-pink-900/95 via-purple-900/85 to-pink-900/95" />
        </div>

        <div className="relative container mx-auto px-4 h-full flex flex-col justify-center items-center text-center">
          <div className="animate-fade-in max-w-4xl">
            <img
              src="/logo.png"
              alt="Logo"
              className="h-32 w-auto mx-auto mb-8 drop-shadow-2xl animate-float"
            />
            <h1 className="text-7xl md:text-8xl font-bold mb-6 text-white drop-shadow-2xl leading-tight">
              {t('landing.heroTitle')}
            </h1>
            <p className="text-2xl md:text-3xl text-pink-100 mb-12 font-light">
              {t('landing.heroSubtitle')}
            </p>
            <div className="flex gap-4 md:gap-6 justify-center flex-wrap px-4">
              <Link to="/classes" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto bg-white text-purple-900 hover:bg-pink-50 text-lg md:text-xl px-8 md:px-12 py-6 md:py-8 rounded-full shadow-2xl hover:scale-110 transition-all duration-300 font-semibold">
                  {t('landing.exploreClasses')}
                  <Sparkles className="ml-2 md:ml-3 w-5 md:w-6 h-5 md:h-6" />
                </Button>
              </Link>
              <Link to="/login" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full sm:w-auto border-3 border-white bg-white/20 text-white hover:bg-white hover:text-purple-900 text-lg md:text-xl px-8 md:px-12 py-6 md:py-8 rounded-full backdrop-blur-md transition-all duration-300 font-semibold">
                  <LogIn className="mr-2 md:mr-3 w-5 md:w-6 h-5 md:h-6" />
                  {t('landing.memberLogin')}
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="absolute top-20 left-10 w-32 h-32 bg-pink-400/20 rounded-full blur-2xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-purple-400/20 rounded-full blur-2xl animate-pulse delay-700" />
        <div className="absolute top-1/2 right-1/4 w-24 h-24 bg-white/10 rounded-full blur-xl animate-pulse delay-500" />
      </div>

      {/* Classes Section */}
      <div className="container mx-auto px-4 py-24">
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-100 to-purple-100 dark:from-pink-900/30 dark:to-purple-900/30 rounded-full mb-8 shadow-lg">
            <Sparkles className="w-5 h-5 text-pink-600 dark:text-pink-400" />
            <span className="text-base font-semibold text-pink-600 dark:text-pink-400">
              {t('landing.discoverClasses')}
            </span>
          </div>
          <h2 className="text-6xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
            {t('landing.ourClasses')}
          </h2>
          <p className="text-2xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
            {t('landing.classesSubtitle')}
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-pink-600"></div>
          </div>
        ) : classes.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 dark:text-gray-400 text-xl">
              {t('landing.noClasses')}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10 max-w-7xl mx-auto">
            {classes.map((cls, index) => (
              <Card
                key={cls.id}
                className="group hover:shadow-2xl transition-all duration-500 overflow-hidden border-0 shadow-xl hover:-translate-y-3 bg-white dark:bg-gray-800"
                style={{
                  animation: `fade-in-up 0.6s ease-out ${index * 0.1}s both`
                }}
              >
                <div className="relative h-56 overflow-hidden bg-gradient-to-br from-pink-400 to-purple-600">
                  <img
                    src={cls.banner_url || "/class-default.jpg"}
                    alt={cls.name}
                    className="w-full h-full object-cover group-hover:scale-125 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <div className="absolute bottom-6 left-6 right-6">
                    <h3 className="text-3xl font-bold text-white drop-shadow-2xl">
                      {cls.name}
                    </h3>
                  </div>
                </div>
                <CardHeader className="pb-4">
                  <CardDescription className="text-lg line-clamp-2 text-gray-700 dark:text-gray-300">
                    {cls.description || t('landing.noDescription')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(() => {
                    const instructor = getInstructorForClass(cls)
                    if (instructor) {
                      return (
                        <div className="flex items-center gap-3 text-base text-gray-700 dark:text-gray-300">
                          <Avatar
                            src={instructor.avatar_url}
                            alt={instructor.name}
                            fallbackText={instructor.name}
                            size="md"
                          />
                          <span className="font-semibold">{instructor.name}</span>
                        </div>
                      )
                    } else if (cls.instructor) {
                      return (
                        <div className="flex items-center gap-3 text-base text-gray-700 dark:text-gray-300">
                          <div className="w-10 h-10 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
                            <User className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                          </div>
                          <span className="font-semibold">{cls.instructor}</span>
                        </div>
                      )
                    }
                    return null
                  })()}
                  {((cls.schedule_days && cls.schedule_days.length > 0) || cls.schedule_time || cls.schedule) && (
                    <div className="flex items-center gap-3 text-base text-gray-700 dark:text-gray-300">
                      <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <span className="font-medium">
                        {cls.schedule_days && cls.schedule_days.length > 0 ? (
                          <>
                            {cls.schedule_days.map(day => t(`admin.${day}`)).join(', ')}
                            {cls.schedule_time && ` ${t('admin.at')} ${cls.schedule_time}`}
                            {cls.duration_minutes && ` (${cls.duration_minutes} ${t('admin.minutes')})`}
                          </>
                        ) : (
                          cls.schedule
                        )}
                      </span>
                    </div>
                  )}
                  <Link to={`/classes?classId=${cls.id}`} className="block">
                    <Button className="w-full mt-4 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white rounded-full py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all group">
                      {t('landing.viewClass')}
                      <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-2 transition-transform" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {classes.length > 0 && (
          <div className="text-center mt-16">
            <Link to="/classes">
              <Button size="lg" variant="outline" className="rounded-full px-10 py-7 border-3 border-pink-600 text-pink-600 hover:bg-pink-600 hover:text-white text-lg font-semibold shadow-lg hover:shadow-xl transition-all">
                {t('landing.viewAllClasses')}
                <ArrowRight className="ml-3 w-6 h-6" />
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* CTA Section */}
      <div className="relative bg-gradient-to-r from-pink-600 via-purple-600 to-pink-600 py-28 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-20 w-64 h-64 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-20 w-80 h-80 bg-white rounded-full blur-3xl" />
        </div>
        <div className="relative container mx-auto px-4 text-center">
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-8">
            {t('landing.readyToStart')}
          </h2>
          <p className="text-2xl text-pink-100 mb-12 max-w-3xl mx-auto font-light">
            {t('landing.ctaSubtitle')}
          </p>
          <Link to="/register">
            <Button size="lg" className="bg-white text-purple-900 hover:bg-pink-50 text-xl px-14 py-8 rounded-full shadow-2xl hover:scale-110 transition-all duration-300 font-bold">
              {t('landing.getStarted')}
              <Sparkles className="ml-3 w-6 h-6" />
            </Button>
          </Link>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(40px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }

        .animate-fade-in {
          animation: fade-in 1.2s ease-out;
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        .delay-500 {
          animation-delay: 500ms;
        }

        .delay-700 {
          animation-delay: 700ms;
        }
      `}</style>
    </div>
  )
}
