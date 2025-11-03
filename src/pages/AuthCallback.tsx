import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { getRoleBasedDashboard } from '@/utils/roleRedirect'
import { CheckCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function AuthCallback() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, profile, loading } = useAuth()
  const [countdown, setCountdown] = useState(3)
  const [showSuccess, setShowSuccess] = useState(false)

  useEffect(() => {
    if (!loading && user && profile) {
      setShowSuccess(true)

      const countdownInterval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval)
            navigate(getRoleBasedDashboard(profile.role), { replace: true })
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(countdownInterval)
    } else if (!loading && !user) {
      navigate('/login', { replace: true })
    }
  }, [user, profile, loading, navigate])

  if (showSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-pink-50 to-white px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-green-100 p-4">
                <CheckCircle className="w-16 h-16 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
              {t('auth.welcomeMember')}
            </CardTitle>
            <CardDescription className="text-lg mt-2">
              {t('auth.redirecting')} <span className="font-bold text-2xl text-purple-600">{countdown}</span> {t('auth.seconds')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full bg-gradient-to-r from-pink-500 to-purple-600 h-2 rounded-full animate-pulse"></div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-pink-50 to-white">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
    </div>
  )
}
