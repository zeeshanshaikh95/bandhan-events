import type { Request, Response } from "express";
import type { LeadCreateInput, LeadListQuery, LeadUpdateInput } from "@bandhan/shared";
import { leadService } from "@/services/leadService";
import type { AuthContext } from "@/types/auth";
import { ApiError } from "@/utils/ApiError";
import { clientIp, pathParam, requestId, sendSuccess } from "@/utils/http";
import { validatedQuery } from "@/middleware/validate";

function context(req: Request) {
  return { ip: clientIp(req), requestId: requestId(req) };
}

function requireAuthContext(req: Request): AuthContext {
  if (!req.auth) throw ApiError.unauthorized("Please sign in to continue.", "SESSION_REQUIRED");
  return req.auth;
}

export const leadController = {
  /** GET /leads */
  async list(req: Request, res: Response): Promise<void> {
    const query = validatedQuery<LeadListQuery>(req);
    const result = await leadService.list(query);
    sendSuccess(res, result);
  },

  /** GET /leads/:id */
  async get(req: Request, res: Response): Promise<void> {
    sendSuccess(res, await leadService.getById(pathParam(req, "id")));
  },

  /** POST /leads — staff-created enquiry. */
  async create(req: Request, res: Response): Promise<void> {
    const auth = requireAuthContext(req);
    const input = req.body as LeadCreateInput;

    const lead = await leadService.createManual(
      {
        name: input.name,
        phone: input.phone,
        email: input.email,
        eventType: input.eventType,
        eventDate: input.eventDate ? new Date(`${input.eventDate}T00:00:00.000Z`) : undefined,
        guestCount: input.guestCount,
        serviceRequired: input.serviceRequired,
        budget: input.budget,
        message: input.message,
        source: input.source,
        status: input.status,
        assignedTo: input.assignedTo,
        nextFollowUpAt: input.nextFollowUpAt,
      },
      auth,
      context(req)
    );

    sendSuccess(res, lead, 201);
  },

  /** PATCH /leads/:id */
  async update(req: Request, res: Response): Promise<void> {
    const auth = requireAuthContext(req);
    const lead = await leadService.update(pathParam(req, "id"), req.body as LeadUpdateInput, auth, context(req));
    sendSuccess(res, lead);
  },

  /** POST /leads/:id/notes */
  async addNote(req: Request, res: Response): Promise<void> {
    const auth = requireAuthContext(req);
    const { body } = req.body as { body: string };
    const lead = await leadService.addNote(pathParam(req, "id"), body, auth, context(req));
    sendSuccess(res, lead, 201);
  },

  /** DELETE /leads/:id — archives rather than destroys business history. */
  async archive(req: Request, res: Response): Promise<void> {
    const auth = requireAuthContext(req);
    await leadService.archive(pathParam(req, "id"), auth, context(req));
    sendSuccess(res, { archived: true });
  },
};
