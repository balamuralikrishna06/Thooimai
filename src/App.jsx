import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ReportsProvider } from "./state/ReportsContext";
import Login from "./pages/Login";
import CitizenHome from "./pages/citizen/CitizenHome";
import SubmitReport from "./pages/citizen/SubmitReport";
import AuthorityDashboard from "./pages/authority/AuthorityDashboard";
import WorkerDashboard from "./pages/worker/WorkerDashboard";

// RBAC Protected Route Component
function ProtectedRoute({ children, allowedRoles }) {
  const { user, role } = useAuth();

  if (!user || user === undefined) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    // If user is logged in but unauthorized, redirect to their specific dashboard
    if (role === 'admin') return <Navigate to="/admin-dashboard" replace />;
    if (role === 'worker') return <Navigate to="/worker-dashboard" replace />;
    return <Navigate to="/citizen-dashboard" replace />;
  }

  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <ReportsProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Login />} />

            {/* Admin Routes */}
            <Route
              path="/admin-dashboard"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AuthorityDashboard />
                </ProtectedRoute>
              }
            />

            {/* Citizen Routes */}
            <Route
              path="/citizen-dashboard"
              element={
                <ProtectedRoute allowedRoles={['citizen']}>
                  <CitizenHome />
                </ProtectedRoute>
              }
            />
            <Route
              path="/citizen-dashboard/report"
              element={
                <ProtectedRoute allowedRoles={['citizen']}>
                  <SubmitReport />
                </ProtectedRoute>
              }
            />

            {/* Worker Routes */}
            <Route
              path="/worker-dashboard"
              element={
                <ProtectedRoute allowedRoles={['worker']}>
                  <WorkerDashboard />
                </ProtectedRoute>
              }
            />

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ReportsProvider>
    </AuthProvider>
  );
}
