import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { getRoleBasedDashboard } from '@/utils/roleRedirect'

export function AuthCallback() {
  const navigate = useNavigate()
  const { user, profile, loading } = useAuth()

  useEffect(() => {
    if (!loading && user && profile) {
      navigate(getRoleBasedDashboard(profile.role), { replace: true })
    } else if (!loading && !user) {
      navigate('/login', { replace: true })
    }
  }, [user, profile, loading, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  )
}
