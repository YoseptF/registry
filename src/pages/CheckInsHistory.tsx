import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Navigation } from '@/components/Navigation'
import { Calendar, TrendingUp, Award, Download, Search, Filter } from 'lucide-react'
import { usePageTitle } from '@/hooks/usePageTitle'
import type { CheckIn, Class } from '@/types'
import { format, startOfWeek, startOfMonth, isAfter, isBefore, differenceInDays } from 'date-fns'

export function CheckInsHistory() {
  const { t } = useTranslation()
  usePageTitle('pages.checkInsHistory')
  const { profile } = useAuth()
  const [checkIns, setCheckIns] = useState<CheckIn[]>([])
  const [filteredCheckIns, setFilteredCheckIns] = useState<CheckIn[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [classMap, setClassMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedClass, setSelectedClass] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<string>('all')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

  useEffect(() => {
    if (profile) {
      fetchData()
    }
  }, [profile])

  useEffect(() => {
    applyFilters()
  }, [checkIns, searchQuery, selectedClass, dateFilter, customStartDate, customEndDate])

  const fetchData = async () => {
    if (!profile) return

    try {
      const { data: checkInData } = await supabase
        .from('check_ins')
        .select('*')
        .eq('user_id', profile.id)
        .order('checked_in_at', { ascending: false })

      setCheckIns(checkInData || [])

      const uniqueClassIds = [...new Set(checkInData?.map((ci) => ci.class_id) || [])]
      if (uniqueClassIds.length > 0) {
        const { data: classData } = await supabase
          .from('classes')
          .select('*')
          .in('id', uniqueClassIds)

        setClasses(classData || [])

        const map: Record<string, string> = {}
        classData?.forEach((cls) => {
          map[cls.id] = cls.name
        })
        setClassMap(map)
      }
    } catch (error) {
      console.error('Error fetching check-ins:', error)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...checkIns]

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((ci) =>
        classMap[ci.class_id]?.toLowerCase().includes(query)
      )
    }

    if (selectedClass !== 'all') {
      filtered = filtered.filter((ci) => ci.class_id === selectedClass)
    }

    const now = new Date()
    if (dateFilter === 'today') {
      filtered = filtered.filter((ci) => {
        const date = new Date(ci.checked_in_at)
        return date.toDateString() === now.toDateString()
      })
    } else if (dateFilter === 'week') {
      const weekStart = startOfWeek(now)
      filtered = filtered.filter((ci) => {
        const date = new Date(ci.checked_in_at)
        return isAfter(date, weekStart)
      })
    } else if (dateFilter === 'month') {
      const monthStart = startOfMonth(now)
      filtered = filtered.filter((ci) => {
        const date = new Date(ci.checked_in_at)
        return isAfter(date, monthStart)
      })
    } else if (dateFilter === 'custom' && customStartDate && customEndDate) {
      const start = new Date(customStartDate)
      const end = new Date(customEndDate)
      filtered = filtered.filter((ci) => {
        const date = new Date(ci.checked_in_at)
        return isAfter(date, start) && isBefore(date, end)
      })
    }

    setFilteredCheckIns(filtered)
  }

  const calculateStreak = () => {
    if (checkIns.length === 0) return 0

    const sortedDates = checkIns
      .map((ci) => new Date(ci.checked_in_at).toDateString())
      .filter((date, index, self) => self.indexOf(date) === index)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

    let streak = 0
    const today = new Date().toDateString()
    const yesterday = new Date(Date.now() - 86400000).toDateString()

    if (sortedDates[0] !== today && sortedDates[0] !== yesterday) {
      return 0
    }

    for (let i = 0; i < sortedDates.length - 1; i++) {
      const current = new Date(sortedDates[i])
      const next = new Date(sortedDates[i + 1])
      const diff = differenceInDays(current, next)

      if (diff === 1) {
        streak++
      } else {
        break
      }
    }

    return streak + 1
  }

  const getMostAttendedClass = () => {
    if (checkIns.length === 0) return null

    const counts: Record<string, number> = {}
    checkIns.forEach((ci) => {
      counts[ci.class_id] = (counts[ci.class_id] || 0) + 1
    })

    const maxClassId = Object.keys(counts).reduce((a, b) =>
      counts[a] > counts[b] ? a : b
    )

    return {
      name: classMap[maxClassId] || t('user.unknownClass'),
      count: counts[maxClassId],
    }
  }

  const exportToCSV = () => {
    const headers = ['Date', 'Time', 'Class']
    const rows = filteredCheckIns.map((ci) => {
      const date = new Date(ci.checked_in_at)
      return [
        format(date, 'yyyy-MM-dd'),
        format(date, 'HH:mm:ss'),
        classMap[ci.class_id] || t('user.unknownClass'),
      ]
    })

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `check-ins-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const thisWeekCount = checkIns.filter((ci) => {
    const date = new Date(ci.checked_in_at)
    const weekStart = startOfWeek(new Date())
    return isAfter(date, weekStart)
  }).length

  const thisMonthCount = checkIns.filter((ci) => {
    const date = new Date(ci.checked_in_at)
    const monthStart = startOfMonth(new Date())
    return isAfter(date, monthStart)
  }).length

  const streak = calculateStreak()
  const mostAttended = getMostAttendedClass()

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
          <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
            {t('user.checkInHistory')}
          </h1>
          <p className="text-muted-foreground mt-2">{t('user.checkInHistoryDesc')}</p>
        </div>

        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('user.totalCheckIns')}</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{checkIns.length}</div>
              <p className="text-xs text-muted-foreground">{t('user.allTime')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('user.thisWeek')}</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{thisWeekCount}</div>
              <p className="text-xs text-muted-foreground">{t('user.checkIns')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('user.thisMonth')}</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{thisMonthCount}</div>
              <p className="text-xs text-muted-foreground">{t('user.checkIns')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('user.currentStreak')}</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{streak}</div>
              <p className="text-xs text-muted-foreground">{t('user.days')}</p>
            </CardContent>
          </Card>
        </div>

        {mostAttended && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>{t('user.mostAttendedClass')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{mostAttended.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {mostAttended.count} {t('user.checkIns')}
                  </p>
                </div>
                <Award className="w-12 h-12 text-pink-600" />
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>{t('user.allCheckIns')}</CardTitle>
                <CardDescription>
                  {t('user.showing')} {filteredCheckIns.length} {t('user.of')} {checkIns.length}
                </CardDescription>
              </div>
              <Button onClick={exportToCSV} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                {t('user.exportCSV')}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search">
                  <Search className="w-4 h-4 inline mr-2" />
                  {t('user.searchClasses')}
                </Label>
                <Input
                  id="search"
                  placeholder={t('user.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="classFilter">
                  <Filter className="w-4 h-4 inline mr-2" />
                  {t('user.filterByClass')}
                </Label>
                <select
                  id="classFilter"
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="all">{t('user.allClasses')}</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateFilter">
                  <Calendar className="w-4 h-4 inline mr-2" />
                  {t('user.filterByDate')}
                </Label>
                <select
                  id="dateFilter"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="all">{t('user.allTime')}</option>
                  <option value="today">{t('user.today')}</option>
                  <option value="week">{t('user.thisWeek')}</option>
                  <option value="month">{t('user.thisMonth')}</option>
                  <option value="custom">{t('user.customRange')}</option>
                </select>
              </div>
            </div>

            {dateFilter === 'custom' && (
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">{t('user.startDate')}</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">{t('user.endDate')}</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="max-h-[500px] overflow-y-auto space-y-2">
              {filteredCheckIns.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">{t('user.noCheckInsFound')}</p>
              ) : (
                filteredCheckIns.map((checkIn) => (
                  <div
                    key={checkIn.id}
                    className="p-4 border rounded-lg hover:bg-accent transition-colors flex justify-between items-center"
                  >
                    <div>
                      <div className="font-semibold text-lg">
                        {classMap[checkIn.class_id] || t('user.unknownClass')}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(checkIn.checked_in_at), 'EEEE, MMMM d, yyyy')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-pink-600">
                        {format(new Date(checkIn.checked_in_at), 'h:mm a')}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
