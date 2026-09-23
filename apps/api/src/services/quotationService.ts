import { Types } from "mongoose";
import type {
  AcceptQuotationInput,
  CreateQuotationInput,
  LineItemDto,
  Paginated,
  QuotationDto,
  QuotationListQuery,
  QuotationStatus,
  QuotationVersionDto,
  RejectQuotationInput,
  UpdateQuotationInput,
} from "@bandhan/shared";
import { LINE_ITEM_CATEGORY_LABELS } from "@bandhan/shared";
import { Quotation } from "@/models/Quotation";
import { quotationRepository } from "@/repositories/quotationRepository";
import { customerRepository } from "@/repositories/customerRepository";
import { eventService } from "@/services/eventService";
import {
  AUDIT_ACTIONS,
  auditService,
} from "@/services/auditService";
import {
  calculateLineItems,
  calculateTotals,
  toLineItemDto,
  toPricingTotals,
} from "@/services/pricingService";
import { syncService } from "@/services/syncService";
import type { AuthContext } from "@/types/auth";
import { ApiError } from "@/utils/ApiError";
import { buildPaginated } from "@/utils/http";
import { toPaise, toRupees } from "@/utils/money";
import { allocateDocumentNumber } from "@/utils/numberSequence";

/**
 * Reads an id out of a reference that may be raw (an ObjectId) or populated
 * (a full document). Mongoose documents stringify to a debug dump, so
 * `String(document)` is never a safe way to get an id.
 */
function refId(value: unknown): string | null {
  if (!value) return null;
  return String((value as { _id?: unknown })._id ?? value);
}

/**
 * ---------------------------------------------------------------------------
 * QUOTATION SERVICE
 * ---------------------------------------------------------------------------
 * Owns the quotation lifecycle:
 *
 *   DRAFT → SENT → NEGOTIATION → ACCEPTED | REJECTED
 *                     ↘ EXPIRED (validity lapsed)  ↘ CANCELLED
 *
 * Two rules drive most of the code here:
 *
 *   1. Totals are recalculated from the line items on every write. A number
 *      that arrived from the browser is a hint, never a fact.
 *   2. Once a quotation has left DRAFT its contents are frozen. Editing it
 *      archives the outgoing version and increments the version number, so the
 *      customer can always tell which version they accepted.
 */

const OPEN_STATUSES: readonly QuotationStatus[] = ["DRAFT", "SENT", "NEGOTIATION"];
const LOCKED_STATUSES: readonly QuotationStatus[] = [
  "SENT",
  "NEGOTIATION",
  "ACCEPTED",
  "REJECTED",
  "EXPIRED",
  "CANCELLED",
];

const DATE_TOLERANCE_MS = 24 * 60 * 60 * 1000;

function isLapsed(validUntil: Date | null | undefined, now = new Date()): boolean {
  if (!validUntil) return false;
  // A quotation valid "until 20 Sept" is still good on 20 Sept.
  return validUntil.getTime() + DATE_TOLERANCE_MS < now.getTime();
}

function toVersionDto(entry: any): QuotationVersionDto {
  const snapshot = entry.snapshot ?? {};
  return {
    version: entry.version,
    createdAt: (entry.createdAt as Date)?.toISOString() || "",
    createdByName: entry.createdByName || "System",
    changeNote: entry.changeNote || "",
    totals: toPricingTotals(snapshot.totals),
    lineItemCount: Array.isArray(snapshot.lineItems) ? snapshot.lineItems.length : 0,
  };
}

export function toQuotationDto(quotation: any): QuotationDto {
  const status = quotation.status as QuotationStatus;
  const versions: any[] = quotation.versions ?? [];

  return {
    id: String(quotation._id),
    quotationNumber: quotation.quotationNumber,
    version: quotation.version,

    customer: quotation.customer
      ? {
          id: String(quotation.customer._id ?? quotation.customer),
          name: quotation.customer.name ?? "",
          phone: quotation.customer.phone ?? "",
          email: quotation.customer.email ?? null,
          address: quotation.customer.address ?? null,
        }
      : null,
    lead: quotation.lead
      ? { id: String(quotation.lead._id ?? quotation.lead), name: quotation.lead.name ?? "" }
      : null,
    event: quotation.event
      ? {
          id: String(quotation.event._id ?? quotation.event),
          eventName: quotation.event.eventName ?? "",
          eventDate: quotation.event.eventDate?.toISOString?.(),
        }
      : null,

    issueDate: (quotation.issueDate as Date)?.toISOString() || "",
    validUntil: quotation.validUntil ? (quotation.validUntil as Date).toISOString() : null,

    status,
    isExpired: OPEN_STATUSES.includes(status) && isLapsed(quotation.validUntil),

    eventType: quotation.eventType ?? "",
    eventDate: quotation.eventDate ? (quotation.eventDate as Date).toISOString() : null,
    venue: quotation.venue || "",
    venueAddress: quotation.venueAddress || "",
    guestCount: quotation.guestCount ?? null,

    packageName: quotation.packageName || "",
    lineItems: (quotation.lineItems ?? []).map(toLineItemDto) as LineItemDto[],
    totals: toPricingTotals(quotation.totals),
    paymentTerms: quotation.paymentTerms || "",
    notes: quotation.notes || "",
    termsAndConditions: quotation.termsAndConditions || "",

    acceptedAt: quotation.acceptedAt ? (quotation.acceptedAt as Date).toISOString() : null,
    acceptedByName: quotation.acceptedByName ?? null,
    acceptanceNote: quotation.acceptanceNote ?? null,
    rejectedAt: quotation.rejectedAt ? (quotation.rejectedAt as Date).toISOString() : null,
    rejectionReason: quotation.rejectionReason ?? null,
    sentAt: quotation.sentAt ? (quotation.sentAt as Date).toISOString() : null,

    pdfDocumentId: quotation.pdfDocumentId ? String(quotation.pdfDocumentId) : null,
    versionCount: versions.length + 1,
    versions: versions.map(toVersionDto),

    createdBy: quotation.createdBy
      ? { id: String(quotation.createdBy._id ?? quotation.createdBy), name: quotation.createdBy.name ?? "" }
      : null,
    updatedBy: quotation.updatedBy
      ? { id: String(quotation.updatedBy._id ?? quotation.updatedBy), name: quotation.updatedBy.name ?? "" }
      : null,
    createdAt: (quotation.createdAt as Date)?.toISOString() || "",
    updatedAt: (quotation.updatedAt as Date)?.toISOString() || "",
  };
}

/** The immutable content of a version — everything a customer could have seen. */
function buildSnapshot(quotation: any) {
  return {
    lineItems: (quotation.lineItems ?? []).map((item: any) => ({
      category: item.category,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unitPricePaise: item.unitPricePaise,
      discountPercent: item.discountPercent,
      discountAmountPaise: item.discountAmountPaise,
      taxPercent: item.taxPercent,
      taxAmountPaise: item.taxAmountPaise,
      lineTotalPaise: item.lineTotalPaise,
    })),
    totals: {
      subtotalPaise: quotation.totals?.subtotalPaise ?? 0,
      discountAmountPaise: quotation.totals?.discountAmountPaise ?? 0,
      taxAmountPaise: quotation.totals?.taxAmountPaise ?? 0,
      grandTotalPaise: quotation.totals?.grandTotalPaise ?? 0,
      advanceRequiredPaise: quotation.totals?.advanceRequiredPaise ?? 0,
      balancePaise: quotation.totals?.balancePaise ?? 0,
    },
    packageName: quotation.packageName ?? "",
    eventType: quotation.eventType ?? null,
    eventDate: quotation.eventDate ?? null,
    venue: quotation.venue ?? "",
    venueAddress: quotation.venueAddress ?? "",
    guestCount: quotation.guestCount ?? null,
    paymentTerms: quotation.paymentTerms ?? "",
    notes: quotation.notes ?? "",
    termsAndConditions: quotation.termsAndConditions ?? "",
  };
}

async function requireCustomer(customerId: string) {
  const customer = await customerRepository.findById(customerId);
  if (!customer) throw ApiError.notFound("That customer could not be found.");
  return customer;
}

export const quotationService = {
  async create(
    input: CreateQuotationInput,
    actor: AuthContext,
    context: { ip: string; requestId: string }
  ): Promise<QuotationDto> {
    await requireCustomer(input.customer);

    const issueDate = input.issueDate ? new Date(`${input.issueDate}T00:00:00.000Z`) : new Date();

    if (input.validUntil && new Date(`${input.validUntil}T00:00:00.000Z`) < issueDate) {
      throw ApiError.validation({ validUntil: ["Validity must be on or after the issue date."] });
    }

    const lineItems = calculateLineItems(input.lineItems);
    const totals = calculateTotals(lineItems, toPaise(input.advanceRequired ?? 0));

    const quotationNumber = await allocateDocumentNumber("quotation", issueDate);

    const quotation = await quotationRepository.create({
      quotationNumber,
      version: 1,
      customer: new Types.ObjectId(input.customer),
      lead: input.lead ? new Types.ObjectId(input.lead) : null,
      event: input.event ? new Types.ObjectId(input.event) : null,

      issueDate,
      validUntil: input.validUntil ? new Date(`${input.validUntil}T00:00:00.000Z`) : null,

      status: "DRAFT",
      eventType: input.eventType ?? null,
      eventDate: input.eventDate ? new Date(`${input.eventDate}T00:00:00.000Z`) : null,
      venue: input.venue ?? "",
      venueAddress: input.venueAddress ?? "",
      guestCount: input.guestCount ?? null,

      packageName: input.packageName ?? "",
      lineItems,
      totals,
      paymentTerms: input.paymentTerms ?? "",
      notes: input.notes ?? "",
      termsAndConditions: input.termsAndConditions ?? "",

      createdBy: new Types.ObjectId(actor.user.id),
      updatedBy: new Types.ObjectId(actor.user.id),
    });

    await auditService.record({
      action: AUDIT_ACTIONS.quotationCreated,
      entityType: "Quotation",
      entityId: String(quotation._id),
      actor: actor.user,
      ip: context.ip,
      requestId: context.requestId,
      metadata: { quotationNumber: quotation.quotationNumber, grandTotalPaise: totals.grandTotalPaise },
    });

    syncService.syncQuotation(quotation).catch(() => {});

    return toQuotationDto(quotation);
  },

  async getById(id: string): Promise<QuotationDto> {
    const quotation = await quotationRepository.findById(id);
    if (!quotation) throw ApiError.notFound("That quotation could not be found.");
    return toQuotationDto(quotation);
  },

  async list(query: QuotationListQuery): Promise<Paginated<QuotationDto>> {
    const { items, total } = await quotationRepository.list(query);
    return buildPaginated(items.map(toQuotationDto), total, query.page, query.limit);
  },

  /**
   * Applies an edit. Under an open status the document is rewritten in place;
   * under a locked status the outgoing content is archived first so the
   * customer's accepted version is never silently overwritten.
   */
  async update(
    id: string,
    patch: UpdateQuotationInput,
    actor: AuthContext,
    context: { ip: string; requestId: string }
  ): Promise<QuotationDto> {
    const current = await quotationRepository.findByIdRaw(id);
    if (!current) throw ApiError.notFound("That quotation could not be found.");

    if (current.status === "CANCELLED") {
      throw ApiError.conflict("A cancelled quotation cannot be edited.", "QUOTATION_CANCELLED");
    }
    if (current.status === "ACCEPTED" && patch.lineItems) {
      throw ApiError.conflict(
        "This quotation has been accepted. Raise a new version or a supplementary invoice instead of changing an accepted price.",
        "QUOTATION_ACCEPTED_LOCKED"
      );
    }

    const update: Record<string, unknown> = { updatedBy: new Types.ObjectId(actor.user.id) };

    if (patch.customer) {
      await requireCustomer(patch.customer);
      update.customer = new Types.ObjectId(patch.customer);
    }
    if (patch.lead !== undefined) update.lead = patch.lead ? new Types.ObjectId(patch.lead) : null;
    if (patch.event !== undefined) update.event = patch.event ? new Types.ObjectId(patch.event) : null;

    if (patch.issueDate) update.issueDate = new Date(`${patch.issueDate}T00:00:00.000Z`);
    if (patch.validUntil !== undefined) {
      update.validUntil = patch.validUntil ? new Date(`${patch.validUntil}T00:00:00.000Z`) : null;
    }

    if (patch.eventType !== undefined) update.eventType = patch.eventType || null;
    if (patch.eventDate !== undefined) {
      update.eventDate = patch.eventDate ? new Date(`${patch.eventDate}T00:00:00.000Z`) : null;
    }
    if (patch.venue !== undefined) update.venue = patch.venue ?? "";
    if (patch.venueAddress !== undefined) update.venueAddress = patch.venueAddress ?? "";
    if (patch.guestCount !== undefined) update.guestCount = patch.guestCount ?? null;
    if (patch.packageName !== undefined) update.packageName = patch.packageName ?? "";
    if (patch.paymentTerms !== undefined) update.paymentTerms = patch.paymentTerms ?? "";
    if (patch.notes !== undefined) update.notes = patch.notes ?? "";
    if (patch.termsAndConditions !== undefined) {
      update.termsAndConditions = patch.termsAndConditions ?? "";
    }

    // Recalculate pricing whenever lines change — or whenever an advance moves,
    // because the balance is derived from it.
    if (patch.lineItems || patch.advanceRequired !== undefined) {
      const lineItems = patch.lineItems
        ? calculateLineItems(patch.lineItems)
        : current.lineItems.map((item) => item.toObject());
      const advancePaise =
        patch.advanceRequired !== undefined
          ? toPaise(patch.advanceRequired)
          : current.totals.advanceRequiredPaise;

      if (patch.lineItems) update.lineItems = lineItems;
      update.totals = calculateTotals(lineItems as never, advancePaise);
    }

    const isLocked = LOCKED_STATUSES.includes(current.status as QuotationStatus);
    const pricingChanged = Boolean(patch.lineItems || patch.advanceRequired !== undefined);

    let quotation;
    if (isLocked && pricingChanged) {
      quotation = await quotationRepository.createNewVersion(
        id,
        {
          version: current.version,
          snapshot: buildSnapshot(current),
          changeNote: patch.changeNote ?? `Revised while ${current.status.toLowerCase()}`,
          createdBy: new Types.ObjectId(actor.user.id),
          createdByName: actor.user.name,
        },
        update
      );
    } else {
      quotation = await quotationRepository.updateById(id, update);
    }

    if (!quotation) throw ApiError.notFound("That quotation could not be found.");

    await auditService.record({
      action: isLocked && pricingChanged ? AUDIT_ACTIONS.quotationVersionCreated : AUDIT_ACTIONS.quotationUpdated,
      entityType: "Quotation",
      entityId: id,
      actor: actor.user,
      ip: context.ip,
      requestId: context.requestId,
      metadata: {
        quotationNumber: quotation.quotationNumber,
        version: quotation.version,
        fields: Object.keys(patch),
      },
    });

    syncService.syncQuotation(quotation).catch(() => {});

    return toQuotationDto(quotation);
  },

  async send(id: string, actor: AuthContext, context: { ip: string; requestId: string }): Promise<QuotationDto> {
    const quotation = await quotationRepository.findByIdRaw(id);
    if (!quotation) throw ApiError.notFound("That quotation could not be found.");

    if (quotation.status === "CANCELLED") {
      throw ApiError.conflict("A cancelled quotation cannot be sent.", "QUOTATION_CANCELLED");
    }
    if (quotation.status === "ACCEPTED") {
      throw ApiError.conflict("This quotation has already been accepted.", "QUOTATION_ALREADY_ACCEPTED");
    }
    if (quotation.validUntil && quotation.validUntil < new Date()) {
      throw ApiError.conflict(
        "This quotation has passed its validity date. Extend it before sending.",
        "QUOTATION_EXPIRED"
      );
    }

    const updated = await quotationRepository.updateById(id, {
      status: "SENT",
      sentAt: new Date(),
      updatedBy: new Types.ObjectId(actor.user.id),
    });

    await auditService.record({
      action: AUDIT_ACTIONS.quotationSent,
      entityType: "Quotation",
      entityId: id,
      actor: actor.user,
      ip: context.ip,
      requestId: context.requestId,
      metadata: { quotationNumber: quotation.quotationNumber, version: quotation.version },
    });

    syncService.syncQuotation(updated).catch(() => {});

    return toQuotationDto(updated);
  },

  /**
   * Records the customer's acceptance. Also creates the linked booking unless
   * the caller opts out — one conversion, guarded against running twice.
   */
  async accept(
    id: string,
    input: AcceptQuotationInput,
    actor: AuthContext,
    context: { ip: string; requestId: string }
  ): Promise<{ quotation: QuotationDto; event: { id: string; eventName: string } | null }> {
    const quotation = await quotationRepository.findByIdRaw(id);
    if (!quotation) throw ApiError.notFound("That quotation could not be found.");

    if (quotation.status === "ACCEPTED") {
      throw ApiError.conflict("This quotation has already been accepted.", "QUOTATION_ALREADY_ACCEPTED");
    }
    if (quotation.status === "REJECTED") {
      throw ApiError.conflict("A rejected quotation cannot be accepted.", "QUOTATION_REJECTED");
    }
    if (quotation.status === "CANCELLED") {
      throw ApiError.conflict("A cancelled quotation cannot be accepted.", "QUOTATION_CANCELLED");
    }
    if (isLapsed(quotation.validUntil) && !input.overrideExpired) {
      throw ApiError.conflict(
        "This quotation has passed its validity date. Confirm the expiry override to accept it anyway.",
        "QUOTATION_EXPIRED"
      );
    }

    const updated = await quotationRepository.updateById(id, {
      status: "ACCEPTED",
      acceptedAt: new Date(),
      acceptedByName: input.acceptedByName,
      acceptanceNote: input.acceptanceNote ?? null,
      updatedBy: new Types.ObjectId(actor.user.id),
    });

    await auditService.record({
      action: AUDIT_ACTIONS.quotationAccepted,
      entityType: "Quotation",
      entityId: id,
      actor: actor.user,
      ip: context.ip,
      requestId: context.requestId,
      metadata: {
        quotationNumber: quotation.quotationNumber,
        version: quotation.version,
        acceptedByName: input.acceptedByName,
        expiredOverride: isLapsed(quotation.validUntil),
      },
    });

    const linkedEventId = refId(updated.event);

    const event = linkedEventId
      ? { id: linkedEventId, eventName: (await eventService.getById(linkedEventId)).eventName }
      : input.createEvent
        ? await this.convertToEventInternal(updated, actor, context)
        : null;

    syncService.syncQuotation(await quotationRepository.findByIdRaw(id)).catch(() => {});

    return { quotation: toQuotationDto(await quotationRepository.findById(id)), event };
  },

  async reject(
    id: string,
    input: RejectQuotationInput,
    actor: AuthContext,
    context: { ip: string; requestId: string }
  ): Promise<QuotationDto> {
    const quotation = await quotationRepository.findByIdRaw(id);
    if (!quotation) throw ApiError.notFound("That quotation could not be found.");

    if (quotation.status === "ACCEPTED") {
      throw ApiError.conflict(
        "An accepted quotation cannot be rejected. Cancel the booking instead.",
        "QUOTATION_ALREADY_ACCEPTED"
      );
    }
    if (quotation.status === "CANCELLED") {
      throw ApiError.conflict("A cancelled quotation cannot be rejected.", "QUOTATION_CANCELLED");
    }

    const updated = await quotationRepository.updateById(id, {
      status: "REJECTED",
      rejectedAt: new Date(),
      rejectionReason: input.reason,
      updatedBy: new Types.ObjectId(actor.user.id),
    });

    await auditService.record({
      action: AUDIT_ACTIONS.quotationRejected,
      entityType: "Quotation",
      entityId: id,
      actor: actor.user,
      ip: context.ip,
      requestId: context.requestId,
      metadata: { quotationNumber: quotation.quotationNumber, reason: input.reason },
    });

    syncService.syncQuotation(updated).catch(() => {});

    return toQuotationDto(updated);
  },

  async cancel(
    id: string,
    reason: string | undefined,
    actor: AuthContext,
    context: { ip: string; requestId: string }
  ): Promise<QuotationDto> {
    const quotation = await quotationRepository.findByIdRaw(id);
    if (!quotation) throw ApiError.notFound("That quotation could not be found.");

    if (quotation.status === "CANCELLED") {
      throw ApiError.conflict("This quotation is already cancelled.", "QUOTATION_CANCELLED");
    }

    const updated = await quotationRepository.updateById(id, {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancellationReason: reason ?? null,
      updatedBy: new Types.ObjectId(actor.user.id),
    });

    await auditService.record({
      action: AUDIT_ACTIONS.quotationCancelled,
      entityType: "Quotation",
      entityId: id,
      actor: actor.user,
      ip: context.ip,
      requestId: context.requestId,
      metadata: { quotationNumber: quotation.quotationNumber, reason: reason ?? "" },
    });

    syncService.syncQuotation(updated).catch(() => {});

    return toQuotationDto(updated);
  },

  /**
   * Manual conversion. Idempotent: a quotation that already points at an event
   * returns that event instead of creating a second booking.
   */
  async convertToEvent(
    id: string,
    override: { eventName?: string; eventDate?: string },
    actor: AuthContext,
    context: { ip: string; requestId: string }
  ): Promise<{ quotation: QuotationDto; event: { id: string; eventName: string } }> {
    const quotation = await quotationRepository.findByIdRaw(id);
    if (!quotation) throw ApiError.notFound("That quotation could not be found.");

    if (quotation.status === "REJECTED" || quotation.status === "CANCELLED") {
      throw ApiError.conflict(
        `A ${quotation.status.toLowerCase()} quotation cannot be converted into a booking.`,
        "QUOTATION_NOT_CONVERTIBLE"
      );
    }

    // Idempotent: a quotation that already carries an event returns that event
    // rather than creating a second booking.
    const linkedEventId = refId(quotation.event);
    if (linkedEventId) {
      return {
        quotation: toQuotationDto(await quotationRepository.findById(id)),
        event: { id: linkedEventId, eventName: (await eventService.getById(linkedEventId)).eventName },
      };
    }

    const event = await this.convertToEventInternal(quotation, actor, context, override);

    return {
      quotation: toQuotationDto(await quotationRepository.findById(id)),
      event,
    };
  },

  /**
   * Creates the booking from a quotation and links both directions.
   * Shared by `accept` and `convertToEvent` so the two can never diverge.
   */
  async convertToEventInternal(
    quotation: any,
    actor: AuthContext,
    context: { ip: string; requestId: string },
    override: { eventName?: string; eventDate?: string } = {}
  ): Promise<{ id: string; eventName: string }> {
    // `quotation` may arrive raw (from a lookup) or populated (after a write),
    // so every reference is read through `refId`.
    const customerId = refId(quotation.customer);
    const customer = customerId ? await customerRepository.findById(customerId) : null;
    if (!customer || !customerId) {
      throw ApiError.conflict(
        "This quotation's customer no longer exists, so a booking cannot be created.",
        "CUSTOMER_MISSING"
      );
    }

    // A quotation may not carry an event date yet; fall back to the issue date
    // so the booking is never created without one, and let the team adjust it.
    const eventDate = override.eventDate
      ? new Date(`${override.eventDate}T00:00:00.000Z`)
      : quotation.eventDate ?? new Date();

    const event = await eventService.create(
      {
        customer: customerId,
        lead: refId(quotation.lead),
        quotation: refId(quotation._id),
        eventName:
          override.eventName ||
          quotation.packageName?.trim() ||
          `${customer.name} — ${LINE_ITEM_CATEGORY_LABELS["event-management"]}`,
        eventType: quotation.eventType || "other",
        eventDate: eventDate.toISOString(),
        venue: quotation.venue || "",
        venueAddress: quotation.venueAddress || "",
        guestCount: quotation.guestCount ?? null,
        packageName: quotation.packageName || "",
        services: (quotation.lineItems ?? []).map((item: any) => ({
          name: item.description,
          description: LINE_ITEM_CATEGORY_LABELS[item.category as keyof typeof LINE_ITEM_CATEGORY_LABELS] || item.category,
          quantity: item.quantity,
          unitPrice: toRupees(item.unitPricePaise),
          estimatedCost: 0,
          notes: "",
        })),
        contractAmount: toRupees(quotation.totals?.grandTotalPaise ?? 0),
        paymentTerms: quotation.paymentTerms || "",
        vendors: [],
        team: [],
        notes: quotation.notes || "",
        internalNotes: `Created from quotation ${quotation.quotationNumber} (v${quotation.version}).`,
        status: quotation.status === "ACCEPTED" ? "CONFIRMED" : "PLANNING",
        paymentStatus: "UNPAID",
      },
      actor,
      context
    );

    await quotationRepository.updateById(String(quotation._id), {
      event: new Types.ObjectId(event.id),
      status: "ACCEPTED",
      acceptedAt: quotation.acceptedAt ?? new Date(),
      updatedBy: new Types.ObjectId(actor.user.id),
    });

    await auditService.record({
      action: AUDIT_ACTIONS.quotationConverted,
      entityType: "Quotation",
      entityId: String(quotation._id),
      actor: actor.user,
      ip: context.ip,
      requestId: context.requestId,
      metadata: {
        quotationNumber: quotation.quotationNumber,
        eventId: event.id,
      },
    });

    return { id: event.id, eventName: event.eventName };
  },

  /**
   * Housekeeping: marks opened quotations whose validity has lapsed. Called on
   * list/detail reads instead of a cron, so the status the dashboard shows is
   * always current without a background scheduler to operate.
   */
  async markLapsedAsExpired(): Promise<number> {
    const lapsed = await quotationRepository.findLapsedOpen(new Date());
    if (lapsed.length === 0) return 0;

    await Quotation.updateMany(
      { _id: { $in: lapsed.map((quotation) => quotation._id) } },
      { $set: { status: "EXPIRED" } }
    );

    return lapsed.length;
  },

  async summary() {
    await this.markLapsedAsExpired();
    const [counts, acceptedValuePaise] = await Promise.all([
      quotationRepository.countByStatus(),
      quotationRepository.sumAcceptedValue(),
    ]);

    return { counts, acceptedValue: toRupees(acceptedValuePaise) };
  },
};
