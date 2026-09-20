import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

/**
 * Server-side sessions. The raw token lives only in the httpOnly cookie; the
 * database stores its SHA-256 hash, so a database dump cannot be replayed as a
 * valid session.
 *
 * `expiresAt` carries a TTL index so MongoDB cleans up on its own; `revokedAt`
 * supports immediate invalidation (logout, password change, role change).
 */
const sessionSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, select: false },
    /**
     * CSRF token bound to this session. The browser receives it in a
     * readable cookie and must echo it in the X-CSRF-Token header on every
     * state-changing request.
     */
    csrfTokenHash: { type: String, required: true, select: false },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null, maxlength: 300 },
    expiresAt: { type: Date, required: true },
    lastUsedAt: { type: Date, default: () => new Date() },
    revokedAt: { type: Date, default: null },
    revokedReason: { type: String, default: null, maxlength: 60 },
  },
  { timestamps: true }
);

// Session lookups are always "find by token hash, still valid".
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
sessionSchema.index({ user: 1, revokedAt: 1 });

export type SessionDocument = HydratedDocument<InferSchemaType<typeof sessionSchema>>;

export const Session = model("Session", sessionSchema);
