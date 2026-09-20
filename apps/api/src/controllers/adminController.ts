import type { Request, Response } from "express";
import type { Role, UserStatus } from "@bandhan/shared";
import { userCreateSchema, userUpdateSchema } from "@bandhan/shared";
import { leadService } from "@/services/leadService";
import { authService } from "@/services/authService";
import { auditService, AUDIT_ACTIONS } from "@/services/auditService";
import { settingService } from "@/services/settingService";
import { sessionService, toSessionUser } from "@/services/sessionService";
import { userRepository } from "@/repositories/userRepository";
import { integrationStatuses } from "@/integrations";
import type { AuthContext } from "@/types/auth";
import { ApiError } from "@/utils/ApiError";
import { clientIp, pathParam, requestId, sendSuccess } from "@/utils/http";
import { validatedQuery } from "@/middleware/validate";
import { z } from "zod";

/** The audit/auth services want the same request attribution everywhere. */
function context(req: Request) {
  return {
    ip: clientIp(req),
    userAgent: String(req.headers["user-agent"] ?? "unknown"),
    requestId: requestId(req),
  };
}

function requireAuthContext(req: Request): AuthContext {
  if (!req.auth) throw ApiError.unauthorized("Please sign in to continue.", "SESSION_REQUIRED");
  return req.auth;
}

export const dashboardController = {
  /** GET /dashboard/stats */
  async stats(_req: Request, res: Response): Promise<void> {
    sendSuccess(res, await leadService.dashboardStats());
  },

  /** GET /dashboard/integrations — honest status, never a fake "connected". */
  async integrations(_req: Request, res: Response): Promise<void> {
    sendSuccess(res, await integrationStatuses());
  },
};

export const userController = {
  /** GET /users */
  async list(req: Request, res: Response): Promise<void> {
    const query = validatedQuery<{ search?: string; role?: Role; status?: UserStatus }>(req);
    const users = await userRepository.list(query);

    sendSuccess(
      res,
      await Promise.all(
        users.map(async (user) => ({
          ...toSessionUser(user),
          activeSessions: await sessionService.activeSessionCount(String(user._id)),
          createdAt: (user.createdAt as Date).toISOString(),
        }))
      )
    );
  },

  /** POST /users — creates an account with a temporary password. */
  async create(req: Request, res: Response): Promise<void> {
    const auth = requireAuthContext(req);
    const input = userCreateSchema.parse(req.body);

    const existing = await userRepository.findByEmailWithSecret(input.email);
    if (existing) throw ApiError.conflict("An account with that email already exists.", "EMAIL_IN_USE");

    const user = await authService.createUserWithPassword({
      name: input.name,
      email: input.email,
      role: input.role,
      password: input.temporaryPassword,
      createdBy: auth.user.id,
      mustChangePassword: true,
    });

    await auditService.record({
      action: AUDIT_ACTIONS.userCreated,
      entityType: "User",
      entityId: String(user._id),
      actor: auth.user,
      ...context(req),
      metadata: { role: input.role },
    });

    sendSuccess(res, toSessionUser(user), 201);
  },

  /** PATCH /users/:id — name, role and status only. */
  async update(req: Request, res: Response): Promise<void> {
    const auth = requireAuthContext(req);
    const input = userUpdateSchema.parse(req.body);

    const target = await userRepository.findById(pathParam(req, "id"));
    if (!target) throw ApiError.notFound("That user no longer exists.");

    // An owner cannot be demoted by anyone but another owner, and nobody may
    // change their own role (that is how lock-outs and privilege escalation
    // accidents happen).
    if (String(target._id) === auth.user.id && input.role && input.role !== target.role) {
      throw ApiError.badRequest("You cannot change your own role.");
    }

    const updated = await userRepository.updateById(pathParam(req, "id"), input);
    if (!updated) throw ApiError.notFound("That user no longer exists.");

    // A role or status change must take effect immediately, not at next login.
    if (input.role || input.status === "INACTIVE") {
      await sessionService.revokeAllForUser(String(updated._id), "role_or_status_changed");
    }

    await auditService.record({
      action: AUDIT_ACTIONS.userUpdated,
      entityType: "User",
      entityId: String(updated._id),
      actor: auth.user,
      ...context(req),
      metadata: { fields: Object.keys(input) },
    });

    sendSuccess(res, toSessionUser(updated));
  },

  /** POST /users/:id/reset-password — issues a temporary password. */
  async resetPassword(req: Request, res: Response): Promise<void> {
    const auth = requireAuthContext(req);
    const { temporaryPassword, forceChange } = req.body as {
      temporaryPassword: string;
      forceChange: boolean;
    };

    await authService.setTemporaryPassword(
      pathParam(req, "id"),
      temporaryPassword,
      auth,
      context(req),
      forceChange
    );
    sendSuccess(res, { passwordReset: true, forceChange });
  },
};

export const settingsController = {
  /** GET /settings — full settings including the internal notification inbox. */
  async get(_req: Request, res: Response): Promise<void> {
    sendSuccess(res, await settingService.getBusinessSettings({ fresh: true }));
  },

  /** PUT /settings — owners and admins may edit business-facing values. */
  async update(req: Request, res: Response): Promise<void> {
    const auth = requireAuthContext(req);
    const value = await settingService.updateBusinessSettings(req.body, auth, context(req));
    sendSuccess(res, value);
  },
};

export const auditController = {
  /** GET /audit */
  async list(req: Request, res: Response): Promise<void> {
    const query = validatedQuery<{
      page: number;
      limit: number;
      action?: string;
      entityType?: string;
      actorId?: string;
    }>(req);

    sendSuccess(res, await auditService.list(query));
  },
};

/** Shared query schema builders used by the route table. */
export const auditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  action: z.string().trim().max(60).optional(),
  entityType: z.string().trim().max(40).optional(),
  actorId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
});

export { AUDIT_ACTIONS };
