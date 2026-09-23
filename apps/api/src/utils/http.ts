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

/**
 * Client IP for audit records. Express is the single source of truth: with
 * `trust proxy` disabled (the default) `req.ip` is the socket address and any
 * X-Forwarded-For header an attacker sends is ignored; when TRUST_PROXY is
 * enabled Express picks the correct hop from the chain. Reading the header
 * directly here would let any client forge the IP written to the audit log.
 */
export function clientIp(req: Request): string {
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
