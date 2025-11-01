import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { CheckInNotifications } from './components/CheckInNotifications'
import { Landing } from './pages/Landing'
import { Classes } from './pages/Classes'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { UserDashboard } from './pages/UserDashboard'
import { CheckInsHistory } from './pages/CheckInsHistory'
import { AdminDashboard } from './pages/AdminDashboard'
import { InstructorDashboard } from './pages/InstructorDashboard'
import { InstructorProfile } from './pages/InstructorProfile'
import { Instructors } from './pages/Instructors'
import { CheckIn } from './pages/CheckIn'

function App() {
  return (
    <AuthProvider>
      <Router>
        <CheckInNotifications />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/classes" element={<Classes />} />
          <Route path="/instructors" element={<Instructors />} />
          <Route path="/instructor/:instructorId" element={<InstructorProfile />} />
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
            path="/instructor"
            element={
              <ProtectedRoute requireInstructor>
                <InstructorDashboard />
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
      <Toaster
        position="top-center"
        richColors
        expand={true}
        toastOptions={{
          style: {
            padding: '20px 24px',
            fontSize: '16px',
            minHeight: '80px',
          },
          className: 'text-lg font-medium',
        }}
      />
    </AuthProvider>
  )
}

export default App
