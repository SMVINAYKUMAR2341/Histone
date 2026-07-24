import "@/App.css";
import "@/index.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Login from "@/pages/Login";
import AuthCallback from "@/pages/AuthCallback";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import NewAssessment from "@/pages/NewAssessment";
import AssessmentResult from "@/pages/AssessmentResult";
import AssessmentHistory from "@/pages/AssessmentHistory";
import Referrals from "@/pages/Referrals";
import Patients from "@/pages/Patients";
import PatientDetail from "@/pages/PatientDetail";
import PatientPedigree from "@/pages/PatientPedigree";
import AdminCriteria from "@/pages/AdminCriteria";
import AdminUsers from "@/pages/AdminUsers";
import Metrics from "@/pages/Metrics";

function Protected({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading…</div>;
  if (!user) return <Navigate to="/" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRoutes() {
  const location = useLocation();
  // Detect session_id in URL fragment synchronously, before ProtectedRoute
  if (location.hash?.includes("session_id=")) return <AuthCallback />;
  return (
    <Routes>
      <Route path="/" element={<PublicHome />} />
      <Route
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/assessment/new" element={<NewAssessment />} />
        <Route path="/assessment/:id" element={<AssessmentResult />} />
        <Route path="/assessments" element={<AssessmentHistory />} />
        <Route path="/referrals" element={<Referrals />} />
        <Route path="/patients" element={<Patients />} />
        <Route path="/patients/:id" element={<PatientDetail />} />
        <Route path="/patients/:id/pedigree" element={<PatientPedigree />} />
        <Route
          path="/admin/criteria"
          element={
            <Protected roles={["admin"]}>
              <AdminCriteria />
            </Protected>
          }
        />
        <Route
          path="/admin/users"
          element={
            <Protected roles={["admin"]}>
              <AdminUsers />
            </Protected>
          }
        />
        <Route
          path="/admin/metrics"
          element={
            <Protected roles={["admin"]}>
              <Metrics />
            </Protected>
          }
        />
      </Route>
    </Routes>
  );
}

function PublicHome() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading…</div>;
  if (user) return <Navigate to="/dashboard" replace />;
  return <Login />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
