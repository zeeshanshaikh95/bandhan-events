import type {
  AuditLogDto,
  BusinessSettingsInput,
  DashboardStats,
  EnquiryInput,
  IntegrationStatus,
  LeadDto,
  Paginated,
  PublicBusinessSettings,
  SessionUser,
} from "@bandhan/shared";
import { apiClient, toQueryString } from "@/lib/apiClient";

/**
 * ---------------------------------------------------------------------------
 * SERVICES
 * ---------------------------------------------------------------------------
 * Components never call fetch directly: every endpoint the UI needs has a
 * named function here, so the wire format lives in exactly one place.
 */

export interface SessionResponse {
  user: SessionUser;
  expiresAt: string;
}

export const authApi = {
  session: () => apiClient.get<SessionResponse>("/auth/session"),
  login: (email: string, password: string) =>
    apiClient.post<SessionResponse>("/auth/login", { email, password }),
  logout: () => apiClient.post<{ signedOut: boolean }>("/auth/logout"),
  changePassword: (currentPassword: string, newPassword: string, confirmPassword: string) =>
    apiClient.post<{ passwordChanged: boolean; signedOut: boolean }>("/auth/change-password", {
      currentPassword,
      newPassword,
      confirmPassword,
    }),
  forgotPassword: (email: string) =>
    apiClient.post<{ message: string }>("/auth/forgot-password", { email }),
  resetPassword: (token: string, newPassword: string, confirmPassword: string) =>
    apiClient.post<{ email: string }>("/auth/reset-password", { token, newPassword, confirmPassword }),
};

export const publicApi = {
  settings: () => apiClient.get<PublicBusinessSettings>("/public/settings"),
  submitEnquiry: (input: EnquiryInput & { pagePath?: string }) =>
    apiClient.post<{ received: boolean; reference?: string }>("/public/enquiries", input),
};

export interface LeadListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  source?: string;
  sort?: string;
}

export const leadApi = {
  list: (params: LeadListParams) =>
    apiClient.get<Paginated<LeadDto>>(`/leads${toQueryString({ ...params })}`),
  get: (id: string) => apiClient.get<LeadDto>(`/leads/${id}`),
  create: (input: object) => apiClient.post<LeadDto>("/leads", input),
  update: (id: string, input: object) => apiClient.patch<LeadDto>(`/leads/${id}`, input),
  addNote: (id: string, body: string) => apiClient.post<LeadDto>(`/leads/${id}/notes`, { body }),
  archive: (id: string) => apiClient.delete<{ archived: boolean }>(`/leads/${id}`),
};

export const dashboardApi = {
  stats: () => apiClient.get<DashboardStats>("/dashboard/stats"),
  integrations: () => apiClient.get<IntegrationStatus[]>("/dashboard/integrations"),
};

export const settingsApi = {
  get: () => apiClient.get<BusinessSettingsInput>("/settings"),
  update: (patch: Partial<BusinessSettingsInput>) =>
    apiClient.put<BusinessSettingsInput>("/settings", patch),
};

export interface AdminUser extends SessionUser {
  activeSessions: number;
  createdAt: string;
}

export const userApi = {
  list: (params: { search?: string; role?: string; status?: string } = {}) =>
    apiClient.get<AdminUser[]>(`/users${toQueryString({ ...params })}`),
  create: (input: object) => apiClient.post<AdminUser>("/users", input),
  update: (id: string, input: object) => apiClient.patch<AdminUser>(`/users/${id}`, input),
  resetPassword: (id: string, temporaryPassword: string, forceChange = true) =>
    apiClient.post<{ passwordReset: boolean }>(`/users/${id}/reset-password`, {
      temporaryPassword,
      forceChange,
    }),
};

export const auditApi = {
  list: (params: { page?: number; limit?: number; action?: string; entityType?: string } = {}) =>
    apiClient.get<Paginated<AuditLogDto>>(`/audit${toQueryString({ ...params })}`),
};
