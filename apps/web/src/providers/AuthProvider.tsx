import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import type { Permission, SessionUser } from "@bandhan/shared";
import { ApiClientError } from "@/lib/apiClient";
import { authApi } from "@/services/api";

/**
 * ---------------------------------------------------------------------------
 * SESSION
 * ---------------------------------------------------------------------------
 * The browser never holds a token: the session cookie is httpOnly, so all this
 * provider can do is ask the API who is signed in. `null` therefore means
 * "signed out", never "unknown".
 */

interface AuthContextValue {
  user: SessionUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<SessionUser>;
  logout: () => Promise<void>;
  /** Convenience for hiding UI a role cannot use. The API is the real gate. */
  can: (permission: Permission) => boolean;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const SESSION_KEY = ["auth", "session"] as const;

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const location = useLocation();
  // Only the dashboard cares who is signed in: public pages must not call the
  // API just to render a marketing page.
  const onAdminRoute = location.pathname.startsWith("/admin");

  const session = useQuery({
    queryKey: SESSION_KEY,
    enabled: onAdminRoute,
    queryFn: async () => {
      try {
        return await authApi.session();
      } catch (error) {
        // A 401 is a normal answer ("nobody is signed in"), not a failure.
        if (error instanceof ApiClientError && error.isUnauthenticated) return null;
        throw error;
      }
    },
    staleTime: 60_000,
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authApi.login(email, password),
    onSuccess: (data) => {
      queryClient.setQueryData(SESSION_KEY, data);
      // Anything cached from a previous session must not leak across users.
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      queryClient.setQueryData(SESSION_KEY, null);
      queryClient.clear();
    },
  });

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: SESSION_KEY });
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(() => {
    const user = session.data?.user ?? null;
    return {
      user,
      isLoading: session.isLoading,
      login: async (email, password) => (await loginMutation.mutateAsync({ email, password })).user,
      logout: async () => {
        await logoutMutation.mutateAsync();
      },
      can: (permission) => Boolean(user?.permissions?.includes(permission)),
      refresh,
    };
  }, [session.data, session.isLoading, loginMutation, logoutMutation, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
