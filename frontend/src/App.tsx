import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { ROLE_HOME } from '@/utils/format';
import Landing from '@/pages/public/Landing';
import Login from '@/pages/public/Login';
import Register from '@/pages/public/Register';
import RequestsList from '@/pages/shared/RequestsList';
import RequestDetail from '@/pages/shared/RequestDetail';
import Notifications from '@/pages/shared/Notifications';
import Profile from '@/pages/shared/Profile';
import RequesterDashboard from '@/pages/requester/Dashboard';
import RequestBlood from '@/pages/requester/RequestBlood';
import DonorDashboard from '@/pages/donor/Dashboard';
import DonorRequests from '@/pages/donor/Requests';
import DonorRequestDetail from '@/pages/donor/RequestDetail';
import DonorResponses from '@/pages/donor/Responses';
import DonorProfile from '@/pages/donor/Profile';
import HospitalDashboard from '@/pages/hospital/Dashboard';
import HospitalDonorResponses from '@/pages/hospital/DonorResponses';
import BankDashboard from '@/pages/bloodbank/Dashboard';
import Inventory from '@/pages/bloodbank/Inventory';
import BankRequests from '@/pages/bloodbank/Requests';
import Fulfillment from '@/pages/bloodbank/Fulfillment';
import BankHistory from '@/pages/bloodbank/History';
import AdminDashboard from '@/pages/admin/Dashboard';
import Users from '@/pages/admin/Users';
import Verification from '@/pages/admin/Verification';
import Analytics from '@/pages/admin/Analytics';
import AuditLogs from '@/pages/admin/AuditLogs';
import Settings from '@/pages/admin/Settings';

function Fallback() {
  const { user } = useAuth();
  return <Navigate to={user ? ROLE_HOME[user.role] : '/'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<ProtectedRoute role="REQUESTER" />}>
        <Route element={<DashboardLayout />}>
          <Route path="/requester" element={<Navigate to="/requester/dashboard" replace />} />
          <Route path="/requester/dashboard" element={<RequesterDashboard />} />
          <Route path="/requester/request-blood" element={<RequestBlood />} />
          <Route path="/requester/requests" element={<RequestsList title="My requests" subtitle="Every request you created" basePath="/requester/requests" scope="active" />} />
          <Route path="/requester/requests/:id" element={<RequestDetail backPath="/requester/requests" />} />
          <Route path="/requester/history" element={<RequestsList title="Request history" subtitle="Completed, rejected, cancelled and expired" basePath="/requester/requests" scope="history" />} />
          <Route path="/requester/notifications" element={<Notifications />} />
          <Route path="/requester/profile" element={<Profile />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute role="DONOR" />}>
        <Route element={<DashboardLayout />}>
          <Route path="/donor" element={<Navigate to="/donor/dashboard" replace />} />
          <Route path="/donor/dashboard" element={<DonorDashboard />} />
          <Route path="/donor/requests" element={<DonorRequests />} />
          <Route path="/donor/requests/:id" element={<DonorRequestDetail />} />
          <Route path="/donor/responses" element={<DonorResponses />} />
          <Route path="/donor/history" element={<DonorResponses history />} />
          <Route path="/donor/profile" element={<DonorProfile />} />
          <Route path="/donor/notifications" element={<Notifications />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute role="HOSPITAL" />}>
        <Route element={<DashboardLayout />}>
          <Route path="/hospital" element={<Navigate to="/hospital/dashboard" replace />} />
          <Route path="/hospital/dashboard" element={<HospitalDashboard />} />
          <Route path="/hospital/requests" element={<RequestsList title="Requests" subtitle="Verify, reject and coordinate" basePath="/hospital/requests" />} />
          <Route path="/hospital/requests/:id" element={<RequestDetail backPath="/hospital/requests" />} />
          <Route path="/hospital/donor-responses" element={<HospitalDonorResponses />} />
          <Route path="/hospital/notifications" element={<Notifications />} />
          <Route path="/hospital/profile" element={<Profile />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute role="BLOODBANK" />}>
        <Route element={<DashboardLayout />}>
          <Route path="/bloodbank" element={<Navigate to="/bloodbank/dashboard" replace />} />
          <Route path="/bloodbank/dashboard" element={<BankDashboard />} />
          <Route path="/bloodbank/inventory" element={<Inventory />} />
          <Route path="/bloodbank/requests" element={<BankRequests />} />
          <Route path="/bloodbank/fulfillment" element={<Fulfillment />} />
          <Route path="/bloodbank/history" element={<BankHistory />} />
          <Route path="/bloodbank/notifications" element={<Notifications />} />
          <Route path="/bloodbank/profile" element={<Profile />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute role="ADMIN" />}>
        <Route element={<DashboardLayout />}>
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<Users />} />
          <Route path="/admin/hospitals" element={<Verification kind="hospitals" />} />
          <Route path="/admin/bloodbanks" element={<Verification kind="bloodbanks" />} />
          <Route path="/admin/requests" element={<RequestsList title="All requests" subtitle="Monitor activity and review flagged requests" basePath="/admin/requests" />} />
          <Route path="/admin/requests/:id" element={<RequestDetail backPath="/admin/requests" />} />
          <Route path="/admin/analytics" element={<Analytics />} />
          <Route path="/admin/audit-logs" element={<AuditLogs />} />
          <Route path="/admin/settings" element={<Settings />} />
          <Route path="/admin/notifications" element={<Notifications />} />
        </Route>
      </Route>
      <Route path="*" element={<Fallback />} />
    </Routes>
  );
}
