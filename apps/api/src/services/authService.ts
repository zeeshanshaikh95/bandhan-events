import { changePasswordSchema, passwordSchema, type Role } from "@bandhan/shared";
import { env } from "@/config/env";
import { isLocked, type UserDocument } from "@/models/User";
import { userRepository } from "@/repositories/userRepository";
import { AUDIT_ACTIONS, auditService } from "@/services/auditService";
import { sessionService, toSessionUser } from "@/services/sessionService";
import { ApiError } from "@/utils/ApiError";
import { dummyPasswordHash, generateToken, hashPassword, hashToken, verifyPassword } from "@/utils/crypto";
import { logger } from "@/utils/logger";
import type { AuthContext } from "@/types/auth";

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

export interface LoginResult {
  user: ReturnType<typeof toSessionUser>;
  token: string;
  csrfToken: string;
  expiresAt: Date;
}

export interface RequestContext {
  ip: string;
  userAgent: string;
  requestId: string;
}

/**
 * Password policy beyond the shared schema: a password must not contain the
 * account's own name or the local part of its email address.
 */
/**
 * Audit entries record who acted, so a user document is projected into a
 * minimal actor. Permissions are intentionally empty here: the audit log
 * stores the role, and re-deriving permissions would mean loading them twice.
 */
function asAuditActor(user: UserDocument) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    permissions: [],
    mustChangePassword: Boolean(user.mustChangePassword),
    lastLoginAt: null,
  };
}

function assertPasswordNotPersonal(
  password: string,
  account: { name: string; email: string }
): void {
  const parsed = passwordSchema.safeParse(password);
  if (!parsed.success) {
    throw ApiError.validation({
      newPassword: parsed.error.issues.map((issue) => issue.message),
    });
  }

  const lower = password.toLowerCase();
  const localPart = account.email.split("@")[0]?.toLowerCase() ?? "";
  const nameParts = account.name.toLowerCase().split(/\s+/).filter((part) => part.length >= 4);

  if (localPart.length >= 4 && lower.includes(localPart)) {
    throw ApiError.validation({ newPassword: ["Password must not contain your email address."] });
  }
  if (nameParts.some((part) => lower.includes(part))) {
    throw ApiError.validation({ newPassword: ["Password must not contain your name."] });
  }
}

export const authService = {
  /**
   * Verifies credentials and opens a session.
   *
   * Failure modes are deliberately indistinguishable to the caller: unknown
   * email, wrong password and a malformed hash all produce "Invalid email or
   * password." A dummy verification runs for unknown emails so response timing
   * cannot be used to enumerate accounts.
   */
  async login(input: { email: string; password: string }, context: RequestContext): Promise<LoginResult> {
    const user = await userRepository.findByEmailWithSecret(input.email);

    if (!user) {
      await verifyPassword(await dummyPasswordHash(), input.password);
      await auditService.record({
        action: AUDIT_ACTIONS.loginFailed,
        entityType: "Auth",
        ip: context.ip,
        requestId: context.requestId,
        metadata: { reason: "unknown_email" },
      });
      throw ApiError.invalidCredentials();
    }

    if (user.status !== "ACTIVE" || user.archivedAt) {
      await auditService.record({
        action: AUDIT_ACTIONS.loginBlocked,
        entityType: "User",
        entityId: String(user._id),
        ip: context.ip,
        requestId: context.requestId,
        metadata: { reason: "inactive_account" },
      });
      throw ApiError.forbidden("This account is inactive. Contact an owner.", "ACCOUNT_INACTIVE");
    }

    if (isLocked(user)) {
      await auditService.record({
        action: AUDIT_ACTIONS.loginBlocked,
        entityType: "User",
        entityId: String(user._id),
        actor: null,
        ip: context.ip,
        requestId: context.requestId,
        metadata: { reason: "locked", lockedUntil: user.lockedUntil?.toISOString() },
      });
      throw ApiError.locked();
    }

    const passwordOk = await verifyPassword(user.passwordHash, input.password);

    if (!passwordOk) {
      const attempts = (user.failedLoginAttempts ?? 0) + 1;
      const shouldLock = attempts >= env.LOGIN_MAX_ATTEMPTS;
      user.failedLoginAttempts = shouldLock ? 0 : attempts;
      user.lockedUntil = shouldLock ? new Date(Date.now() + env.LOGIN_LOCK_MINUTES * 60_000) : null;
      await userRepository.save(user);

      await auditService.record({
        action: AUDIT_ACTIONS.loginFailed,
        entityType: "User",
        entityId: String(user._id),
        actor: asAuditActor(user),
        ip: context.ip,
        requestId: context.requestId,
        metadata: { attempts, locked: shouldLock },
      });

      // Never tell the caller how close they are to the limit — but do tell
      // them clearly when the lock has just engaged.
      if (shouldLock) throw ApiError.locked();
      throw ApiError.invalidCredentials();
    }

    // Successful sign-in clears the failure counters.
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    user.lastLoginAt = new Date();
    await userRepository.save(user);

    const session = await sessionService.create(user, { ip: context.ip, userAgent: context.userAgent });

    await auditService.record({
      action: AUDIT_ACTIONS.loginSucceeded,
      entityType: "User",
      entityId: String(user._id),
      actor: asAuditActor(user),
      ip: context.ip,
      requestId: context.requestId,
    });

    return {
      user: toSessionUser(user),
      token: session.token,
      csrfToken: session.csrfToken,
      expiresAt: session.expiresAt,
    };
  },

  async logout(context: AuthContext, requestContext: RequestContext, rawToken: string): Promise<void> {
    await sessionService.revoke(rawToken, "logout");
    await auditService.record({
      action: AUDIT_ACTIONS.logout,
      entityType: "Session",
      entityId: context.session.id,
      actor: context.user,
      ip: requestContext.ip,
      requestId: requestContext.requestId,
    });
  },

  /**
   * Self-service password change. Every other session is revoked so a stolen
   * cookie dies the moment the owner rotates their password.
   */
  async changePassword(
    context: AuthContext,
    input: { currentPassword: string; newPassword: string; confirmPassword: string },
    requestContext: RequestContext
  ): Promise<void> {
    changePasswordSchema.parse(input);

    const user = await userRepository.findByIdWithSecret(context.user.id);
    if (!user) throw ApiError.unauthorized();

    const currentOk = await verifyPassword(user.passwordHash, input.currentPassword);
    if (!currentOk) {
      throw ApiError.validation({ currentPassword: ["Your current password is incorrect."] });
    }

    if (await verifyPassword(user.passwordHash, input.newPassword)) {
      throw ApiError.validation({ newPassword: ["Choose a password you have not used before."] });
    }

    assertPasswordNotPersonal(input.newPassword, { name: user.name, email: user.email });

    user.passwordHash = await hashPassword(input.newPassword);
    user.passwordChangedAt = new Date();
    user.mustChangePassword = false;
    await userRepository.save(user);

    // Every session dies with the old password — including the one making the
    // change, so the client must sign in again with the new credentials.
    const revoked = await sessionService.revokeAllForUser(String(user._id), "password_changed");

    await auditService.record({
      action: AUDIT_ACTIONS.passwordChanged,
      entityType: "User",
      entityId: String(user._id),
      actor: context.user,
      ip: requestContext.ip,
      requestId: requestContext.requestId,
      metadata: { sessionsRevoked: revoked },
    });
  },

  /**
   * Starts a password reset. The response is identical whether or not the
   * account exists; the raw token is returned to the caller only so the email
   * integration can deliver it.
   */
  async requestPasswordReset(
    email: string,
    requestContext: RequestContext
  ): Promise<{ token: string; user: { id: string; name: string; email: string } | null }> {
    const user = await userRepository.findByEmailWithSecret(email);

    if (!user || user.status !== "ACTIVE") {
      await auditService.record({
        action: AUDIT_ACTIONS.passwordResetRequested,
        entityType: "Auth",
        ip: requestContext.ip,
        requestId: requestContext.requestId,
        metadata: { accountFound: false },
      });
      return { token: "", user: null };
    }

    const token = generateToken(32);
    user.resetTokenHash = hashToken(token);
    user.resetTokenExpiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    user.resetTokenUsedAt = null;
    await userRepository.save(user);

    await auditService.record({
      action: AUDIT_ACTIONS.passwordResetRequested,
      entityType: "User",
      entityId: String(user._id),
      actor: asAuditActor(user),
      ip: requestContext.ip,
      requestId: requestContext.requestId,
    });

    return { token, user: { id: String(user._id), name: user.name, email: user.email } };
  },

  /** Completes a reset. Tokens are single-use and expire in 30 minutes. */
  async resetPassword(
    input: { token: string; newPassword: string; confirmPassword: string },
    requestContext: RequestContext
  ): Promise<{ email: string }> {
    const user = await userRepository.findByResetTokenHash(hashToken(input.token));
    if (!user) {
      throw ApiError.badRequest("This reset link is invalid or has expired. Please request a new one.");
    }

    assertPasswordNotPersonal(input.newPassword, { name: user.name, email: user.email });

    user.passwordHash = await hashPassword(input.newPassword);
    user.passwordChangedAt = new Date();
    user.mustChangePassword = false;
    user.resetTokenUsedAt = new Date();
    user.resetTokenHash = null;
    user.resetTokenExpiresAt = null;
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    await userRepository.save(user);

    const revoked = await sessionService.revokeAllForUser(String(user._id), "password_reset");

    await auditService.record({
      action: AUDIT_ACTIONS.passwordResetCompleted,
      entityType: "User",
      entityId: String(user._id),
      ip: requestContext.ip,
      requestId: requestContext.requestId,
      metadata: { sessionsRevoked: revoked },
    });

    logger.info("Password reset completed", { userId: String(user._id) });
    return { email: user.email };
  },

  /** Administrative reset — issues a temporary password for another user. */
  async setTemporaryPassword(
    targetUserId: string,
    temporaryPassword: string,
    actor: AuthContext,
    requestContext: RequestContext,
    forceChange = true
  ): Promise<void> {
    const parsed = passwordSchema.safeParse(temporaryPassword);
    if (!parsed.success) {
      throw ApiError.validation({ temporaryPassword: parsed.error.issues.map((issue) => issue.message) });
    }

    const user = await userRepository.findByIdWithSecret(targetUserId);
    if (!user) throw ApiError.notFound("That user no longer exists.");

    user.passwordHash = await hashPassword(temporaryPassword);
    user.mustChangePassword = forceChange;
    user.passwordChangedAt = new Date();
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    user.resetTokenHash = null;
    user.resetTokenExpiresAt = null;
    await userRepository.save(user);

    // A password change invalidates every existing session for that account.
    await sessionService.revokeAllForUser(targetUserId, "admin_password_reset");

    await auditService.record({
      action: AUDIT_ACTIONS.userPasswordReset,
      entityType: "User",
      entityId: targetUserId,
      actor: actor.user,
      ip: requestContext.ip,
      requestId: requestContext.requestId,
      metadata: { forceChange },
    });
  },

  /** Used by the seed script and admin-created accounts. */
  async createUserWithPassword(input: {
    name: string;
    email: string;
    role: Role;
    password: string;
    createdBy?: string | null;
    mustChangePassword?: boolean;
  }): Promise<UserDocument> {
    const passwordHash = await hashPassword(input.password);
    return userRepository.create({
      name: input.name,
      email: input.email,
      role: input.role,
      passwordHash,
      mustChangePassword: input.mustChangePassword ?? true,
      createdBy: input.createdBy ?? null,
    });
  },
};
