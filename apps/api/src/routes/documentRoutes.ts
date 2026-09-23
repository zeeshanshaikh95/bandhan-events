import { Router } from "express";
import { documentController } from "@/controllers/documentController";
import { requireAuth, requirePasswordChanged } from "@/middleware/authenticate";
import { asyncHandler } from "@/utils/http";

/**
 * Document downloads.
 *
 * Deliberately gated on the session alone rather than a per-module permission:
 * a document id is an opaque ObjectId that is only ever handed out by an
 * authenticated list/detail response, and the same PDF may belong to either a
 * quotation or an invoice. Anyone who holds a session and the id is already
 * entitled to the record it came from.
 */
export const documentRoutes = Router();

documentRoutes.use(requireAuth, requirePasswordChanged);

/** The global API limiter already covers download throughput. */
documentRoutes.get("/:id", asyncHandler(documentController.download));
