import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

/**
 * ---------------------------------------------------------------------------
 * AUDIT LOG
 * ---------------------------------------------------------------------------
 * Append-only record of every action that matters. Deliberately stores the
 * actor's name and role at the time of the action, so history stays readable
 * even if the account is later renamed or deactivated. Secrets and tokens are
 * never written here.
 */
const auditLogSchema = new Schema(
  {
    action: { type: String, required: true, index: true, maxlength: 60 },
    entityType: { type: String, required: true, index: true, maxlength: 40 },
    entityId: { type: String, default: null, maxlength: 60 },
    actor: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    actorName: { type: String, default: "System", maxlength: 80 },
    actorRole: { type: String, default: null, maxlength: 20 },
    ip: { type: String, default: null, maxlength: 60 },
    requestId: { type: String, default: null, maxlength: 60 },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

export type AuditLogDocument = HydratedDocument<InferSchemaType<typeof auditLogSchema>>;

export const AuditLog = model("AuditLog", auditLogSchema);
