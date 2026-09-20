import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";
import { ROLES } from "@bandhan/shared";
import { USER_STATUSES } from "@bandhan/shared";

/**
 * ---------------------------------------------------------------------------
 * USER
 * ---------------------------------------------------------------------------
 * passwordHash is `select: false`, so it is never returned unless a query
 * explicitly asks for it. The toJSON transform is a second line of defence:
 * even if a hash were selected, it cannot leave the process through a
 * response body.
 */
const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, required: true, index: true },
    status: { type: String, enum: USER_STATUSES, default: "ACTIVE", index: true },

    /** Set for seeded/administratively-issued credentials. */
    mustChangePassword: { type: Boolean, default: true },
    passwordChangedAt: { type: Date, default: null },

    // Brute-force protection
    failedLoginAttempts: { type: Number, default: 0, min: 0 },
    lockedUntil: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },

    // Single-use, hashed password-reset token
    resetTokenHash: { type: String, default: null, select: false },
    resetTokenExpiresAt: { type: Date, default: null, select: false },
    resetTokenUsedAt: { type: Date, default: null, select: false },

    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    /** Soft delete — accounts are deactivated, never hard-deleted. */
    archivedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.passwordHash;
        delete ret.resetTokenHash;
        delete ret.resetTokenExpiresAt;
        delete ret.resetTokenUsedAt;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export type UserDocument = HydratedDocument<InferSchemaType<typeof userSchema>>;

export const User = model("User", userSchema);

/** True while the account is inside a lockout window. */
export function isLocked(user: Pick<UserDocument, "lockedUntil">): boolean {
  return Boolean(user.lockedUntil && user.lockedUntil.getTime() > Date.now());
}
