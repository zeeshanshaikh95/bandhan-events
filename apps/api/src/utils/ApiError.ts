/**
 * Every failure the API returns on purpose is an ApiError. Anything else that
 * escapes a handler is an unexpected bug and is reported as a generic 500 —
 * internal messages and stack traces never reach clients.
 */
export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: Record<string, string[]>;
  /** Extra context for the audit log (never for the response body). */
  readonly auditMetadata?: Record<string, unknown>;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    options: { details?: Record<string, string[]>; auditMetadata?: Record<string, unknown> } = {}
  ) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = options.details;
    this.auditMetadata = options.auditMetadata;
  }

  static badRequest(message: string, details?: Record<string, string[]>): ApiError {
    return new ApiError(400, "BAD_REQUEST", message, { details });
  }

  static unauthorized(message = "You need to sign in to continue.", code = "UNAUTHENTICATED"): ApiError {
    return new ApiError(401, code, message);
  }

  /** Deliberately generic: never reveals whether an account exists. */
  static invalidCredentials(): ApiError {
    return new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
  }

  static forbidden(message = "You do not have permission to do that.", code = "FORBIDDEN"): ApiError {
    return new ApiError(403, code, message);
  }

  static notFound(message = "We could not find what you were looking for."): ApiError {
    return new ApiError(404, "NOT_FOUND", message);
  }

  static conflict(message: string, code = "CONFLICT"): ApiError {
    return new ApiError(409, code, message);
  }

  static validation(details: Record<string, string[]>, message = "Please check the highlighted fields."): ApiError {
    return new ApiError(422, "VALIDATION_ERROR", message, { details });
  }

  static tooManyRequests(message = "Too many attempts. Please try again shortly."): ApiError {
    return new ApiError(429, "RATE_LIMITED", message);
  }

  static locked(message = "This account is temporarily locked after repeated failed sign-in attempts."): ApiError {
    return new ApiError(423, "ACCOUNT_LOCKED", message);
  }

  static internal(message = "Something went wrong on our side. Please try again."): ApiError {
    return new ApiError(500, "INTERNAL_ERROR", message);
  }

  static notImplemented(feature: string): ApiError {
    return new ApiError(
      501,
      "NOT_IMPLEMENTED",
      `${feature} is not connected yet. Configure the integration before using it.`
    );
  }
}
