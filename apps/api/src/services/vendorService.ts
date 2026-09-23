import { Types } from "mongoose";
import type {
  Paginated,
  VendorDto,
  VendorEventHistoryItemDto,
  VendorFinancialsDto,
  VendorListItemDto,
  VendorListQuery,
  VendorPaymentDto,
  CreateVendorInput,
  UpdateVendorInput,
} from "@bandhan/shared";
import { vendorRepository } from "@/repositories/vendorRepository";
import { eventRepository } from "@/repositories/eventRepository";
import { vendorPaymentRepository } from "@/repositories/vendorPaymentRepository";
import { documentService } from "@/services/documentService";
import { AUDIT_ACTIONS, auditService } from "@/services/auditService";
import { syncService } from "@/services/syncService";
import type { AuthContext } from "@/types/auth";
import { ApiError } from "@/utils/ApiError";
import { buildPaginated } from "@/utils/http";

/**
 * ---------------------------------------------------------------------------
 * VENDOR SERVICE
 * ---------------------------------------------------------------------------
 * Owns the supplier record: who they are, what they charge, whether they are
 * still in use, and what the business has committed and paid to them.
 *
 * No financial figure here is stored twice. `contracted` comes from the event
 * assignments, `paid` comes from VendorPayment records, and `outstanding` is
 * their difference — the same source records the finance module reads.
 */

function toVendorDto(vendor: any): VendorDto {
  return {
    id: String(vendor._id),
    name: vendor.name,
    company: vendor.company || "",
    type: vendor.type,
    category: vendor.category || "",
    contactPerson: vendor.contactPerson || "",
    phone: vendor.phone || "",
    whatsapp: vendor.whatsapp || "",
    email: vendor.email || "",
    address: vendor.address || "",
    area: vendor.area || "",
    city: vendor.city || "",
    description: vendor.description || "",
    services: vendor.services ?? [],
    rateInfo: {
      basis: vendor.rateInfo?.basis || "lump-sum",
      amount: vendor.rateInfo?.amount || 0,
      notes: vendor.rateInfo?.notes || "",
    },
    status: vendor.status,
    notes: vendor.notes || "",

    caterer: {
      cuisines: vendor.caterer?.cuisines ?? [],
      dietaryOptions: vendor.caterer?.dietaryOptions ?? [],
      perPlatePrice: vendor.caterer?.perPlatePrice || 0,
      minimumGuestCount: vendor.caterer?.minimumGuestCount ?? null,
      maximumGuestCount: vendor.caterer?.maximumGuestCount ?? null,
      staffIncluded: vendor.caterer?.staffIncluded ?? true,
      equipmentIncluded: vendor.caterer?.equipmentIncluded ?? false,
      servingStaff: vendor.caterer?.servingStaff || 0,
      setupCharges: vendor.caterer?.setupCharges || 0,
      deliveryCharges: vendor.caterer?.deliveryCharges || 0,
      additionalCharges: vendor.caterer?.additionalCharges || 0,
      notes: vendor.caterer?.notes || "",
    },
    packages: (vendor.packages ?? []).map((row: any) => ({
      id: String(row._id),
      name: row.name,
      pricePerPlate: row.pricePerPlate || 0,
      minimumGuests: row.minimumGuests ?? null,
      description: row.description || "",
      menuItems: row.menuItems ?? [],
      active: row.active ?? true,
    })),
    noteLog: (vendor.noteLog ?? [])
      .map((note: any) => ({
        id: String(note._id),
        body: note.body,
        authorName: note.authorName,
        createdAt: note.createdAt ? new Date(note.createdAt).toISOString() : "",
      }))
      .sort((a: any, b: any) => (a.createdAt < b.createdAt ? 1 : -1)),

    createdBy: vendor.createdBy?.name
      ? { id: String(vendor.createdBy._id), name: vendor.createdBy.name }
      : null,
    updatedBy: vendor.updatedBy?.name
      ? { id: String(vendor.updatedBy._id), name: vendor.updatedBy.name }
      : null,
    createdAt: vendor.createdAt?.toISOString() || "",
    updatedAt: vendor.updatedAt?.toISOString() || "",
    archivedAt: vendor.archivedAt ? new Date(vendor.archivedAt).toISOString() : null,
  };
}

function toVendorPaymentDto(payment: any): VendorPaymentDto {
  return {
    id: String(payment._id),
    vendor: payment.vendor?.name
      ? { id: String(payment.vendor._id), name: payment.vendor.name }
      : null,
    event: payment.event?.eventName
      ? {
          id: String(payment.event._id),
          eventName: payment.event.eventName,
          eventDate: payment.event.eventDate
            ? new Date(payment.event.eventDate).toISOString()
            : undefined,
        }
      : null,
    assignmentId: payment.assignmentId ?? null,
    amount: payment.amount,
    paymentDate: new Date(payment.paymentDate).toISOString(),
    method: payment.method,
    reference: payment.reference || "",
    notes: payment.notes || "",
    status: payment.status,
    createdBy: payment.createdBy?.name
      ? { id: String(payment.createdBy._id), name: payment.createdBy.name }
      : null,
    createdAt: payment.createdAt?.toISOString() || "",
    updatedAt: payment.updatedAt?.toISOString() || "",
  };
}

export const vendorService = {
  /** Vendor list with the derived event count and money columns. */
  async list(query: VendorListQuery): Promise<Paginated<VendorListItemDto>> {
    const { items, total } = await vendorRepository.list(query);
    const ids = items.map((item) => String(item._id));

    const [spend, paid] = await Promise.all([
      eventRepository.vendorSpendByVendorIds(ids),
      vendorPaymentRepository.paidTotalsByVendor(ids),
    ]);

    const dtos: VendorListItemDto[] = items.map((vendor) => {
      const id = String(vendor._id);
      const contracted = spend.get(id)?.contracted ?? 0;
      const paidAmount = paid.get(id) ?? 0;

      return {
        id,
        name: vendor.name,
        company: vendor.company || "",
        type: vendor.type,
        category: vendor.category || "",
        contactPerson: vendor.contactPerson || "",
        phone: vendor.phone || "",
        whatsapp: vendor.whatsapp || "",
        email: vendor.email || "",
        area: vendor.area || "",
        city: vendor.city || "",
        status: vendor.status,
        services: vendor.services ?? [],
        events: spend.get(id)?.events ?? 0,
        contracted,
        paid: paidAmount,
        outstanding: Math.max(0, contracted - paidAmount),
        createdAt: (vendor.createdAt as Date)?.toISOString() || "",
        updatedAt: (vendor.updatedAt as Date)?.toISOString() || "",
      };
    });

    return buildPaginated(dtos, total, query.page, query.limit);
  },

  async getById(id: string): Promise<VendorDto> {
    const vendor = await vendorRepository.findById(id);
    if (!vendor) throw ApiError.notFound("That vendor could not be found.");
    return toVendorDto(vendor);
  },

  async create(
    input: CreateVendorInput,
    actor: AuthContext,
    context: { ip: string; requestId: string }
  ): Promise<VendorDto> {
    if (!input.confirmDuplicate) {
      const duplicate = await vendorRepository.findDuplicate(input.name, input.phone ?? "");
      if (duplicate) {
        throw ApiError.conflict(
          `A vendor named "${duplicate.name}" already exists${
            duplicate.phone ? ` with the phone number ${duplicate.phone}` : ""
          }. Link that record instead, or confirm you want a second entry.`,
          "DUPLICATE_VENDOR"
        );
      }
    }

    const { confirmDuplicate: _ignored, ...values } = input;

    const vendor = await vendorRepository.create({
      ...values,
      createdBy: new Types.ObjectId(actor.user.id),
      updatedBy: new Types.ObjectId(actor.user.id),
    });

    await auditService.record({
      action: AUDIT_ACTIONS.vendorCreated,
      entityType: "Vendor",
      entityId: String(vendor._id),
      actor: actor.user,
      ip: context.ip,
      requestId: context.requestId,
      metadata: { name: vendor.name, type: vendor.type },
    });

    // Never blocks the write — a Sheets outage must not fail vendor creation.
    syncService.syncVendor(vendor).catch(() => {});

    return toVendorDto(await vendorRepository.findById(String(vendor._id)));
  },

  async update(
    id: string,
    input: UpdateVendorInput,
    actor: AuthContext,
    context: { ip: string; requestId: string }
  ): Promise<VendorDto> {
    const existing = await vendorRepository.findByIdRaw(id);
    if (!existing) throw ApiError.notFound("That vendor could not be found.");

    if (!input.confirmDuplicate && (input.name || input.phone)) {
      const name = input.name ?? existing.name;
      const phone = input.phone ?? existing.phone ?? "";
      const duplicate = await vendorRepository.findDuplicate(name, phone);
      if (duplicate && String(duplicate._id) !== id) {
        throw ApiError.conflict(
          `Those details belong to "${duplicate.name}". Merge into that record instead of creating a duplicate.`,
          "DUPLICATE_VENDOR"
        );
      }
    }

    const { confirmDuplicate: _ignored, ...values } = input;

    const vendor = await vendorRepository.updateById(id, {
      ...values,
      updatedBy: new Types.ObjectId(actor.user.id),
    });
    if (!vendor) throw ApiError.notFound("That vendor could not be found.");

    await auditService.record({
      action: AUDIT_ACTIONS.vendorUpdated,
      entityType: "Vendor",
      entityId: id,
      actor: actor.user,
      ip: context.ip,
      requestId: context.requestId,
      metadata: { fields: Object.keys(values) },
    });

    syncService.syncVendor(vendor).catch(() => {});

    return toVendorDto(vendor);
  },

  /**
   * Status change. Blocking or deactivating a vendor never touches its history:
   * past assignments, expenses and payments stay exactly as they were.
   */
  async setStatus(
    id: string,
    status: string,
    reason: string | undefined,
    actor: AuthContext,
    context: { ip: string; requestId: string }
  ): Promise<VendorDto> {
    const existing = await vendorRepository.findByIdRaw(id);
    if (!existing) throw ApiError.notFound("That vendor could not be found.");

    const vendor = await vendorRepository.updateById(id, {
      status,
      updatedBy: new Types.ObjectId(actor.user.id),
    });

    await auditService.record({
      action: AUDIT_ACTIONS.vendorStatusChanged,
      entityType: "Vendor",
      entityId: id,
      actor: actor.user,
      ip: context.ip,
      requestId: context.requestId,
      metadata: { from: existing.status, to: status, reason: reason ?? "" },
    });

    syncService.syncVendor(vendor).catch(() => {});

    return toVendorDto(vendor);
  },

  /**
   * Soft delete. The record is retained because expenses, assignments and
   * payments point at it; removing it would orphan financial history.
   */
  async archive(
    id: string,
    actor: AuthContext,
    context: { ip: string; requestId: string }
  ): Promise<{ archived: boolean; outstanding: number }> {
    const existing = await vendorRepository.findByIdRaw(id);
    if (!existing) throw ApiError.notFound("That vendor could not be found.");

    const spend = await eventRepository.vendorSpendByVendorIds([id]);
    const paid = await vendorPaymentRepository.paidTotalForVendor(id);
    const outstanding = Math.max(0, (spend.get(id)?.contracted ?? 0) - paid);

    if (outstanding > 0) {
      throw ApiError.conflict(
        `This vendor is still owed ₹${outstanding.toLocaleString("en-IN")}. Settle or cancel the outstanding balance before retiring the record.`,
        "VENDOR_HAS_OUTSTANDING"
      );
    }

    await vendorRepository.archiveById(id);

    await auditService.record({
      action: AUDIT_ACTIONS.vendorArchived,
      entityType: "Vendor",
      entityId: id,
      actor: actor.user,
      ip: context.ip,
      requestId: context.requestId,
      metadata: { name: existing.name, previousStatus: existing.status },
    });

    return { archived: true, outstanding };
  },

  async addNote(
    id: string,
    body: string,
    actor: AuthContext,
    context: { ip: string; requestId: string }
  ): Promise<VendorDto> {
    const vendor = await vendorRepository.addNote(id, {
      body,
      author: new Types.ObjectId(actor.user.id),
      authorName: actor.user.name,
    });
    if (!vendor) throw ApiError.notFound("That vendor could not be found.");

    await auditService.record({
      action: AUDIT_ACTIONS.vendorNoteAdded,
      entityType: "Vendor",
      entityId: id,
      actor: actor.user,
      ip: context.ip,
      requestId: context.requestId,
      metadata: { length: body.length },
    });

    return toVendorDto(vendor);
  },

  /**
   * What the business has committed to and paid this vendor, plus the event
   * history those figures come from.
   */
  async financials(id: string): Promise<VendorFinancialsDto> {
    const vendor = await vendorRepository.findByIdRaw(id);
    if (!vendor) throw ApiError.notFound("That vendor could not be found.");

    const [rawEvents, paidByVendor] = await Promise.all([
      eventRepository.findEventsForVendor(id),
      vendorPaymentRepository.paidTotalsByAssignmentForVendor(id),
    ]);

    const events: VendorEventHistoryItemDto[] = rawEvents.map((row: any) => {
      const agreedCost = row.agreedCost ?? 0;
      const amountPaid = paidByVendor.get(String(row.assignmentId)) ?? 0;
      const outstanding = Math.max(0, agreedCost - amountPaid);

      return {
        eventId: String(row.eventId),
        eventName: row.eventName,
        eventDate: row.eventDate ? new Date(row.eventDate).toISOString() : "",
        eventStatus: row.eventStatus,
        assignmentId: String(row.assignmentId),
        service: row.service || "",
        agreedCost,
        amountPaid,
        outstanding,
        assignmentStatus: row.assignmentStatus,
        paymentStatus:
          agreedCost > 0 && amountPaid >= agreedCost
            ? "PAID"
            : amountPaid > 0
              ? "PARTIALLY_PAID"
              : "UNPAID",
      };
    });

    const contracted = events.reduce((total, row) => total + row.agreedCost, 0);
    const paid = events.reduce((total, row) => total + row.amountPaid, 0);
    // Cancelled work is not work we delivered, so it is excluded from the
    // "how many events" figure but not from what was contracted on it.
    const billable = events.filter((row) => row.assignmentStatus !== "CANCELLED");

    return {
      totals: {
        events: billable.length,
        completedEvents: events.filter((row) => row.assignmentStatus === "COMPLETED").length,
        cancelledEvents: events.filter((row) => row.assignmentStatus === "CANCELLED").length,
        contracted,
        paid,
        outstanding: Math.max(0, contracted - paid),
        averageEventCost:
          billable.length > 0 ? Math.round(contracted / billable.length) : 0,
      },
      events,
    };
  },

  async payments(id: string): Promise<VendorPaymentDto[]> {
    const vendor = await vendorRepository.findByIdRaw(id);
    if (!vendor) throw ApiError.notFound("That vendor could not be found.");

    const rows = await vendorPaymentRepository.listByVendor(id);
    return rows.map(toVendorPaymentDto);
  },

  async documents(id: string) {
    const vendor = await vendorRepository.findByIdRaw(id);
    if (!vendor) throw ApiError.notFound("That vendor could not be found.");
    return documentService.listForEntity("Vendor", id);
  },

  /** Uploads a vendor document (rate card, agreement, quotation). */
  async storeDocument(
    id: string,
    file: { fileName: string; mimeType: string; data: Buffer },
    actor: AuthContext
  ) {
    const vendor = await vendorRepository.findByIdRaw(id);
    if (!vendor) throw ApiError.notFound("That vendor could not be found.");

    const document = await documentService.store({
      kind: "vendor",
      fileName: file.fileName,
      data: file.data,
      entityType: "Vendor",
      entityId: id,
      actor,
      mimeType: file.mimeType,
    });

    await auditService.record({
      action: AUDIT_ACTIONS.vendorDocumentAdded,
      entityType: "Vendor",
      entityId: id,
      actor: actor.user,
      metadata: { fileName: document.fileName, sizeBytes: document.sizeBytes },
    });

    return document;
  },

  /** Status counters for the list header. */
  async statusCounts(): Promise<Record<string, number>> {
    return vendorRepository.countByStatus();
  },

  async cities(): Promise<string[]> {
    return vendorRepository.distinctCities();
  },
};

export { toVendorPaymentDto };
