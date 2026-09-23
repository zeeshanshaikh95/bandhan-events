import { lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import RequireAuth from "@/components/admin/RequireAuth";

const AdminLoginPage = lazy(() => import("@/pages/admin/AdminLoginPage"));
const AdminForgotPasswordPage = lazy(() => import("@/pages/admin/AdminForgotPasswordPage"));
const AdminResetPasswordPage = lazy(() => import("@/pages/admin/AdminResetPasswordPage"));
const AdminChangePasswordPage = lazy(() => import("@/pages/admin/AdminChangePasswordPage"));
const AdminDashboardPage = lazy(() => import("@/pages/admin/AdminDashboardPage"));
const AdminLeadsPage = lazy(() => import("@/pages/admin/AdminLeadsPage"));
const AdminLeadDetailPage = lazy(() => import("@/pages/admin/AdminLeadDetailPage"));
const AdminSettingsPage = lazy(() => import("@/pages/admin/AdminSettingsPage"));
const AdminUsersPage = lazy(() => import("@/pages/admin/AdminUsersPage"));
const AdminAuditPage = lazy(() => import("@/pages/admin/AdminAuditPage"));
const AdminFinancePage = lazy(() => import("@/pages/admin/AdminFinancePage"));
const AdminPaymentsPage = lazy(() => import("@/pages/admin/AdminPaymentsPage"));
const AdminExpensesPage = lazy(() => import("@/pages/admin/AdminExpensesPage"));
const AdminInvestmentsPage = lazy(() => import("@/pages/admin/AdminInvestmentsPage"));
const AdminReportsPage = lazy(() => import("@/pages/admin/AdminReportsPage"));
const AdminEventsPage = lazy(() => import("@/pages/admin/AdminEventsPage"));
const AdminEventDetailPage = lazy(() => import("@/pages/admin/AdminEventDetailPage"));
const AdminEventFormPage = lazy(() => import("@/pages/admin/AdminEventFormPage"));
const AdminCalendarPage = lazy(() => import("@/pages/admin/AdminCalendarPage"));
const AdminCustomersPage = lazy(() => import("@/pages/admin/AdminCustomersPage"));
const AdminQuotationsPage = lazy(() => import("@/pages/admin/AdminQuotationsPage"));
const AdminQuotationFormPage = lazy(() => import("@/pages/admin/AdminQuotationFormPage"));
const AdminQuotationDetailPage = lazy(() => import("@/pages/admin/AdminQuotationDetailPage"));
const AdminInvoicesPage = lazy(() => import("@/pages/admin/AdminInvoicesPage"));
const AdminVendorsPage = lazy(() => import("@/pages/admin/AdminVendorsPage"));
const AdminVendorDetailPage = lazy(() => import("@/pages/admin/AdminVendorDetailPage"));
const AdminVendorFormPage = lazy(() => import("@/pages/admin/AdminVendorFormPage"));
const AdminInvoiceDetailPage = lazy(() => import("@/pages/admin/AdminInvoiceDetailPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));

/**
 * Everything under /admin. Public routes are untouched; this subtree owns its
 * own chrome and its own auth gate.
 */
export default function AdminApp() {
  return (
    <Routes>
      {/* Unauthenticated */}
      <Route path="login" element={<AdminLoginPage />} />
      <Route path="forgot-password" element={<AdminForgotPasswordPage />} />
      <Route path="reset-password" element={<AdminResetPasswordPage />} />

      {/* Authenticated — the gate redirects to /admin/login when signed out */}
      <Route
        element={
          <RequireAuth>
            <AdminLayout />
          </RequireAuth>
        }
      >
        <Route index element={<AdminDashboardPage />} />
        <Route path="change-password" element={<AdminChangePasswordPage />} />
        <Route path="leads" element={<AdminLeadsPage />} />
        <Route path="leads/:leadId" element={<AdminLeadDetailPage />} />
        <Route path="events" element={<AdminEventsPage />} />
        <Route path="events/new" element={<AdminEventFormPage />} />
        <Route path="events/:eventId" element={<AdminEventDetailPage />} />
        <Route path="events/:eventId/edit" element={<AdminEventFormPage />} />
        <Route path="calendar" element={<AdminCalendarPage />} />
        <Route path="customers" element={<AdminCustomersPage />} />
        <Route path="quotations" element={<AdminQuotationsPage />} />
        <Route path="quotations/new" element={<AdminQuotationFormPage />} />
        <Route path="quotations/:quotationId" element={<AdminQuotationDetailPage />} />
        <Route path="quotations/:quotationId/edit" element={<AdminQuotationFormPage />} />
        <Route path="invoices" element={<AdminInvoicesPage />} />
        <Route path="invoices/:invoiceId" element={<AdminInvoiceDetailPage />} />
        <Route path="vendors" element={<AdminVendorsPage />} />
        <Route path="vendors/new" element={<AdminVendorFormPage />} />
        <Route path="vendors/:vendorId" element={<AdminVendorDetailPage />} />
        <Route path="vendors/:vendorId/edit" element={<AdminVendorFormPage />} />
        <Route path="finance" element={<AdminFinancePage />} />
        <Route path="payments" element={<AdminPaymentsPage />} />
        <Route path="expenses" element={<AdminExpensesPage />} />
        <Route path="investments" element={<AdminInvestmentsPage />} />
        <Route path="reports" element={<AdminReportsPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="audit" element={<AdminAuditPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
      <Route path="" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}
