import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar } from '@/components/ui/avatar'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { ClassDrawer } from '@/components/ClassDrawer'
import { Clock, User, ArrowLeft, Search, Filter } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { usePageTitle } from '@/hooks/usePageTitle'
import type { Class, User as UserType } from '@/types'
import { fetchInstructors as fetchInstructorsUtil } from '@/utils/instructorQueries'

export function Classes() {
  const { t } = useTranslation()
  usePageTitle('pages.classes')
  const [searchParams, setSearchParams] = useSearchParams()
  const [classes, setClasses] = useState<Class[]>([])
  const [instructors, setInstructors] = useState<UserType[]>([])
  const [filteredClasses, setFilteredClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedInstructor, setSelectedInstructor] = useState<string>('')
  const [selectedClass, setSelectedClass] = useState<Class | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  useEffect(() => {
    fetchClasses()
    fetchInstructors()
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
    let filtered = classes

    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (cls) =>
          cls.name.toLowerCase().includes(query) ||
          cls.description?.toLowerCase().includes(query) ||
          cls.instructor?.toLowerCase().includes(query)
      )
    }

    if (selectedInstructor && selectedInstructor !== 'all') {
      filtered = filtered.filter((cls) => cls.instructor_id === selectedInstructor)
    }

    setFilteredClasses(filtered)
  }, [searchQuery, selectedInstructor, classes])

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

  const fetchInstructors = async () => {
    try {
      const data = await fetchInstructorsUtil()
      setInstructors(data)
    } catch (error) {
      console.error('Error fetching instructors:', error)
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

  const getInstructorForClass = (cls: Class) => {
    if (cls.instructor_id) {
      return instructors.find(i => i.id === cls.instructor_id)
    }
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
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
        <div className="max-w-4xl mx-auto mb-12">
          <div className="grid md:grid-cols-2 gap-4">
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
            <div className="relative">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10" />
              <Select value={selectedInstructor} onValueChange={setSelectedInstructor}>
                <SelectTrigger className="pl-12 h-14 text-lg rounded-full border-2 focus:border-pink-600">
                  <SelectValue placeholder={t('instructor.filterByInstructor')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('instructor.allInstructors')}</SelectItem>
                  {instructors.map((instructor) => (
                    <SelectItem key={instructor.id} value={instructor.id}>
                      {instructor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {(searchQuery || selectedInstructor) && (
            <div className="flex justify-center mt-4">
              <Button
                onClick={() => {
                  setSearchQuery('')
                  setSelectedInstructor('')
                }}
                variant="ghost"
                className="text-pink-600 hover:text-pink-700"
              >
                {t('landing.clearSearch')}
              </Button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
          </div>
        ) : filteredClasses.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg mb-4">
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
              <p className="text-gray-600">
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
                      {(() => {
                        const instructor = getInstructorForClass(cls)
                        if (instructor) {
                          return (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Avatar
                                src={instructor.avatar_url}
                                alt={instructor.name}
                                fallbackText={instructor.name}
                                size="sm"
                              />
                              <span className="font-medium">{instructor.name}</span>
                            </div>
                          )
                        } else if (cls.instructor) {
                          return (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <User className="w-4 h-4 text-pink-600" />
                              <span className="font-medium">{cls.instructor}</span>
                            </div>
                          )
                        }
                        return null
                      })()}
                      {((cls.schedule_days && cls.schedule_days.length > 0) || cls.schedule_time || cls.schedule) && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
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
        mode="public"
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
