import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "@/providers/AuthProvider";
import RouteFallback from "@/components/ui/RouteFallback";

/**
 * Client-side gate for the dashboard. It exists for user experience only —
 * every admin API call is independently authenticated and authorised on the
 * server, so bypassing this component grants nothing.
 */
export default function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <RouteFallback />;

  if (!user) {
    // Remember where they were headed so login can return them there.
    return <Navigate to="/admin/login" replace state={{ from: location.pathname + location.search }} />;
  }

  // Initial or reset credentials must be replaced before anything else.
  if (user.mustChangePassword && location.pathname !== "/admin/change-password") {
    return <Navigate to="/admin/change-password" replace />;
  }

  return <>{children}</>;
}
