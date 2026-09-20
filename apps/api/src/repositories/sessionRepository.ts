import type { SessionDocument } from "@/models/Session";
import { Session } from "@/models/Session";

interface CreateSessionInput {
  userId: string;
  tokenHash: string;
  csrfTokenHash: string;
  expiresAt: Date;
  ip: string;
  userAgent: string;
}

export const sessionRepository = {
  async create(input: CreateSessionInput): Promise<SessionDocument> {
    return Session.create({
      user: input.userId,
      tokenHash: input.tokenHash,
      csrfTokenHash: input.csrfTokenHash,
      expiresAt: input.expiresAt,
      ip: input.ip,
      userAgent: input.userAgent,
    });
  },

  /** Only live sessions resolve; revoked or expired ones read as absent. */
  async findLiveByTokenHash(tokenHash: string): Promise<SessionDocument | null> {
    return Session.findOne({
      tokenHash,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    }).select("+tokenHash +csrfTokenHash");
  },

  async touch(id: string): Promise<void> {
    await Session.updateOne({ _id: id }, { $set: { lastUsedAt: new Date() } });
  },

  async revokeByTokenHash(tokenHash: string, reason: string): Promise<boolean> {
    const result = await Session.updateOne(
      { tokenHash, revokedAt: null },
      { $set: { revokedAt: new Date(), revokedReason: reason } }
    );
    return result.modifiedCount > 0;
  },

  /**
   * Used on password change: every session dies, optionally keeping the one
   * making the change so the person is not thrown back to the login screen.
   */
  async revokeAllForUser(userId: string, reason: string, exceptTokenHash?: string): Promise<number> {
    const query: Record<string, unknown> = { user: userId, revokedAt: null };
    if (exceptTokenHash) query.tokenHash = { $ne: exceptTokenHash };
    const result = await Session.updateMany(query, {
      $set: { revokedAt: new Date(), revokedReason: reason },
    });
    return result.modifiedCount;
  },

  async countActiveForUser(userId: string): Promise<number> {
    return Session.countDocuments({ user: userId, revokedAt: null, expiresAt: { $gt: new Date() } });
  },
};
