import type { NextFunction, Request, Response } from "express";
import { ZodError, type ZodTypeAny } from "zod";
import { ApiError } from "@/utils/ApiError";

type Source = "body" | "query" | "params";

/**
 * Parses and *replaces* the request data with the validated result, so
 * handlers only ever see sanitised, typed values. Unknown keys are stripped by
 * Zod, which is the mass-assignment guard for every write endpoint.
 *
 * Safe methods (GET/HEAD) keep their query string untouched so the parsed
 * object can be handed a fresh `validated` copy instead — Express 5 makes
 * `req.query` read-only.
 */
export function validate(schema: ZodTypeAny, source: Source = "body") {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      return next(toValidationError(result.error));
    }

    if (source === "body") {
      req.body = result.data;
    } else if (source === "params") {
      req.params = result.data as Request["params"];
    } else {
      (req as Request & { validatedQuery?: unknown }).validatedQuery = result.data;
    }

    next();
  };
}

/** Reads the parsed query attached by `validate(schema, "query")`. */
export function validatedQuery<T>(req: Request): T {
  return (req as Request & { validatedQuery?: unknown }).validatedQuery as T;
}

function toValidationError(error: ZodError): ApiError {
  const details: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "form";
    details[key] = [...(details[key] ?? []), issue.message];
  }

  return ApiError.validation(details);
}
