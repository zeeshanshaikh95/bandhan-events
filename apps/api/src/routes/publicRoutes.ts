import { Router } from "express";
import { enquirySchema } from "@bandhan/shared";
import { publicController } from "@/controllers/publicController";
import { enquiryLimiter } from "@/middleware/rateLimit";
import { validate } from "@/middleware/validate";
import { asyncHandler } from "@/utils/http";

/**
 * Unauthenticated endpoints. Both are hardened differently:
 *  - settings is a read: cached, cheap, no rate limiter needed beyond the API
 *    ceiling applied globally;
 *  - the enquiry write is rate limited per IP, validated by the shared Zod
 *    schema, honeypot-checked and always recorded in the audit log.
 */
export const publicRoutes = Router();

publicRoutes.get("/settings", asyncHandler(publicController.settings));

publicRoutes.post(
  "/enquiries",
  enquiryLimiter,
  validate(enquirySchema),
  asyncHandler(publicController.createEnquiry)
);
