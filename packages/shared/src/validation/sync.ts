import { z } from "zod";
import { paginationSchema } from "./primitives";

/**
 * Sync log filters.
 *
 * The values mirror the SyncLog model's enums. A query schema is required here
 * for the same reason as everywhere else: the controller reads its filters
 * through `validatedQuery`, so a route without this middleware hands it
 * `undefined` and the request fails.
 */

export const SYNC_LOG_MODULES = [
  "lead",
  "expense",
  "investment",
  "payment",
  "event",
  "quotation",
  "invoice",
  "vendor",
  "assignment",
] as const;

export const SYNC_LOG_STATUSES = ["pending", "success", "failed"] as const;

export const syncLogQuerySchema = paginationSchema.extend({
  module: z.enum(SYNC_LOG_MODULES).optional(),
  status: z.enum(SYNC_LOG_STATUSES).optional(),
  operation: z.enum(["create", "update", "read", "delete"]).optional(),
});

export type SyncLogQuery = z.infer<typeof syncLogQuerySchema>;
