import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { logger } from "@/utils/logger";

/**
 * Assigns a request id, echoes it back in the response headers, and logs one
 * line per request. Only method, route template, status and duration are
 * logged — never query strings or bodies, which can contain customer details.
 */
export function requestContext(req: Request, res: Response, next: NextFunction): void {
  const existing = req.headers["x-request-id"];
  const id = typeof existing === "string" && existing.length <= 60 ? existing : randomUUID();

  req.requestId = id;
  res.setHeader("X-Request-Id", id);

  const startedAt = process.hrtime.bigint();

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    // Express exposes the matched route template; fall back to the path.
    const route = req.route?.path ? String(req.route.path) : req.path;

    const level = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";
    logger[level]("request", {
      requestId: id,
      method: req.method,
      route,
      status: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
    });
  });

  next();
}
