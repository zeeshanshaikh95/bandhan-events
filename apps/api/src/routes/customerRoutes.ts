import { Router } from "express";
import { customerCreateSchema, customerListQuerySchema, customerUpdateSchema } from "@bandhan/shared";
import { customerController } from "@/controllers/customerController";
import { requireAuth, requirePasswordChanged } from "@/middleware/authenticate";
import { requirePermission } from "@/middleware/authorize";
import { requireCsrf } from "@/middleware/csrf";
import { writeLimiter } from "@/middleware/rateLimit";
import { validate } from "@/middleware/validate";
import { asyncHandler } from "@/utils/http";

/**
 * Customers. Same gauntlet as every other write route:
 * session → password-change gate → permission → CSRF → rate limit → validation.
 */
export const customerRoutes = Router();

customerRoutes.use(requireAuth, requirePasswordChanged);

customerRoutes.get(
  "/",
  requirePermission("customers:read"),
  validate(customerListQuerySchema, "query"),
  asyncHandler(customerController.list)
);

customerRoutes.get("/:id", requirePermission("customers:read"), asyncHandler(customerController.get));

customerRoutes.post(
  "/",
  writeLimiter,
  requirePermission("customers:write"),
  requireCsrf,
  validate(customerCreateSchema),
  asyncHandler(customerController.create)
);

customerRoutes.patch(
  "/:id",
  writeLimiter,
  requirePermission("customers:write"),
  requireCsrf,
  validate(customerUpdateSchema),
  asyncHandler(customerController.update)
);
