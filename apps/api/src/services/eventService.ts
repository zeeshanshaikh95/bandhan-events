import { Types } from "mongoose";
import type {
  EventDto,
  EventFinancials,
  CalendarEvent,
  UpcomingEvent,
  EventListQuery,
  Paginated,
} from "@bandhan/shared";
import { eventRepository } from "@/repositories/eventRepository";
import { paymentRepository } from "@/repositories/paymentRepository";
import { expenseRepository } from "@/repositories/expenseRepository";
import { vendorPaymentRepository } from "@/repositories/vendorPaymentRepository";
import { AUDIT_ACTIONS, auditService } from "@/services/auditService";
import { syncService } from "@/services/syncService";
import type { AuthContext } from "@/types/auth";
import { ApiError } from "@/utils/ApiError";
import { buildPaginated } from "@/utils/http";

/**
 * ---------------------------------------------------------------------------
 * EVENT SERVICE
 * ---------------------------------------------------------------------------
 * Central service for all event/booking business logic.
 * Financial calculations use the existing Payment and Expense repositories.
 */

/**
 * One vendor assignment on an event.
 *
 * Exported because the vendor module renders the same records from the other
 * direction (vendor → events). One mapper means the two views can never
 * disagree about what an assignment looks like.
 *
 * `paymentStatus` is derived here rather than stored: it is the only way the
 * label and the money can be guaranteed to agree.
 */
export function toVendorAssignmentDto(raw: any, amountPaid = 0) {
  const agreedCost = raw.agreedCost || 0;
  const outstanding = Math.max(0, agreedCost - amountPaid);

  const paymentStatus =
    agreedCost > 0 && amountPaid >= agreedCost
      ? "PAID"
      : amountPaid > 0
        ? "PARTIALLY_PAID"
        : "UNPAID";

  // Where the agreed figure came from, derived from the stored numbers rather
  // than kept as a flag that could contradict them.
  const cateringCalculation =
    (raw.caterer?.guestCount || 0) * (raw.caterer?.pricePerPlate || 0);
  const costSource =
    agreedCost === 0
      ? "none"
      : raw.negotiatedCost > 0 && agreedCost === raw.negotiatedCost
        ? "negotiated"
        : cateringCalculation > 0 && agreedCost === cateringCalculation
          ? "catering-calculation"
          : "agreed";

  return {
    id: String(raw._id),
    vendor:
      raw.vendor && typeof raw.vendor === "object"
        ? {
            id: String(raw.vendor._id),
            name: raw.vendor.name ?? "",
            type: raw.vendor.type ?? "other",
            phone: raw.vendor.phone ?? raw.contactPhone ?? "",
            status: raw.vendor.status ?? "ACTIVE",
          }
        : null,
    role: raw.role || "other",
    service: raw.service || "",

    estimatedCost: raw.estimatedCost || 0,
    negotiatedCost: raw.negotiatedCost || 0,
    agreedCost,
    costSource,
    quantity: raw.quantity ?? 1,

    status: raw.status || "PLANNED",
    startTime: raw.startTime || "",
    endTime: raw.endTime || "",
    notes: raw.notes || "",
    contactPerson: raw.contactPerson || "",
    contactPhone: raw.contactPhone || "",

    expenseId: raw.expense ? String(raw.expense) : null,

    caterer: {
      guestCount: raw.caterer?.guestCount ?? null,
      packageName: raw.caterer?.packageName || "",
      pricePerPlate: raw.caterer?.pricePerPlate || 0,
      cuisine: raw.caterer?.cuisine || "",
      dietaryNotes: raw.caterer?.dietaryNotes || "",
      setupTime: raw.caterer?.setupTime || "",
      servingTime: raw.caterer?.servingTime || "",
      cleanupTime: raw.caterer?.cleanupTime || "",
      specialInstructions: raw.caterer?.specialInstructions || "",
    },

    amountPaid,
    outstanding,
    paymentStatus,

    createdAt: raw.createdAt ? new Date(raw.createdAt).toISOString() : null,
    updatedAt: raw.updatedAt ? new Date(raw.updatedAt).toISOString() : null,
  };
}

/** Collects every assignment id on a page of events, for one batched lookup. */
function collectAssignmentIds(events: any[]): string[] {
  const ids: string[] = [];
  for (const event of events) {
    for (const assignment of event.vendors ?? []) ids.push(String(assignment._id));
  }
  return ids;
}

function toEventDto(event: any, paidByAssignment?: Map<string, number>): EventDto {
  return {
    id: String(event._id),
    customer: event.customer
      ? { id: String(event.customer._id), name: event.customer.name, phone: event.customer.phone }
      : null,
    lead: event.lead
      ? { id: String(event.lead._id), name: event.lead.name }
      : null,

    eventName: event.eventName,
    eventType: event.eventType,
    eventDate: event.eventDate?.toISOString() || "",
    startTime: event.startTime || "",
    endTime: event.endTime || "",

    venue: event.venue || "",
    venueAddress: event.venueAddress || "",
    guestCount: event.guestCount ?? null,

    packageName: event.packageName || "",
    services: (event.services || []).map((s: any) => ({
      name: s.name,
      description: s.description || "",
      quantity: s.quantity || 1,
      unitPrice: s.unitPrice || 0,
      estimatedCost: s.estimatedCost || 0,
      vendor: s.vendor || null,
      notes: s.notes || "",
    })),
    contractAmount: event.contractAmount || 0,
    paymentTerms: event.paymentTerms || "",

    vendors: (event.vendors || []).map((v: any) =>
      toVendorAssignmentDto(v, paidByAssignment?.get(String(v._id)) ?? 0)
    ),
    team: (event.team || []).map((t: any) => ({
      user: t.user && typeof t.user === "object"
        ? { id: String(t.user._id), name: t.user.name }
        : String(t.user),
      role: t.role,
      notes: t.notes || "",
    })),

    notes: event.notes || "",
    internalNotes: event.internalNotes || "",

    status: event.status,
    paymentStatus: event.paymentStatus,

    // Financials — computed, not stored
    amountReceived: 0,
    outstanding: 0,
    directExpenses: 0,
    grossProfit: 0,

    createdBy: event.createdBy ? { id: String(event.createdBy._id), name: event.createdBy.name } : null,
    updatedBy: event.updatedBy ? { id: String(event.updatedBy._id), name: event.updatedBy.name } : null,
    createdAt: event.createdAt?.toISOString() || "",
    updatedAt: event.updatedAt?.toISOString() || "",
  };
}

export const eventService = {
  /**
   * Create a new event/booking.
   */
  async create(
    input: any,
    actor: AuthContext,
    context: { ip: string; requestId: string }
  ): Promise<EventDto> {
    const event = await eventRepository.create({
      ...input,
      eventDate: new Date(input.eventDate),
      customer: new Types.ObjectId(input.customer),
      lead: input.lead ? new Types.ObjectId(input.lead) : null,
      vendors: (input.vendors || []).map((v: any) => ({
        ...v,
        vendor: new Types.ObjectId(v.vendor),
      })),
      team: (input.team || []).map((t: any) => ({
        ...t,
        user: new Types.ObjectId(t.user),
      })),
      createdBy: actor.user.id,
      updatedBy: actor.user.id,
    });

    await auditService.record({
      action: AUDIT_ACTIONS.leadCreated, // Reuse existing action
      entityType: "Event",
      entityId: String(event._id),
      actor: actor.user,
      ip: context.ip,
      requestId: context.requestId,
      metadata: { eventName: input.eventName, eventType: input.eventType },
    });

    // Non-blocking Google Sheets sync
    syncService.syncEvent(event).catch(() => {});

    return toEventDto(event);
  },

  /**
   * Get event by ID with computed financials.
   */
  async getById(id: string): Promise<EventDto> {
    const event = await eventRepository.findById(id);
    if (!event) throw ApiError.notFound("Event not found.");

    const [financials, paid] = await Promise.all([
      this.getFinancials(id),
      vendorPaymentRepository.paidTotalsByAssignments(
        (event.vendors ?? []).map((row: any) => String(row._id))
      ),
    ]);

    const dto = toEventDto(event, paid);

    // Compute financials from existing finance system
    dto.amountReceived = financials.amountReceived;
    dto.outstanding = financials.outstanding;
    dto.directExpenses = financials.directExpenses;
    dto.grossProfit = financials.grossProfit;

    return dto;
  },

  /**
   * Update an event.
   */
  async update(
    id: string,
    input: any,
    actor: AuthContext,
    context: { ip: string; requestId: string }
  ): Promise<EventDto> {
    const update: Record<string, unknown> = { ...input, updatedBy: actor.user.id };

    if (input.eventDate) update.eventDate = new Date(input.eventDate);
    if (input.customer) update.customer = new Types.ObjectId(input.customer);
    if (input.lead) update.lead = new Types.ObjectId(input.lead);
    if (input.vendors) {
      update.vendors = input.vendors.map((v: any) => ({
        ...v,
        vendor: new Types.ObjectId(v.vendor),
      }));
    }
    if (input.team) {
      update.team = input.team.map((t: any) => ({
        ...t,
        user: new Types.ObjectId(t.user),
      }));
    }

    const event = await eventRepository.updateById(id, update);
    if (!event) throw ApiError.notFound("Event not found.");

    await auditService.record({
      action: AUDIT_ACTIONS.leadUpdated,
      entityType: "Event",
      entityId: id,
      actor: actor.user,
      ip: context.ip,
      requestId: context.requestId,
      metadata: { fields: Object.keys(input) },
    });

    // Non-blocking sync
    syncService.syncEvent(event).catch(() => {});

    return toEventDto(event);
  },

  /**
   * Update event status.
   */
  async updateStatus(
    id: string,
    status: string,
    actor: AuthContext,
    context: { ip: string; requestId: string }
  ): Promise<EventDto> {
    const event = await eventRepository.updateById(id, {
      status,
      updatedBy: actor.user.id,
    });
    if (!event) throw ApiError.notFound("Event not found.");

    await auditService.record({
      action: AUDIT_ACTIONS.leadUpdated,
      entityType: "Event",
      entityId: id,
      actor: actor.user,
      ip: context.ip,
      requestId: context.requestId,
      metadata: { field: "status", value: status },
    });

    return toEventDto(event);
  },

  /**
   * Archive (soft-delete) an event.
   */
  async archive(
    id: string,
    actor: AuthContext,
    context: { ip: string; requestId: string }
  ): Promise<void> {
    const event = await eventRepository.archiveById(id);
    if (!event) throw ApiError.notFound("Event not found.");

    await auditService.record({
      action: AUDIT_ACTIONS.leadArchived,
      entityType: "Event",
      entityId: id,
      actor: actor.user,
      ip: context.ip,
      requestId: context.requestId,
    });
  },

  /**
   * List events with pagination and filters.
   */
  async list(query: EventListQuery): Promise<Paginated<EventDto>> {
    const { items, total } = await eventRepository.list(query);

    // One batched lookup for every vendor assignment on the page, so the
    // assignment payment figures are real even in a list.
    const paid = await vendorPaymentRepository.paidTotalsByAssignments(collectAssignmentIds(items));

    const dtos = items.map((item) => toEventDto(item, paid));
    return buildPaginated(dtos, total, query.page, query.limit);
  },

  /**
   * Upcoming events for dashboard.
   */
  async upcoming(days: number = 30): Promise<UpcomingEvent[]> {
    const events = await eventRepository.upcomingEvents(days);

    const dtos: UpcomingEvent[] = await Promise.all(
      events.map(async (e: any) => {
        const financials = await this.getFinancials(String(e._id));
        return {
          id: String(e._id),
          eventName: e.eventName,
          eventType: e.eventType,
          eventDate: e.eventDate?.toISOString() || "",
          venue: e.venue || "",
          status: e.status,
          paymentStatus: e.paymentStatus,
          customerName: e.customer?.name || "",
          customerPhone: e.customer?.phone || "",
          outstanding: financials.outstanding,
        };
      })
    );

    return dtos;
  },

  /**
   * Calendar events for a date range.
   */
  async calendar(start: Date, end: Date): Promise<CalendarEvent[]> {
    const events = await eventRepository.calendarEvents(start, end);
    return events.map((e: any) => ({
      id: String(e._id),
      eventName: e.eventName,
      eventType: e.eventType,
      eventDate: e.eventDate?.toISOString() || "",
      venue: e.venue || "",
      status: e.status,
      paymentStatus: e.paymentStatus,
      customerName: e.customer?.name || "",
    }));
  },

  /**
   * Get financials for an event from the existing finance system.
   */
  async getFinancials(eventId: string): Promise<EventFinancials> {
    const event = await eventRepository.findByIdLean(eventId);
    if (!event) throw ApiError.notFound("Event not found.");

    const contractAmount = event.contractAmount || 0;

    // Get payments from existing finance system
    const amountReceived = await paymentRepository.totalByBooking(eventId);

    // Get expenses linked to this event
    const directExpenses = await expenseRepository.totalByBooking(eventId);

    const outstanding = contractAmount - amountReceived;
    const grossProfit = contractAmount - directExpenses;
    const grossMarginPercent = contractAmount > 0
      ? Math.round((grossProfit / contractAmount) * 100)
      : 0;

    return {
      contractAmount,
      amountReceived,
      outstanding,
      directExpenses,
      grossProfit,
      grossMarginPercent,
    };
  },

  /**
   * Add a note to an event.
   */
  async addNote(
    eventId: string,
    body: string,
    actor: AuthContext,
    context: { ip: string; requestId: string }
  ): Promise<EventDto> {
    const event = await eventRepository.addNote(eventId, {
      body,
      author: new Types.ObjectId(actor.user.id),
      authorName: actor.user.name,
    });
    if (!event) throw ApiError.notFound("Event not found.");

    await auditService.record({
      action: AUDIT_ACTIONS.leadNoteAdded,
      entityType: "Event",
      entityId: eventId,
      actor: actor.user,
      ip: context.ip,
      requestId: context.requestId,
    });

    return toEventDto(event);
  },

  /**
   * Dashboard stats for events.
   */
  async dashboardStats(): Promise<{
    upcoming7Days: number;
    upcoming30Days: number;
    totalActive: number;
    totalCompleted: number;
    byStatus: Record<string, number>;
  }> {
    const [upcoming7, upcoming30, statusCounts] = await Promise.all([
      eventRepository.upcomingEvents(7),
      eventRepository.upcomingEvents(30),
      eventRepository.countByStatus(),
    ]);

    const byStatus: Record<string, number> = {};
    let totalActive = 0;
    let totalCompleted = 0;

    for (const { status, count } of statusCounts) {
      byStatus[status] = count;
      if (["CONFIRMED", "PLANNING", "IN_PROGRESS"].includes(status)) {
        totalActive += count;
      }
      if (status === "COMPLETED") {
        totalCompleted = count;
      }
    }

    return {
      upcoming7Days: upcoming7.length,
      upcoming30Days: upcoming30.length,
      totalActive,
      totalCompleted,
      byStatus,
    };
  },
};
