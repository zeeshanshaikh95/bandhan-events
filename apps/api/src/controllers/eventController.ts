import type { Request, Response } from "express";
import { eventService } from "@/services/eventService";
import { validatedQuery } from "@/middleware/validate";
import { pathParam, sendSuccess } from "@/utils/http";
import { ApiError } from "@/utils/ApiError";
import type { AuthContext } from "@/types/auth";
import {
  createEventSchema,
  updateEventSchema,
  addEventNoteSchema,
  type EventListQuery,
} from "@bandhan/shared";

function requireAuthContext(req: Request): AuthContext {
  if (!req.auth) throw ApiError.unauthorized("Please sign in to continue.", "SESSION_REQUIRED");
  return req.auth;
}

function context(req: Request) {
  return { ip: req.ip || "unknown", requestId: (req as any).requestId || "unknown" };
}

export const eventController = {
  // ── CRUD ──────────────────────────────────────────────────────────────────

  async list(req: Request, res: Response): Promise<void> {
    const query = validatedQuery<EventListQuery>(req);
    const result = await eventService.list(query);
    sendSuccess(res, result);
  },

  async get(req: Request, res: Response): Promise<void> {
    const id = pathParam(req, "id");
    const event = await eventService.getById(id);
    sendSuccess(res, event);
  },

  async create(req: Request, res: Response): Promise<void> {
    const auth = requireAuthContext(req);
    const input = createEventSchema.parse(req.body);
    const event = await eventService.create(input, auth, context(req));
    sendSuccess(res, event, 201);
  },

  async update(req: Request, res: Response): Promise<void> {
    const auth = requireAuthContext(req);
    const id = pathParam(req, "id");
    const input = updateEventSchema.parse(req.body);
    const event = await eventService.update(id, input, auth, context(req));
    sendSuccess(res, event);
  },

  async archive(req: Request, res: Response): Promise<void> {
    const auth = requireAuthContext(req);
    const id = pathParam(req, "id");
    await eventService.archive(id, auth, context(req));
    sendSuccess(res, { archived: true });
  },

  // ── Status ────────────────────────────────────────────────────────────────

  async updateStatus(req: Request, res: Response): Promise<void> {
    const auth = requireAuthContext(req);
    const id = pathParam(req, "id");
    const { status } = req.body as { status: string };
    if (!status) throw ApiError.badRequest("Status is required.");
    const event = await eventService.updateStatus(id, status, auth, context(req));
    sendSuccess(res, event);
  },

  // ── Financials ────────────────────────────────────────────────────────────

  async financials(req: Request, res: Response): Promise<void> {
    const id = pathParam(req, "id");
    const financials = await eventService.getFinancials(id);
    sendSuccess(res, financials);
  },

  // ── Notes ─────────────────────────────────────────────────────────────────

  async addNote(req: Request, res: Response): Promise<void> {
    const auth = requireAuthContext(req);
    const id = pathParam(req, "id");
    const { body } = addEventNoteSchema.parse(req.body);
    const event = await eventService.addNote(id, body, auth, context(req));
    sendSuccess(res, event, 201);
  },

  // ── Calendar ──────────────────────────────────────────────────────────────

  async calendar(req: Request, res: Response): Promise<void> {
    const { start, end } = req.query as { start?: string; end?: string };
    const startDate = start ? new Date(start) : new Date();
    const endDate = end ? new Date(end) : new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    const events = await eventService.calendar(startDate, endDate);
    sendSuccess(res, events);
  },

  // ── Upcoming ──────────────────────────────────────────────────────────────

  async upcoming(req: Request, res: Response): Promise<void> {
    const days = parseInt(req.query.days as string) || 30;
    const events = await eventService.upcoming(days);
    sendSuccess(res, events);
  },

  // ── Dashboard Stats ───────────────────────────────────────────────────────

  async dashboardStats(_req: Request, res: Response): Promise<void> {
    const stats = await eventService.dashboardStats();
    sendSuccess(res, stats);
  },
};
