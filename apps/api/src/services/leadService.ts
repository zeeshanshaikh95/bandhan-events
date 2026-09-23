import { Types } from "mongoose";
import type {
  DashboardStats,
  LeadDto,
  LeadListQuery,
  Paginated,
  StageConfiguration,
} from "@bandhan/shared";
import type { LeadDocument } from "@/models/Lead";
import { leadRepository } from "@/repositories/leadRepository";
import { AUDIT_ACTIONS, auditService } from "@/services/auditService";
import { syncService } from "@/services/syncService";
import type { AuthContext } from "@/types/auth";
import { ApiError } from "@/utils/ApiError";
import { buildPaginated } from "@/utils/http";

/** Mongoose returns either an id or a populated document here. */
type PopulatedUser = { _id?: unknown; name?: string; email?: string } | null;

export function toLeadDto(lead: LeadDocument): LeadDto {
  const assigned = lead.assignedTo as unknown as PopulatedUser;

  return {
    id: String(lead._id),
    name: lead.name,
    phone: lead.phone,
    email: lead.email ?? undefined,
    eventType: lead.eventType,
    eventDate: lead.eventDate ? lead.eventDate.toISOString() : null,
    guestCount: lead.guestCount ?? null,
    serviceRequired: lead.serviceRequired,
    budget: lead.budget ?? null,
    message: lead.message ?? "",
    source: lead.source,
    status: lead.status,
    assignedTo:
      assigned && typeof assigned === "object" && assigned.name
        ? { id: String(assigned._id ?? ""), name: assigned.name }
        : null,
    notes: (lead.notes ?? []).map((note) => ({
      id: String(note._id),
      body: note.body,
      authorName: note.authorName,
      authorId: note.author ? String(note.author) : null,
      createdAt: (note.createdAt as Date).toISOString(),
    })),
    nextFollowUpAt: lead.nextFollowUpAt ? lead.nextFollowUpAt.toISOString() : null,
    lostReason: lead.lostReason ?? null,
    pagePath: lead.pagePath ?? null,
    stageConfiguration: (lead.stageConfiguration as StageConfiguration | null) ?? null,
    createdAt: (lead.createdAt as Date).toISOString(),
    updatedAt: (lead.updatedAt as Date).toISOString(),
  };
}

export const leadService = {
  /**
   * Public website enquiry → Lead. The source is always set server-side, never
   * trusted from the payload, so attribution cannot be spoofed from the form.
   */
  async createFromEnquiry(
    input: {
      name: string;
      phone: string;
      email: string;
      eventType: string;
      eventDate?: string;
      guestCount?: number;
      serviceRequired: string;
      budget?: string;
      message?: string;
      pagePath?: string;
      stageConfiguration?: StageConfiguration;
    },
    context: { ip: string; requestId: string }
  ): Promise<LeadDto> {
    const lead = await leadRepository.create({
      name: input.name,
      phone: input.phone,
      email: input.email,
      eventType: input.eventType,
      eventDate: input.eventDate ? new Date(`${input.eventDate}T00:00:00.000Z`) : undefined,
      guestCount: input.guestCount,
      serviceRequired: input.serviceRequired,
      budget: input.budget,
      message: input.message,
      pagePath: input.pagePath,
      stageConfiguration: input.stageConfiguration,
      source: "website",
      status: "NEW",
    });

    await auditService.record({
      action: AUDIT_ACTIONS.publicEnquiryReceived,
      entityType: "Lead",
      entityId: String(lead._id),
      ip: context.ip,
      requestId: context.requestId,
      metadata: {
        eventType: input.eventType,
        serviceRequired: input.serviceRequired,
        ...(input.stageConfiguration ? { stageBuilder: true } : {}),
      },
    });

    // Sync to Google Sheets (non-blocking — failures logged but don't block the response)
    syncService.syncLead(lead).catch(() => {});

    return toLeadDto(lead);
  },

  async createManual(
    input: Parameters<typeof leadRepository.create>[0],
    actor: AuthContext,
    context: { ip: string; requestId: string }
  ): Promise<LeadDto> {
    const lead = await leadRepository.create(input);
    await auditService.record({
      action: AUDIT_ACTIONS.leadCreated,
      entityType: "Lead",
      entityId: String(lead._id),
      actor: actor.user,
      ip: context.ip,
      requestId: context.requestId,
      metadata: { source: input.source },
    });

    // Sync to Google Sheets (non-blocking — failures logged but don't block the response)
    syncService.syncLead(lead).catch(() => {});

    return toLeadDto(lead);
  },

  async list(query: LeadListQuery): Promise<Paginated<LeadDto>> {
    const { items, total } = await leadRepository.list(query);
    return buildPaginated(items.map(toLeadDto), total, query.page, query.limit);
  },

  async getById(id: string): Promise<LeadDto> {
    const lead = await leadRepository.findByIdWithNotes(id);
    if (!lead) throw ApiError.notFound("That enquiry could not be found.");
    return toLeadDto(lead);
  },

  async update(
    id: string,
    patch: Record<string, unknown>,
    actor: AuthContext,
    context: { ip: string; requestId: string }
  ): Promise<LeadDto> {
    const update: Record<string, unknown> = { ...patch };

    if (typeof update.assignedTo === "string") update.assignedTo = new Types.ObjectId(update.assignedTo as string);
    if (update.eventDate && typeof update.eventDate === "string") {
      update.eventDate = new Date(`${update.eventDate}T00:00:00.000Z`);
    }

    const lead = await leadRepository.updateById(id, update);
    if (!lead) throw ApiError.notFound("That enquiry could not be found.");

    await auditService.record({
      action: AUDIT_ACTIONS.leadUpdated,
      entityType: "Lead",
      entityId: id,
      actor: actor.user,
      ip: context.ip,
      requestId: context.requestId,
      // Field names only — never the values, which may be customer data.
      metadata: { fields: Object.keys(patch) },
    });

    // Sync to Google Sheets (non-blocking)
    syncService.syncLead(lead).catch(() => {});

    return toLeadDto(lead);
  },

  async addNote(
    id: string,
    body: string,
    actor: AuthContext,
    context: { ip: string; requestId: string }
  ): Promise<LeadDto> {
    const lead = await leadRepository.addNote(id, {
      body,
      author: new Types.ObjectId(actor.user.id),
      authorName: actor.user.name,
    });
    if (!lead) throw ApiError.notFound("That enquiry could not be found.");

    await auditService.record({
      action: AUDIT_ACTIONS.leadNoteAdded,
      entityType: "Lead",
      entityId: id,
      actor: actor.user,
      ip: context.ip,
      requestId: context.requestId,
    });

    return toLeadDto(lead);
  },

  async archive(id: string, actor: AuthContext, context: { ip: string; requestId: string }): Promise<void> {
    const lead = await leadRepository.archiveById(id);
    if (!lead) throw ApiError.notFound("That enquiry could not be found.");

    await auditService.record({
      action: AUDIT_ACTIONS.leadArchived,
      entityType: "Lead",
      entityId: id,
      actor: actor.user,
      ip: context.ip,
      requestId: context.requestId,
    });
  },

  /**
   * Dashboard counters. Anything that depends on a module that does not exist
   * yet (bookings, events) reports zero rather than a fabricated number.
   */
  async dashboardStats(): Promise<DashboardStats> {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);

    const [todaysEnquiries, byStatus, bySource, followUpsDue, recent] = await Promise.all([
      leadRepository.countCreatedSince(startOfToday),
      leadRepository.countByStatus(),
      leadRepository.countBySource(),
      leadRepository.countFollowUpsDue(endOfToday),
      leadRepository.recent(5),
    ]);

    const leadsByStatus = Object.fromEntries(byStatus.map((row) => [row._id, row.count]));
    const leadsBySource = Object.fromEntries(bySource.map((row) => [row._id, row.count]));
    const totalLeads = byStatus.reduce((sum, row) => sum + row.count, 0);

    return {
      todaysEnquiries,
      newLeads: leadsByStatus.NEW ?? 0,
      totalLeads,
      followUpsDue,
      leadsByStatus,
      leadsBySource,
      // TODO: driven by the bookings module once it exists. Zero, not invented.
      upcomingEvents: 0,
      confirmedBookings: 0,
      recentLeads: recent.map(toLeadDto),
    };
  },
};
