import type { AuditLogDto } from "@bandhan/shared";
import { auditRepository } from "@/repositories/auditRepository";
import type { AuditLogDocument } from "@/models/AuditLog";
import type { AuthContext } from "@/types/auth";
import { buildPaginated } from "@/utils/http";
import { logger } from "@/utils/logger";

/**
 * Canonical action names. Keeping them in one place means the audit log stays
 * queryable instead of accumulating near-duplicate strings.
 */
export const AUDIT_ACTIONS = {
  loginSucceeded: "LOGIN_SUCCEEDED",
  loginFailed: "LOGIN_FAILED",
  loginBlocked: "LOGIN_BLOCKED",
  logout: "LOGOUT",
  passwordChanged: "PASSWORD_CHANGED",
  passwordResetRequested: "PASSWORD_RESET_REQUESTED",
  passwordResetCompleted: "PASSWORD_RESET_COMPLETED",
  sessionRevoked: "SESSION_REVOKED",
  accessDenied: "ACCESS_DENIED",

  leadCreated: "LEAD_CREATED",
  leadUpdated: "LEAD_UPDATED",
  leadNoteAdded: "LEAD_NOTE_ADDED",
  leadArchived: "LEAD_ARCHIVED",
  publicEnquiryReceived: "PUBLIC_ENQUIRY_RECEIVED",
  publicEnquiryRejected: "PUBLIC_ENQUIRY_REJECTED",

  userCreated: "USER_CREATED",
  userUpdated: "USER_UPDATED",
  userPasswordReset: "USER_PASSWORD_RESET",
  settingsUpdated: "SETTINGS_UPDATED",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export const auditService = {
  /**
   * Recording must never break the request it describes: an audit failure is
   * logged and swallowed, because losing a log line is better than failing a
   * customer's booking.
   */
  async record(input: {
    action: AuditAction | string;
    entityType: string;
    entityId?: string | null;
    actor?: AuthContext["user"] | null;
    ip?: string | null;
    requestId?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await auditRepository.record({
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        actor: input.actor?.id ?? null,
        actorName: input.actor?.name ?? "System",
        actorRole: input.actor?.role ?? null,
        ip: input.ip ?? null,
        requestId: input.requestId ?? null,
        metadata: input.metadata ?? {},
      });
    } catch (error) {
      logger.error("Failed to write audit log", {
        action: input.action,
        message: (error as Error).message,
      });
    }
  },

  async list(options: {
    page: number;
    limit: number;
    action?: string;
    entityType?: string;
    actorId?: string;
  }) {
    const { items, total } = await auditRepository.list(options);
    return buildPaginated(items.map(toAuditDto), total, options.page, options.limit);
  },
};

/** Populated actor fields are optional, so read them defensively. */
function toAuditDto(document: AuditLogDocument): AuditLogDto {
  const actor = document.actor as unknown as { _id?: unknown; name?: string; role?: string } | null;

  return {
    id: String(document._id),
    action: document.action,
    entityType: document.entityType,
    entityId: document.entityId ?? null,
    actor: actor && typeof actor === "object" && actor.name
      ? { id: String(actor._id ?? ""), name: actor.name, role: (actor.role as never) ?? "ADMIN" }
      : null,
    ip: document.ip ?? null,
    metadata: (document.metadata as Record<string, unknown>) ?? {},
    createdAt: (document.createdAt as Date).toISOString(),
  };
}
