import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { CheckInNotifications } from "./components/CheckInNotifications";
import { Landing } from "./pages/Landing";
import { Classes } from "./pages/Classes";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { UserDashboard } from "./pages/UserDashboard";
import UserCalendar from "./pages/UserCalendar";
import { CheckInsHistory } from "./pages/CheckInsHistory";
import { AdminDashboard } from "./pages/AdminDashboard";
import { ClassPackages } from "./pages/ClassPackages";
import { DropInCredits } from "./pages/DropInCredits";
import { SalesDashboard } from "./pages/SalesDashboard";
import { AdminPayments } from "./pages/AdminPayments";
import { InstructorDashboard } from "./pages/InstructorDashboard";
import { InstructorPayments } from "./pages/InstructorPayments";
import { InstructorProfile } from "./pages/InstructorProfile";
import { Instructors } from "./pages/Instructors";
import { CheckIn } from "./pages/CheckIn";
import { AuthCallback } from "./pages/AuthCallback";

function AppContent() {
  return (
    <>
      <CheckInNotifications />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/classes" element={<Classes />} />
        <Route path="/instructors" element={<Instructors />} />
        <Route
          path="/instructor/:instructorId"
          element={<InstructorProfile />}
        />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route
          path="/user"
          element={
            <ProtectedRoute requireUser>
              <UserDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/user/calendar"
          element={
            <ProtectedRoute requireUser>
              <UserCalendar />
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
          path="/instructor/payments"
          element={
            <ProtectedRoute requireInstructor>
              <InstructorPayments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/instructor/calendar"
          element={
            <ProtectedRoute requireInstructor>
              <UserCalendar />
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
          path="/admin/class-packages"
          element={
            <ProtectedRoute requireAdmin>
              <ClassPackages />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/drop-in-credits"
          element={
            <ProtectedRoute requireAdmin>
              <DropInCredits />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/sales"
          element={
            <ProtectedRoute requireAdmin>
              <SalesDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/payments"
          element={
            <ProtectedRoute requireAdmin>
              <AdminPayments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/checkin/:classId"
          element={
            <ProtectedRoute requireInstructor>
              <CheckIn />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
        <Toaster
          position="top-center"
          richColors
          expand={true}
          toastOptions={{
            style: {
              padding: "20px 24px",
              fontSize: "16px",
              minHeight: "80px",
            },
            className: "text-lg font-medium",
          }}
        />
      </Router>
    </AuthProvider>
  );
}

export default App;
