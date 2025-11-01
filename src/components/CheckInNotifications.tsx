import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { CheckIn } from '@/types'

export function CheckInNotifications() {
  const { t } = useTranslation()
  const { profile } = useAuth()

  useEffect(() => {
    if (!profile) return

    const channel = supabase
      .channel('user_check_ins_global')
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

          const className = classData?.name || t('user.unknownClass')

          toast.success(`✓ ${t('user.checkedInTo')} ${className}!`, {
            duration: 5000,
            description: t('user.attendanceRecorded'),
          })
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [profile?.id])

  return null
}
