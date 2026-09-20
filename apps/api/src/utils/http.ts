import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { Paginated } from "@bandhan/shared";

/**
 * Wraps an async handler so a rejected promise reaches the error middleware
 * instead of becoming an unhandled rejection.
 */
export function asyncHandler<T extends RequestHandler>(handler: T): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

/** Best-effort client IP, honouring the configured proxy trust. */
export function clientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0]!.trim();
  }
  return req.ip ?? "unknown";
}

export function requestId(req: Request): string {
  return (req as RequestWithContext).requestId ?? "unknown";
}

/** Request shape after the request-context middleware has run. */
export interface RequestWithContext extends Request {
  requestId?: string;
}

export function buildPaginated<T>(items: T[], total: number, page: number, limit: number): Paginated<T> {
  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

/**
 * Reads a route parameter as a plain string. Express types a param as
 * `string | string[]`, which is noise in every controller.
 */
export function pathParam(req: Request, key: string): string {
  const value = (req.params as Record<string, string | string[] | undefined>)[key];
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

/** Small helper so controllers stay free of response shaping details. */
export function sendSuccess<T>(res: Response, data: T, statusCode = 200): void {
  res.status(statusCode).json({ success: true, data });
}

export type { NextFunction, Request, Response };
