import type { LeadSource, LeadStatus, UserStatus } from "./constants";
import type { Permission } from "./permissions";
import type { Role } from "./roles";
import type { StageConfiguration } from "./validation/stage";

/** Every API response uses one of these two envelopes. */
export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  /** Field-level validation issues, keyed by field path. */
  details?: Record<string, string[]>;
}

export interface ApiFailure {
  success: false;
  error: ApiErrorBody;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** The authenticated user as sent to the client. Never includes hashes. */
export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  permissions: Permission[];
  mustChangePassword: boolean;
  lastLoginAt?: string | null;
}

export interface AuthSessionResponse {
  user: SessionUser;
  /** Present so the client can show a "session ended" message. */
  expiresAt: string;
}

export interface LeadNote {
  id: string;
  body: string;
  authorName: string;
  authorId?: string | null;
  createdAt: string;
}

export interface LeadDto {
  id: string;
  name: string;
  phone: string;
  email?: string;
  eventType: string;
  eventDate?: string | null;
  guestCount?: number | null;
  serviceRequired: string;
  budget?: string | null;
  message?: string;
  source: LeadSource;
  status: LeadStatus;
  assignedTo?: { id: string; name: string } | null;
  notes: LeadNote[];
  nextFollowUpAt?: string | null;
  lostReason?: string | null;
  pagePath?: string | null;
  /** Stage-builder choices, present only on enquiries from /build-your-stage. */
  stageConfiguration?: StageConfiguration | null;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  todaysEnquiries: number;
  newLeads: number;
  totalLeads: number;
  followUpsDue: number;
  leadsByStatus: Record<string, number>;
  leadsBySource: Record<string, number>;
  /** Deliberately zero until the booking module exists — never fabricated. */
  upcomingEvents: number;
  confirmedBookings: number;
  recentLeads: LeadDto[];
}

export interface AuditLogDto {
  id: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  actor?: { id: string; name: string; role: Role } | null;
  ip?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface IntegrationStatus {
  key: string;
  label: string;
  connected: boolean;
  /** Human explanation shown in the dashboard, e.g. "Meta credentials not configured." */
  note: string;
  /** Deep link to the external listing, when one is registered in settings. */
  profileUrl?: string | null;
  /** True when the listing is tracked manually rather than via an API. */
  trackedManually?: boolean;
  /** Manual tracking state for link-backed listings. */
  manualStatus?: "LINKED" | "NOT_LINKED";
}
