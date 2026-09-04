import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home.jsx";
import TrialDetailsPage from "./pages/trial/TrialDetailsPage.jsx";
import DurationPage from "./pages/checkout/DurationPage.jsx";
import UserDetailsPage from "./pages/checkout/UserDetailsPage.jsx";
import ReviewPage from "./pages/checkout/ReviewPage.jsx";
import PaymentSuccessPage from "./pages/payment/PaymentSuccessPage.jsx";
import PaymentFailedPage from "./pages/payment/PaymentFailedPage.jsx";
import PaymentCancelledPage from "./pages/payment/PaymentCancelledPage.jsx";
import ThankYouPage from "./pages/ThankYouPage.jsx";
import ProtectedAdminRoute from "./components/admin/ProtectedAdminRoute.jsx";
import AdminLoginPage from "./pages/admin/AdminLoginPage.jsx";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage.jsx";
import AdminUsersPage from "./pages/admin/AdminUsersPage.jsx";
import AdminPlansPage from "./pages/admin/AdminPlansPage.jsx";
import AdminSlotsPage from "./pages/admin/AdminSlotsPage.jsx";
import AdminOrdersPage from "./pages/admin/AdminOrdersPage.jsx";
import AdminPaymentsPage from "./pages/admin/AdminPaymentsPage.jsx";
import AdminTrialsPage from "./pages/admin/AdminTrialsPage.jsx";
import AdminNotificationsPage from "./pages/admin/AdminNotificationsPage.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/trial/details" element={<TrialDetailsPage />} />
        <Route path="/checkout/duration" element={<DurationPage />} />
        <Route path="/checkout/user-details" element={<UserDetailsPage />} />
        <Route path="/checkout/review" element={<ReviewPage />} />
        <Route path="/payment/success" element={<PaymentSuccessPage />} />
        <Route path="/payment/failed" element={<PaymentFailedPage />} />
        <Route path="/payment/cancelled" element={<PaymentCancelledPage />} />
        <Route path="/thank-you" element={<ThankYouPage />} />

        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/dashboard" element={<ProtectedAdminRoute><AdminDashboardPage /></ProtectedAdminRoute>} />
        <Route path="/admin/users" element={<ProtectedAdminRoute><AdminUsersPage /></ProtectedAdminRoute>} />
        <Route path="/admin/plans" element={<ProtectedAdminRoute><AdminPlansPage /></ProtectedAdminRoute>} />
        <Route path="/admin/slots" element={<ProtectedAdminRoute><AdminSlotsPage /></ProtectedAdminRoute>} />
        <Route path="/admin/orders" element={<ProtectedAdminRoute><AdminOrdersPage /></ProtectedAdminRoute>} />
        <Route path="/admin/payments" element={<ProtectedAdminRoute><AdminPaymentsPage /></ProtectedAdminRoute>} />
        <Route path="/admin/trials" element={<ProtectedAdminRoute><AdminTrialsPage /></ProtectedAdminRoute>} />
        <Route path="/admin/notifications" element={<ProtectedAdminRoute><AdminNotificationsPage /></ProtectedAdminRoute>} />
      </Routes>
    </BrowserRouter>
  );
}
