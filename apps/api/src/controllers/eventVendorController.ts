import type { Request, Response } from "express";
import type {
  CreateVendorAssignmentInput,
  CreateVendorPaymentInput,
  UpdateVendorAssignmentInput,
} from "@bandhan/shared";
import { eventVendorService } from "@/services/eventVendorService";
import type { AuthContext } from "@/types/auth";
import { ApiError } from "@/utils/ApiError";
import { clientIp, pathParam, requestId, sendSuccess } from "@/utils/http";

/**
 * The vendor side of an event. Mounted under `/events/:eventId/vendors` so the
 * event is part of the address — an assignment has no meaning without one.
 */

function requireAuthContext(req: Request): AuthContext {
  if (!req.auth) throw ApiError.unauthorized("Please sign in to continue.", "SESSION_REQUIRED");
  return req.auth;
}

function context(req: Request) {
  return { ip: clientIp(req), requestId: requestId(req) };
}

export const eventVendorController = {
  /** GET /events/:eventId/vendors */
  async list(req: Request, res: Response): Promise<void> {
    sendSuccess(res, await eventVendorService.listForEvent(pathParam(req, "eventId")));
  },

  /** POST /events/:eventId/vendors */
  async assign(req: Request, res: Response): Promise<void> {
    const auth = requireAuthContext(req);
    const assignment = await eventVendorService.assign(
      pathParam(req, "eventId"),
      req.body as CreateVendorAssignmentInput,
      auth,
      context(req)
    );
    sendSuccess(res, assignment, 201);
  },

  /** PATCH /events/:eventId/vendors/:assignmentId */
  async update(req: Request, res: Response): Promise<void> {
    const auth = requireAuthContext(req);
    const assignment = await eventVendorService.updateAssignment(
      pathParam(req, "eventId"),
      pathParam(req, "assignmentId"),
      req.body as UpdateVendorAssignmentInput,
      auth,
      context(req)
    );
    sendSuccess(res, assignment);
  },

  /** DELETE /events/:eventId/vendors/:assignmentId */
  async remove(req: Request, res: Response): Promise<void> {
    const auth = requireAuthContext(req);
    sendSuccess(
      res,
      await eventVendorService.removeAssignment(
        pathParam(req, "eventId"),
        pathParam(req, "assignmentId"),
        auth,
        context(req)
      )
    );
  },

  /** POST /events/:eventId/vendors/:assignmentId/payments */
  async recordPayment(req: Request, res: Response): Promise<void> {
    const auth = requireAuthContext(req);
    const payment = await eventVendorService.recordPayment(
      pathParam(req, "eventId"),
      pathParam(req, "assignmentId"),
      req.body as CreateVendorPaymentInput,
      auth,
      context(req)
    );
    sendSuccess(res, payment, 201);
  },

  /** GET /events/:eventId/vendor-payments */
  async payments(req: Request, res: Response): Promise<void> {
    sendSuccess(res, await eventVendorService.paymentsForEvent(pathParam(req, "eventId")));
  },
};
