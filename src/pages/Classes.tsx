import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Drawer } from '@/components/ui/drawer'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { Clock, User, ArrowRight, ArrowLeft, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import type { Class } from '@/types'

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

  if (!classInfo) return null

  return (
    <Drawer open={open} onClose={onClose} title={classInfo.name}>
      <div className="space-y-6">
        <div>
          <img
            src={classInfo.banner_url || "/class-default.jpg"}
            alt={classInfo.name}
            className="w-full h-48 object-cover rounded-lg"
          />
        </div>

        {classInfo.description && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">{t('admin.description')}</h3>
            <p className="text-base leading-relaxed">{classInfo.description}</p>
          </div>
        )}

        {classInfo.instructor && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">{t('admin.instructor')}</h3>
            <div className="flex items-center gap-3 text-base">
              <div className="w-10 h-10 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
                <User className="w-5 h-5 text-pink-600 dark:text-pink-400" />
              </div>
              <span className="font-semibold">{classInfo.instructor}</span>
            </div>
          </div>
        )}

        {((classInfo.schedule_days && classInfo.schedule_days.length > 0) || classInfo.schedule_time || classInfo.schedule) && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">{t('admin.schedule')}</h3>
            <div className="flex items-center gap-3 text-base">
              <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <span className="font-medium">
                {(classInfo.schedule_days && classInfo.schedule_days.length > 0) || classInfo.schedule_time ? (
                  <>
                    {classInfo.schedule_days && classInfo.schedule_days.length > 0 && (
                      <>
                        {classInfo.schedule_days.map(day => t(`admin.${day}`)).join(', ')}
                        {classInfo.schedule_time && ' '}
                      </>
                    )}
                    {classInfo.schedule_time && `${classInfo.schedule_days && classInfo.schedule_days.length > 0 ? t('admin.at') + ' ' : ''}${classInfo.schedule_time}`}
                    {classInfo.duration_minutes && ` (${classInfo.duration_minutes} ${t('admin.minutes')})`}
                  </>
                ) : (
                  classInfo.schedule
                )}
              </span>
            </div>
          </div>
        )}

        <div className="border-t pt-6 mt-8 space-y-3">
          <Link to="/register" className="block">
            <Button className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white rounded-full py-6 text-lg font-semibold shadow-lg group">
              {t('landing.signUpToJoin')}
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-2 transition-transform" />
            </Button>
          </Link>
          <Link to="/login" className="block">
            <Button variant="outline" className="w-full border-2 border-pink-600 text-pink-600 hover:bg-pink-50 rounded-full py-6 text-lg font-semibold">
              {t('landing.alreadyMember')}
            </Button>
          </Link>
        </div>
      </div>
    </Drawer>
  )
}

export function Classes() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [classes, setClasses] = useState<Class[]>([])
  const [filteredClasses, setFilteredClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedClass, setSelectedClass] = useState<Class | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  useEffect(() => {
    fetchClasses()
  }, [])

  useEffect(() => {
    const classId = searchParams.get('classId')
    if (classId && classes.length > 0) {
      const cls = classes.find((c) => c.id === classId)
      if (cls) {
        setSelectedClass(cls)
        setIsDrawerOpen(true)
      }
    }
  }, [searchParams, classes])

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredClasses(classes)
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = classes.filter(
        (cls) =>
          cls.name.toLowerCase().includes(query) ||
          cls.description?.toLowerCase().includes(query) ||
          cls.instructor?.toLowerCase().includes(query)
      )
      setFilteredClasses(filtered)
    }
  }, [searchQuery, classes])

  const fetchClasses = async () => {
    try {
      const { data } = await supabase
        .from('classes')
        .select('*')
        .order('created_at', { ascending: false })

      setClasses(data || [])
      setFilteredClasses(data || [])
    } catch (error) {
      console.error('Error fetching classes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleClassClick = (cls: Class) => {
    setSelectedClass(cls)
    setIsDrawerOpen(true)
    setSearchParams({ classId: cls.id })
  }

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false)
    setSearchParams({})
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white dark:from-gray-900 dark:to-gray-800">
      <LanguageSwitcher />

      <div className="bg-gradient-to-r from-pink-600 via-purple-600 to-pink-600 py-16">
        <div className="container mx-auto px-4">
          <Link to="/">
            <Button variant="ghost" className="text-white hover:bg-white/10 mb-6">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('common.back')}
            </Button>
          </Link>
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
            {t('landing.ourClasses')}
          </h1>
          <p className="text-xl text-pink-100 max-w-2xl">
            {t('landing.classesSubtitle')}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto mb-12">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder={t('landing.searchClasses')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-14 text-lg rounded-full border-2 focus:border-pink-600"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
          </div>
        ) : filteredClasses.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 dark:text-gray-400 text-lg mb-4">
              {searchQuery ? t('landing.noResultsFound') : t('landing.noClasses')}
            </p>
            {searchQuery && (
              <Button onClick={() => setSearchQuery('')} variant="outline">
                {t('landing.clearSearch')}
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <p className="text-gray-600 dark:text-gray-400">
                {t('landing.showingClasses', { count: filteredClasses.length })}
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
              {filteredClasses.map((cls, index) => (
                <button
                  key={cls.id}
                  onClick={() => handleClassClick(cls)}
                  className="text-left w-full group"
                  style={{
                    animation: `fade-in-up 0.4s ease-out ${index * 0.05}s both`
                  }}
                >
                  <Card className="hover:shadow-2xl transition-all duration-300 overflow-hidden border-0 shadow-lg hover:-translate-y-2 cursor-pointer h-full">
                    <div className="relative h-48 overflow-hidden bg-gradient-to-br from-pink-400 to-purple-600">
                      <img
                        src={cls.banner_url || "/class-default.jpg"}
                        alt={cls.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-4 left-4 right-4">
                        <h3 className="text-2xl font-bold text-white drop-shadow-lg">
                          {cls.name}
                        </h3>
                      </div>
                    </div>
                    <CardHeader>
                      <CardDescription className="text-base line-clamp-3">
                        {cls.description || t('landing.noDescription')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {cls.instructor && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                          <User className="w-4 h-4 text-pink-600" />
                          <span className="font-medium">{cls.instructor}</span>
                        </div>
                      )}
                      {((cls.schedule_days && cls.schedule_days.length > 0) || cls.schedule_time || cls.schedule) && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                          <Clock className="w-4 h-4 text-purple-600" />
                          <span>
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
                    </CardContent>
                  </Card>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <ClassDrawer
        open={isDrawerOpen}
        onClose={handleCloseDrawer}
        classInfo={selectedClass}
      />

      <style>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
