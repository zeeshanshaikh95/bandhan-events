import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { ApiClientError } from "@/lib/apiClient";

/**
 * Query defaults tuned for a business dashboard on unreliable connections:
 * retry only when the failure is plausibly transient (network or 5xx), never
 * on validation/auth errors where a retry would just repeat the same mistake.
 */
function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          if (error instanceof ApiClientError && error.status >= 400 && error.status < 500) return false;
          return failureCount < 2;
        },
      },
      mutations: { retry: false },
    },
  });
}

export default function QueryProvider({ children }: { children: ReactNode }) {
  // Created once per mount — never shared between renders or test runs.
  const [client] = useState(createQueryClient);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
