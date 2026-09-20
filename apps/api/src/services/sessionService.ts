import type { SessionUser } from "@bandhan/shared";
import { permissionsForRole } from "@bandhan/shared";
import { env } from "@/config/env";
import { sessionRepository } from "@/repositories/sessionRepository";
import { userRepository } from "@/repositories/userRepository";
import type { UserDocument } from "@/models/User";
import type { AuthContext, AuthUser } from "@/types/auth";
import { generateToken, hashToken } from "@/utils/crypto";
import { logger } from "@/utils/logger";

/** Rolling session lifetime: absolute cap plus an idle timeout. */
const SESSION_TTL_MS = env.SESSION_TTL_HOURS * 60 * 60 * 1000;
const IDLE_TIMEOUT_MS = env.SESSION_IDLE_TIMEOUT_MINUTES * 60 * 1000;

/** Project a user document into the shape sent to clients. */
export function toSessionUser(user: UserDocument): SessionUser {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    permissions: [...permissionsForRole(user.role)],
    mustChangePassword: Boolean(user.mustChangePassword),
    lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
  };
}

function toAuthUser(user: UserDocument): AuthUser {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    permissions: [...permissionsForRole(user.role)],
    mustChangePassword: Boolean(user.mustChangePassword),
    lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
  };
}

export const sessionService = {
  /**
   * Issues a new session. The caller receives the raw token once (it goes
   * straight into the httpOnly cookie); only its digest is persisted.
   */
  async create(
    user: UserDocument,
    context: { ip: string; userAgent: string }
  ): Promise<{ token: string; csrfToken: string; expiresAt: Date }> {
    const token = generateToken(32);
    const csrfToken = generateToken(24);
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    await sessionRepository.create({
      userId: String(user._id),
      tokenHash: hashToken(token),
      csrfTokenHash: hashToken(csrfToken),
      expiresAt,
      ip: context.ip,
      userAgent: context.userAgent.slice(0, 300),
    });

    return { token, csrfToken, expiresAt };
  },

  /** Resolves a raw cookie token into an authenticated context, or null. */
  async resolve(token: string): Promise<AuthContext | null> {
    if (!token) return null;

    const session = await sessionRepository.findLiveByTokenHash(hashToken(token));
    if (!session) return null;

    const idleDeadline = session.lastUsedAt.getTime() + IDLE_TIMEOUT_MS;
    if (idleDeadline < Date.now()) {
      await sessionRepository.revokeByTokenHash(hashToken(token), "idle_timeout");
      return null;
    }

    // The session document stores only the user id; load the account fresh so
    // a deactivated or re-roled user is reflected on the very next request.
    const user = await userRepository.findById(String(session.user));
    if (!user || user.status !== "ACTIVE") {
      await sessionRepository.revokeByTokenHash(hashToken(token), "user_inactive");
      return null;
    }

    // Refresh the idle clock at most once a minute to avoid a write per request.
    if (Date.now() - session.lastUsedAt.getTime() > 60_000) {
      sessionRepository.touch(String(session._id)).catch((error) => {
        logger.warn("Session touch failed", { message: (error as Error).message });
      });
    }

    return {
      user: toAuthUser(user),
      session: {
        id: String(session._id),
        tokenHash: session.tokenHash,
        csrfTokenHash: session.csrfTokenHash,
        expiresAt: session.expiresAt,
      },
    };
  },

  async revoke(token: string, reason: string): Promise<boolean> {
    if (!token) return false;
    return sessionRepository.revokeByTokenHash(hashToken(token), reason);
  },

  async revokeAllForUser(userId: string, reason: string, exceptToken?: string): Promise<number> {
    return sessionRepository.revokeAllForUser(userId, reason, exceptToken ? hashToken(exceptToken) : undefined);
  },

  async activeSessionCount(userId: string): Promise<number> {
    return sessionRepository.countActiveForUser(userId);
  },
};
