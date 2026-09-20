import type { AuditLogDocument } from "@/models/AuditLog";
import { AuditLog } from "@/models/AuditLog";

export interface AuditEntry {
  action: string;
  entityType: string;
  entityId?: string | null;
  actor?: string | null;
  actorName?: string;
  actorRole?: string | null;
  ip?: string | null;
  requestId?: string | null;
  metadata?: Record<string, unknown>;
}

export const auditRepository = {
  async record(entry: AuditEntry): Promise<void> {
    await AuditLog.create({
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      actor: entry.actor ?? null,
      actorName: entry.actorName ?? "System",
      actorRole: entry.actorRole ?? null,
      ip: entry.ip ?? null,
      requestId: entry.requestId ?? null,
      metadata: entry.metadata ?? {},
    });
  },

  async list(options: {
    page: number;
    limit: number;
    action?: string;
    entityType?: string;
    actorId?: string;
  }): Promise<{ items: AuditLogDocument[]; total: number }> {
    const filter: Record<string, unknown> = {};
    if (options.action) filter.action = options.action;
    if (options.entityType) filter.entityType = options.entityType;
    if (options.actorId) filter.actor = options.actorId;

    const [items, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip((options.page - 1) * options.limit)
        .limit(options.limit),
      AuditLog.countDocuments(filter),
    ]);
    return { items, total };
  },
};
