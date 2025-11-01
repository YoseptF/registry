import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Landing } from './pages/Landing'
import { Classes } from './pages/Classes'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { UserDashboard } from './pages/UserDashboard'
import { CheckInsHistory } from './pages/CheckInsHistory'
import { AdminDashboard } from './pages/AdminDashboard'
import { CheckIn } from './pages/CheckIn'

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/classes" element={<Classes />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/user"
            element={
              <ProtectedRoute>
                <UserDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/check-ins-history"
            element={
              <ProtectedRoute>
                <CheckInsHistory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAdmin>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/checkin/:classId"
            element={
              <ProtectedRoute requireAdmin>
                <CheckIn />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
      <Toaster position="top-center" richColors />
    </AuthProvider>
  )
}

export default App
