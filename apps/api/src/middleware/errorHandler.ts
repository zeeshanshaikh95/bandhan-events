import type { ErrorRequestHandler, NextFunction, Request, Response } from "express";
import { Error as MongooseError } from "mongoose";
import { ZodError } from "zod";
import { isProduction, isTest } from "@/config/env";
import { ApiError } from "@/utils/ApiError";
import { logger } from "@/utils/logger";

/** Anything unmatched under /api returns the standard failure envelope. */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: `No API route matches ${req.method} ${req.path}.`,
    },
  });
}

interface MongoDuplicateKeyError {
  code?: number;
  keyValue?: Record<string, unknown>;
}

/**
 * Single place where every failure becomes a response.
 *
 * Known error types map to friendly, stable codes. Anything else is an
 * unexpected bug: it is logged in full and answered with a generic 500, so
 * stack traces, driver messages and internal details never reach a client.
 */
export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (res.headersSent) return next(error);

  const requestIdValue = req.requestId ?? null;

  if (error instanceof ApiError) {
    const details = error.details ? { details: error.details } : {};
    res.status(error.statusCode).json({
      success: false,
      error: { code: error.code, message: error.message, ...details },
    });
    return;
  }

  if (error instanceof ZodError) {
    const details: Record<string, string[]> = {};
    for (const issue of error.issues) {
      const key = issue.path.length > 0 ? issue.path.join(".") : "form";
      details[key] = [...(details[key] ?? []), issue.message];
    }
    res.status(422).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Please check the highlighted fields.",
        details,
      },
    });
    return;
  }

  if (error instanceof MongooseError.ValidationError) {
    const details: Record<string, string[]> = {};
    for (const [field, issue] of Object.entries(error.errors)) {
      details[field] = [issue.message];
    }
    res.status(422).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Please check the highlighted fields.", details },
    });
    return;
  }

  const duplicate = error as MongoDuplicateKeyError;
  if (duplicate?.code === 11000) {
    const field = Object.keys(duplicate.keyValue ?? {})[0] ?? "record";
    res.status(409).json({
      success: false,
      error: {
        code: "DUPLICATE",
        message: `${field === "email" ? "That email address" : "That record"} is already in use.`,
      },
    });
    return;
  }

  // Unexpected: log everything server-side, reveal nothing client-side.
  logger.error("Unhandled API error", {
    requestId: requestIdValue,
    method: req.method,
    path: req.originalUrl,
    message: (error as Error)?.message,
    stack: isProduction ? undefined : (error as Error)?.stack,
  });

  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "Something went wrong on our side. Please try again.",
      ...(isTest && (error as Error)?.message ? { details: { debug: [(error as Error).message] } } : {}),
    },
  });
};
