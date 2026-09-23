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
import { apiClient, csrfToken, toQueryString } from "@/lib/apiClient";

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

export interface SyncStatus {
  configured: boolean;
  spreadsheetId: string | null;
  lastSyncAt: string | null;
  lastSyncError: string | null;
}

export interface SyncLogEntry {
  id: string;
  operation: string;
  module: string;
  recordId: string;
  sheetName: string;
  sheetRowNumber: number | null;
  status: string;
  errorMessage: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface SyncTestResult {
  connected: boolean;
  message: string;
  spreadsheetId?: string;
}

export interface SyncNowResult {
  synced: boolean;
  message: string;
  modules: string[];
}

export interface SyncRetryResult {
  success: boolean;
  action: string;
  error?: string;
}

export const syncApi = {
  status: () => apiClient.get<SyncStatus>("/sync/status"),
  test: () => apiClient.post<SyncTestResult>("/sync/test"),
  syncNow: () => apiClient.post<SyncNowResult>("/sync/now"),
  logs: (params: { page?: number; limit?: number; module?: string; status?: string; operation?: string } = {}) =>
    apiClient.get<Paginated<SyncLogEntry>>(`/sync/logs${toQueryString({ ...params })}`),
  retry: (module: string, id: string) => apiClient.post<SyncRetryResult>(`/sync/retry/${module}/${id}`),
};

// ── Finance API ────────────────────────────────────────────────────────────

export interface FinanceSummary {
  revenue: { total: number; thisMonth: number; thisYear: number };
  payments: { totalReceived: number; pending: number; overdue: number };
  expenses: { total: number; thisMonth: number; thisYear: number };
  investments: { total: number };
  profit: { gross: number; net: number };
  events: { active: number; completed: number; upcoming: number };
}

export interface PaymentDto {
  id: string;
  customer?: { id: string; name: string } | null;
  booking?: { id: string; eventName?: string } | null;
  amount: number;
  paymentDate: string;
  method: string;
  reference: string;
  notes: string;
  status: string;
  createdBy?: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseDto {
  id: string;
  date: string;
  category: string;
  amount: number;
  description: string;
  vendor?: { id: string; name: string } | null;
  vendorName: string;
  booking?: { id: string; eventName?: string } | null;
  paymentMethod: string;
  paidBy: string;
  receipt: string;
  notes: string;
  archivedAt?: string | null;
  createdBy?: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvestmentDto {
  id: string;
  date: string;
  partner: string;
  amount: number;
  type: string;
  purpose: string;
  paymentMethod: string;
  reference: string;
  notes: string;
  createdBy?: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface MonthlyReport {
  month: string;
  year: number;
  revenue: number;
  paymentsReceived: number;
  expenses: number;
  investments: number;
  grossProfit: number;
  outstanding: number;
  cashFlow: number;
}

export interface ExpenseBreakdown {
  category: string;
  label: string;
  amount: number;
  percentage: number;
}

export interface CashFlowSummary {
  moneyIn: { customerPayments: number; otherIncome: number; total: number };
  moneyOut: { expenses: number; vendorPayments: number; otherPayments: number; total: number };
  investments: { total: number };
  openingBalance: number;
  closingBalance: number;
}

export interface FinanceListParams {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  category?: string;
  method?: string;
  status?: string;
  search?: string;
  sort?: string;
}

export const financeApi = {
  summary: () => apiClient.get<FinanceSummary>("/finance/summary"),

  // Payments
  listPayments: (params: FinanceListParams = {}) =>
    apiClient.get<Paginated<PaymentDto>>(`/finance/payments${toQueryString({ ...params })}`),
  getPayment: (id: string) => apiClient.get<PaymentDto>(`/finance/payments/${id}`),
  createPayment: (input: object) => apiClient.post<PaymentDto>("/finance/payments", input),
  updatePayment: (id: string, input: object) => apiClient.patch<PaymentDto>(`/finance/payments/${id}`, input),
  deletePayment: (id: string) => apiClient.delete<{ voided: boolean }>(`/finance/payments/${id}`),

  // Expenses
  listExpenses: (params: FinanceListParams = {}) =>
    apiClient.get<Paginated<ExpenseDto>>(`/finance/expenses${toQueryString({ ...params })}`),
  getExpense: (id: string) => apiClient.get<ExpenseDto>(`/finance/expenses/${id}`),
  createExpense: (input: object) => apiClient.post<ExpenseDto>("/finance/expenses", input),
  updateExpense: (id: string, input: object) => apiClient.patch<ExpenseDto>(`/finance/expenses/${id}`, input),
  archiveExpense: (id: string) => apiClient.delete<{ archived: boolean }>(`/finance/expenses/${id}`),

  // Investments
  listInvestments: (params: FinanceListParams = {}) =>
    apiClient.get<Paginated<InvestmentDto>>(`/finance/investments${toQueryString({ ...params })}`),
  getInvestment: (id: string) => apiClient.get<InvestmentDto>(`/finance/investments/${id}`),
  createInvestment: (input: object) => apiClient.post<InvestmentDto>("/finance/investments", input),
  updateInvestment: (id: string, input: object) => apiClient.patch<InvestmentDto>(`/finance/investments/${id}`, input),
  deleteInvestment: (id: string) => apiClient.delete<{ deleted: boolean }>(`/finance/investments/${id}`),

  // Reports
  monthlyReport: (year?: number) =>
    apiClient.get<MonthlyReport[]>(`/finance/monthly-report${year ? `?year=${year}` : ""}`),
  expenseBreakdown: (startDate?: string, endDate?: string) =>
    apiClient.get<ExpenseBreakdown[]>(`/finance/expense-breakdown${startDate ? `?startDate=${startDate}&endDate=${endDate}` : ""}`),
  cashFlow: () => apiClient.get<CashFlowSummary>("/finance/cashflow"),
  eventProfitability: () => apiClient.get<unknown[]>("/finance/event-profitability"),
};

// ── Events API ─────────────────────────────────────────────────────────────

export interface EventServiceItem {
  name: string;
  description?: string;
  quantity?: number;
  unitPrice: number;
  estimatedCost?: number;
  vendor?: string | null;
  notes?: string;
}

export interface EventVendor {
  vendor: string;
  service?: string;
  agreedCost?: number;
  contactPerson?: string;
  contactPhone?: string;
  status?: string;
  paymentStatus?: string;
  notes?: string;
}

export interface EventTeamMember {
  user: string;
  role: string;
  notes?: string;
}

export interface EventDto {
  id: string;
  customer: { id: string; name: string; phone: string } | null;
  lead?: { id: string; name: string } | null;
  quotation?: { id: string; quotationNumber: string } | null;
  eventName: string;
  eventType: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  venue: string;
  venueAddress: string;
  guestCount: number | null;
  packageName: string;
  services: EventServiceItem[];
  contractAmount: number;
  paymentTerms: string;
  vendors: EventVendorAssignmentDto[];
  team: any[];
  notes: string;
  internalNotes: string;
  status: string;
  paymentStatus: string;
  amountReceived: number;
  outstanding: number;
  directExpenses: number;
  grossProfit: number;
  createdBy?: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface EventFinancials {
  contractAmount: number;
  amountReceived: number;
  outstanding: number;
  directExpenses: number;
  grossProfit: number;
  grossMarginPercent: number;
}

export interface UpcomingEvent {
  id: string;
  eventName: string;
  eventType: string;
  eventDate: string;
  venue: string;
  status: string;
  paymentStatus: string;
  customerName: string;
  customerPhone: string;
  outstanding: number;
}

export interface EventListParams {
  page?: number;
  limit?: number;
  search?: string;
  eventType?: string;
  status?: string;
  paymentStatus?: string;
  startDate?: string;
  endDate?: string;
  sort?: string;
}

export const eventApi = {
  list: (params: EventListParams = {}) =>
    apiClient.get<Paginated<EventDto>>(`/events${toQueryString({ ...params })}`),
  get: (id: string) => apiClient.get<EventDto>(`/events/${id}`),
  create: (input: object) => apiClient.post<EventDto>("/events", input),
  update: (id: string, input: object) => apiClient.patch<EventDto>(`/events/${id}`, input),
  archive: (id: string) => apiClient.delete<{ archived: boolean }>(`/events/${id}`),
  updateStatus: (id: string, status: string) =>
    apiClient.patch<EventDto>(`/events/${id}/status`, { status }),
  financials: (id: string) => apiClient.get<EventFinancials>(`/events/${id}/financials`),
  addNote: (id: string, body: string) =>
    apiClient.post<EventDto>(`/events/${id}/notes`, { body }),
  calendar: (start?: string, end?: string) =>
    apiClient.get<any[]>(`/events/calendar${start ? `?start=${start}&end=${end}` : ""}`),
  upcoming: (days?: number) =>
    apiClient.get<UpcomingEvent[]>(`/events/upcoming${days ? `?days=${days}` : ""}`),
  dashboardStats: () => apiClient.get<any>("/events/dashboard-stats"),
};

// ── Customers ──────────────────────────────────────────────────────────────

/**
 * The sales documents come straight from the shared package rather than being
 * restated here, so a field added on the API shows up in the dashboard at
 * compile time instead of at runtime.
 */
import type {
  CommercialSummary,
  CustomerDto,
  DocumentDto,
  InvoiceDto,
  QuotationDto,
  QuotationVersionDto,
} from "@bandhan/shared";

export interface CustomerListParams {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
}

export interface QuoteListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  customer?: string;
  event?: string;
  from?: string;
  to?: string;
  sort?: string;
}

export interface InvoiceListParams extends Omit<QuoteListParams, "sort"> {
  overdue?: "true" | "false";
  sort?: string;
}

export const customerApi = {
  list: (params: CustomerListParams = {}) =>
    apiClient.get<Paginated<CustomerDto>>(`/customers${toQueryString({ ...params })}`),
  get: (id: string) => apiClient.get<CustomerDto>(`/customers/${id}`),
  create: (input: object) => apiClient.post<CustomerDto>("/customers", input),
  update: (id: string, input: object) => apiClient.patch<CustomerDto>(`/customers/${id}`, input),
};

export interface AcceptQuotationBody {
  acceptedByName: string;
  acceptanceNote?: string;
  createEvent?: boolean;
  overrideExpired?: boolean;
}

export const quotationApi = {
  list: (params: QuoteListParams = {}) =>
    apiClient.get<Paginated<QuotationDto>>(`/quotations${toQueryString({ ...params })}`),
  summary: () => apiClient.get<CommercialSummary>("/quotations/summary"),
  get: (id: string) => apiClient.get<QuotationDto>(`/quotations/${id}`),
  create: (input: object) => apiClient.post<QuotationDto>("/quotations", input),
  update: (id: string, input: object) => apiClient.patch<QuotationDto>(`/quotations/${id}`, input),
  send: (id: string) => apiClient.post<QuotationDto>(`/quotations/${id}/send`),
  accept: (id: string, body: AcceptQuotationBody) =>
    apiClient.post<{ quotation: QuotationDto; event: { id: string; eventName: string } | null }>(
      `/quotations/${id}/accept`,
      body
    ),
  reject: (id: string, reason: string) =>
    apiClient.post<QuotationDto>(`/quotations/${id}/reject`, { reason }),
  cancel: (id: string, reason?: string) =>
    apiClient.post<QuotationDto>(`/quotations/${id}/cancel`, { reason }),
  convertToEvent: (id: string, body: { eventName?: string; eventDate?: string }) =>
    apiClient.post<{ quotation: QuotationDto; event: { id: string; eventName: string } }>(
      `/quotations/${id}/convert-to-event`,
      body
    ),
  generatePdf: (id: string) => apiClient.post<DocumentDto>(`/quotations/${id}/pdf`),
  documents: (id: string) => apiClient.get<DocumentDto[]>(`/quotations/${id}/documents`),
  versions: async (id: string): Promise<QuotationVersionDto[]> =>
    (await apiClient.get<QuotationDto>(`/quotations/${id}`)).versions,
};

export const invoiceApi = {
  list: (params: InvoiceListParams = {}) =>
    apiClient.get<Paginated<InvoiceDto>>(`/invoices${toQueryString({ ...params })}`),
  summary: () => apiClient.get<CommercialSummary>("/invoices/summary"),
  get: (id: string) => apiClient.get<InvoiceDto>(`/invoices/${id}`),
  create: (input: object) => apiClient.post<InvoiceDto>("/invoices", input),
  createFromQuotation: (body: { quotationId: string; dueDate?: string; notes?: string }) =>
    apiClient.post<InvoiceDto>("/invoices/from-quotation", body),
  update: (id: string, input: object) => apiClient.patch<InvoiceDto>(`/invoices/${id}`, input),
  issue: (id: string) => apiClient.post<InvoiceDto>(`/invoices/${id}/issue`),
  void: (id: string, reason: string) => apiClient.post<InvoiceDto>(`/invoices/${id}/void`, { reason }),
  payments: (id: string) => apiClient.get<PaymentDto[]>(`/invoices/${id}/payments`),
  generatePdf: (id: string) => apiClient.post<DocumentDto>(`/invoices/${id}/pdf`),
  generateReceipt: (id: string, paymentId: string) =>
    apiClient.post<DocumentDto & { receiptNumber: string }>(`/invoices/${id}/receipts`, { paymentId }),
  documents: (id: string) => apiClient.get<DocumentDto[]>(`/invoices/${id}/documents`),
};

// ── Vendors & caterers ─────────────────────────────────────────────────────

import type {
  EventVendorAssignmentDto,
  VendorDto,
  VendorFinancialsDto,
  VendorListItemDto,
  VendorPaymentDto,
} from "@bandhan/shared";

export interface VendorListParams {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
  status?: string;
  city?: string;
  area?: string;
  category?: string;
  activeOnly?: "true" | "false";
  sort?: string;
}

export interface VendorOptions {
  statusCounts: Record<string, number>;
  cities: string[];
}

export const vendorApi = {
  list: (params: VendorListParams = {}) =>
    apiClient.get<Paginated<VendorListItemDto>>(`/vendors${toQueryString({ ...params })}`),
  options: () => apiClient.get<VendorOptions>("/vendors/options"),
  get: (id: string) => apiClient.get<VendorDto>(`/vendors/${id}`),
  create: (input: object) => apiClient.post<VendorDto>("/vendors", input),
  update: (id: string, input: object) => apiClient.patch<VendorDto>(`/vendors/${id}`, input),
  setStatus: (id: string, status: string, reason?: string) =>
    apiClient.patch<VendorDto>(`/vendors/${id}/status`, { status, reason }),
  archive: (id: string) => apiClient.delete<{ archived: boolean; outstanding: number }>(`/vendors/${id}`),
  financials: (id: string) => apiClient.get<VendorFinancialsDto>(`/vendors/${id}/financials`),
  payments: (id: string) => apiClient.get<VendorPaymentDto[]>(`/vendors/${id}/payments`),
  notes: (id: string) => apiClient.get<VendorDto["noteLog"]>(`/vendors/${id}/notes`),
  addNote: (id: string, body: string) => apiClient.post<VendorDto>(`/vendors/${id}/notes`, { body }),
  documents: (id: string) => apiClient.get<DocumentDto[]>(`/vendors/${id}/documents`),
  /**
   * Uploads send the file as the raw body. Multipart would need another parser
   * for a single-file case, and this keeps the filename and the content type
   * as the only metadata the server sees — both of which it validates.
   */
  async uploadDocument(id: string, file: File): Promise<DocumentDto> {
    const response = await fetch(`/api/v1/vendors/${id}/documents`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": file.type,
        "X-File-Name": encodeURIComponent(file.name),
        "X-CSRF-Token": csrfToken(),
      },
      body: file,
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.success) {
      throw new Error(payload?.error?.message ?? "The file could not be uploaded.");
    }
    return payload.data as DocumentDto;
  },
};

export interface CreateAssignmentBody {
  vendor: string;
  role?: string;
  service?: string;
  estimatedCost?: number;
  negotiatedCost?: number;
  agreedCost?: number;
  quantity?: number;
  status?: string;
  startTime?: string;
  endTime?: string;
  notes?: string;
  contactPerson?: string;
  contactPhone?: string;
  caterer?: Record<string, unknown>;
}

export const eventVendorApi = {
  list: (eventId: string) =>
    apiClient.get<EventVendorAssignmentDto[]>(`/events/${eventId}/vendors`),
  assign: (eventId: string, body: CreateAssignmentBody) =>
    apiClient.post<EventVendorAssignmentDto>(`/events/${eventId}/vendors`, body),
  update: (eventId: string, assignmentId: string, body: Partial<CreateAssignmentBody>) =>
    apiClient.patch<EventVendorAssignmentDto>(`/events/${eventId}/vendors/${assignmentId}`, body),
  remove: (eventId: string, assignmentId: string) =>
    apiClient.delete<{ removed: boolean; expenseArchived: boolean }>(
      `/events/${eventId}/vendors/${assignmentId}`
    ),
  payments: (eventId: string) =>
    apiClient.get<VendorPaymentDto[]>(`/events/${eventId}/vendors/payments`),
  recordPayment: (eventId: string, assignmentId: string, body: object) =>
    apiClient.post<VendorPaymentDto>(`/events/${eventId}/vendors/${assignmentId}/payments`, body),
};

/**
 * Document downloads deliberately bypass the JSON client: the response is a
 * PDF, not an envelope. The request still carries the session cookie, and the
 * API marks the response `no-store`.
 */
export const documentApi = {
  downloadUrl: (id: string) => `/api/v1/documents/${id}`,
  async download(id: string, fileName: string): Promise<void> {
    const response = await fetch(`/api/v1/documents/${id}`, { credentials: "include" });
    if (!response.ok) throw new Error("That document could not be downloaded.");
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  },
};
