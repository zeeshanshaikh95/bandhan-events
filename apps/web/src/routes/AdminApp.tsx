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
        <Route path="settings" element={<AdminSettingsPage />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="audit" element={<AdminAuditPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
      <Route path="" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}
