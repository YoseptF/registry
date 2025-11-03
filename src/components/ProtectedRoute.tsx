import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { getRoleBasedDashboard } from '@/utils/roleRedirect'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAdmin?: boolean
  requireInstructor?: boolean
  requireUser?: boolean
}

export function ProtectedRoute({ children, requireAdmin = false, requireInstructor = false, requireUser = false }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user || !profile) {
    return <Navigate to="/login" replace />
  }

  if (requireAdmin && profile.role !== 'admin') {
    return <Navigate to={getRoleBasedDashboard(profile.role)} replace />
  }

  if (requireInstructor && profile.role !== 'instructor' && profile.role !== 'admin') {
    return <Navigate to={getRoleBasedDashboard(profile.role)} replace />
  }

  if (requireUser && profile.role !== 'user') {
    return <Navigate to={getRoleBasedDashboard(profile.role)} replace />
  }

  return <>{children}</>
}
