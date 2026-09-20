import type { NextFunction, Request, Response } from "express";
import type { Permission, Role } from "@bandhan/shared";
import { isOwnerRole, permissionsForRole, roleHasPermission } from "@bandhan/shared";
import { AUDIT_ACTIONS, auditService } from "@/services/auditService";
import { ApiError } from "@/utils/ApiError";
import { clientIp, requestId } from "@/utils/http";

/**
 * ---------------------------------------------------------------------------
 * AUTHORIZATION
 * ---------------------------------------------------------------------------
 * Permissions are read from the shared ROLE_PERMISSIONS matrix and always
 * evaluated on the server. Hiding a button in the dashboard is a UX detail;
 * this middleware is what actually stops the request.
 *
 * Every denial is written to the audit log, so a manager poking at owner-only
 * endpoints leaves a trail.
 */
export function requirePermission(permission: Permission) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const auth = req.auth;
    if (!auth) {
      return next(ApiError.unauthorized("Please sign in to continue.", "SESSION_REQUIRED"));
    }

    // Re-derive from the matrix rather than trusting the permissions embedded
    // in the request context — the role is the single source of truth.
    const allowed = roleHasPermission(auth.user.role, permission);
    if (allowed) return next();

    await auditService.record({
      action: AUDIT_ACTIONS.accessDenied,
      entityType: "Permission",
      entityId: permission,
      actor: auth.user,
      ip: clientIp(req),
      requestId: requestId(req),
      metadata: { method: req.method, path: req.originalUrl },
    });

    return next(ApiError.forbidden());
  };
}

/** Restricts a route to specific roles (used for ownership-level operations). */
export function requireRole(...roles: Role[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const auth = req.auth;
    if (!auth) {
      return next(ApiError.unauthorized("Please sign in to continue.", "SESSION_REQUIRED"));
    }
    if (roles.includes(auth.user.role)) return next();

    await auditService.record({
      action: AUDIT_ACTIONS.accessDenied,
      entityType: "Role",
      entityId: roles.join(","),
      actor: auth.user,
      ip: clientIp(req),
      requestId: requestId(req),
      metadata: { method: req.method, path: req.originalUrl },
    });

    return next(ApiError.forbidden());
  };
}

/** Convenience guard for anything only the two owners may touch. */
export function requireOwner(req: Request, _res: Response, next: NextFunction): void {
  const auth = req.auth;
  if (!auth) return next(ApiError.unauthorized("Please sign in to continue.", "SESSION_REQUIRED"));
  if (isOwnerRole(auth.user.role)) return next();
  return next(ApiError.forbidden("Only owners can perform this action."));
}

/** Exposes the permission list for a role (used by the session endpoint). */
export function permissionsFor(role: Role): readonly Permission[] {
  return permissionsForRole(role);
}
