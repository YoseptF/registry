import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronRight } from 'lucide-react'
import type { CheckIn } from '@/types'
import { format } from 'date-fns'

interface RecentCheckInsCardProps {
  classIds?: string[]
  limit?: number
}

export function RecentCheckInsCard({ classIds, limit = 20 }: RecentCheckInsCardProps) {
  const { t } = useTranslation()
  const [checkIns, setCheckIns] = useState<CheckIn[]>([])

  useEffect(() => {
    fetchCheckIns()
    const cleanup = subscribeToCheckIns()
    return cleanup
  }, [classIds?.join(',')])

  const fetchCheckIns = async () => {
    try {
      let query = supabase
        .from('check_ins')
        .select('*, profiles(name, email), classes(name)')
        .order('checked_in_at', { ascending: false })
        .limit(limit)

      if (classIds && classIds.length > 0) {
        query = query.in('class_id', classIds)
      }

      const { data } = await query

      setCheckIns(data || [])
    } catch (error) {
      console.error('Error fetching check-ins:', error)
    }
  }

  const subscribeToCheckIns = () => {
    const channel = supabase
      .channel('check_ins_changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'check_ins' },
        async (payload) => {
          const newCheckIn = payload.new as CheckIn

          if (classIds && classIds.length > 0 && !classIds.includes(newCheckIn.class_id)) {
            return
          }

          const { data } = await supabase
            .from('check_ins')
            .select('*, profiles(name, email), classes(name)')
            .eq('id', newCheckIn.id)
            .single()

          if (data) {
            setCheckIns((prev) => [data, ...prev].slice(0, limit))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle>{t('admin.recentCheckIns')}</CardTitle>
          <CardDescription>{t('admin.liveUpdates')}</CardDescription>
        </div>
        <Link to="/check-ins-history">
          <Button variant="outline" size="sm">
            {t('user.viewAll')}
            <ChevronRight className="ml-1 w-4 h-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {checkIns.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t('user.noCheckIns')}</p>
          ) : (
            checkIns.map((checkIn) => (
              <div
                key={checkIn.id}
                className="p-3 border rounded-lg hover:bg-accent transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm font-medium">
                      {checkIn.is_temporary_user
                        ? t('admin.guestUser')
                        : `${checkIn.profiles?.name} (${checkIn.profiles?.email})`}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {checkIn.classes?.name}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(checkIn.checked_in_at), 'p')}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
