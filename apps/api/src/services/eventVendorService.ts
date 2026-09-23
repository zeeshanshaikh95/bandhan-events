import { Types } from "mongoose";
import type {
  CreateVendorAssignmentInput,
  CreateVendorPaymentInput,
  EventVendorAssignmentDto,
  UpdateVendorAssignmentInput,
  VendorPaymentDto,
} from "@bandhan/shared";
import { eventRepository } from "@/repositories/eventRepository";
import { vendorRepository } from "@/repositories/vendorRepository";
import { vendorPaymentRepository } from "@/repositories/vendorPaymentRepository";
import { expenseRepository } from "@/repositories/expenseRepository";
import { eventService, toVendorAssignmentDto } from "@/services/eventService";
import { toVendorPaymentDto } from "@/services/vendorService";
import { AUDIT_ACTIONS, auditService } from "@/services/auditService";
import { syncService } from "@/services/syncService";
import type { AuthContext } from "@/types/auth";
import { ApiError } from "@/utils/ApiError";

/**
 * ---------------------------------------------------------------------------
 * EVENT ⇄ VENDOR
 * ---------------------------------------------------------------------------
 * Assigning a vendor to an event is a financial act as much as an operational
 * one, so three things happen together and stay consistent:
 *
 *   1. the assignment is written onto the event (vendor, role, cost, status);
 *   2. the agreed cost is represented by a row in the existing **Expense**
 *      collection, linked to the same event and vendor — which is what makes it
 *      appear in event profitability and the finance dashboard without a single
 *      vendor-specific calculation anywhere;
 *   3. the assignment is queued for Google Sheets.
 *
 * There is exactly one place a vendor cost can live: the Expense row. The
 * assignment points at it (`expense`) and is what keeps it up to date.
 * Outstanding payables are always (expense amounts) − (VendorPayment amounts),
 * never a stored figure.
 */

/** Resolves the authoritative cost, and says where it came from. */
function resolveAgreedCost(
  input: {
    agreedCost?: number;
    negotiatedCost?: number;
    caterer?: { guestCount?: number | null; pricePerPlate?: number };
  },
  existing?: { agreedCost?: number }
): { agreedCost: number; source: string } {
  if (typeof input.agreedCost === "number") {
    return { agreedCost: input.agreedCost, source: "agreed" };
  }

  if (typeof input.negotiatedCost === "number" && input.negotiatedCost > 0) {
    return { agreedCost: input.negotiatedCost, source: "negotiated" };
  }

  // Catering is quoted per plate, so guests × rate is the number the operator
  // means when they have not typed an explicit total. Computed here rather than
  // in the browser so the stored figure is authoritative.
  const guests = input.caterer?.guestCount ?? 0;
  const rate = input.caterer?.pricePerPlate ?? 0;
  if (guests > 0 && rate > 0) {
    return { agreedCost: guests * rate, source: "catering-calculation" };
  }

  return { agreedCost: existing?.agreedCost ?? 0, source: "none" };
}

export const eventVendorService = {
  /**
   * The assignments on one event, with the money already paid to each vendor
   * and what that leaves outstanding.
   */
  async listForEvent(eventId: string) {
    const event = await eventRepository.findById(eventId);
    if (!event) throw ApiError.notFound("Event not found.");

    const assignmentIds = (event.vendors ?? []).map((row: any) => String(row._id));
    const paid = await vendorPaymentRepository.paidTotalsByAssignments(assignmentIds);

    return (event.vendors ?? []).map((row: any) =>
      toVendorAssignmentDto(row, paid.get(String(row._id)) ?? 0)
    );
  },

  /** Assigns a vendor to an event, and records the resulting cost as an expense. */
  async assign(
    eventId: string,
    input: CreateVendorAssignmentInput,
    actor: AuthContext,
    context: { ip: string; requestId: string }
  ) {
    const event = await eventRepository.findByIdRaw(eventId);
    if (!event) throw ApiError.notFound("Event not found.");

    const vendor = await vendorRepository.findByIdRaw(input.vendor);
    if (!vendor) throw ApiError.notFound("That vendor could not be found.");

    if (vendor.status === "BLOCKED") {
      throw ApiError.conflict(
        `"${vendor.name}" is blocked. Unblock the vendor before assigning them to an event.`,
        "VENDOR_BLOCKED"
      );
    }

    // One vendor may appear twice on an event (catering and lighting), but not
    // twice in the same role — that would double the cost silently.
    const role = input.role || vendor.type;
    const duplicate = (event.vendors ?? []).find(
      (row: any) => String(row.vendor) === input.vendor && (row.role ?? "other") === role
    );
    if (duplicate) {
      throw ApiError.conflict(
        `"${vendor.name}" is already assigned to this event in that role. Edit the existing assignment instead.`,
        "VENDOR_ALREADY_ASSIGNED"
      );
    }

    const { agreedCost } = resolveAgreedCost(input);

    // The id is minted here rather than read back after the push: it is the key
    // the expense, the payment records and the sheet row all reference, so it
    // must exist before any of them are written.
    const assignmentId = new Types.ObjectId();

    await eventRepository.pushVendorAssignment(eventId, {
      _id: assignmentId,
      vendor: new Types.ObjectId(input.vendor),
      role,
      service: input.service || "",
      estimatedCost: input.estimatedCost ?? 0,
      negotiatedCost: input.negotiatedCost ?? 0,
      agreedCost,
      quantity: input.quantity ?? 1,
      status: input.status ?? "PLANNED",
      startTime: input.startTime || "",
      endTime: input.endTime || "",
      notes: input.notes || "",
      contactPerson: input.contactPerson || vendor.contactPerson || "",
      contactPhone: input.contactPhone || vendor.phone || "",
      caterer: input.caterer ?? {},
      createdBy: new Types.ObjectId(actor.user.id),
      updatedBy: new Types.ObjectId(actor.user.id),
    });

    const expenseId = await this.settleCostExpense({
      event,
      vendor,
      assignmentId: String(assignmentId),
      agreedCost,
      service: input.service || role,
      existingExpenseId: null,
      actor,
    });

    if (expenseId) {
      await eventRepository.updateVendorAssignment(eventId, String(assignmentId), {
        expense: new Types.ObjectId(expenseId),
      });
    }

    await auditService.record({
      action: AUDIT_ACTIONS.vendorAssigned,
      entityType: "Event",
      entityId: eventId,
      actor: actor.user,
      ip: context.ip,
      requestId: context.requestId,
      metadata: { assignmentId: String(assignmentId), vendorId: input.vendor, vendorName: vendor.name, role, agreedCost, expenseId },
    });

    const refreshed = await eventService.getById(eventId);
    const target = refreshed.vendors.find((row) => row.id === String(assignmentId));
    if (target) this.queueSync(event as any, target);
    return target ?? null;
  },

  /** Edits one assignment; the linked expense follows the agreed cost. */
  async updateAssignment(
    eventId: string,
    assignmentId: string,
    input: UpdateVendorAssignmentInput,
    actor: AuthContext,
    context: { ip: string; requestId: string }
  ) {
    const event = await eventRepository.findByIdRaw(eventId);
    if (!event) throw ApiError.notFound("Event not found.");

    const existing = (event.vendors ?? []).find((row: any) => String(row._id) === assignmentId);
    if (!existing) throw ApiError.notFound("That vendor assignment is not on this event.");

    const vendor = await vendorRepository.findByIdRaw(String((existing as any).vendor));
    if (!vendor) throw ApiError.notFound("The assigned vendor no longer exists.");

    const nextCaterer = { ...((existing as any).caterer?.toObject?.() ?? (existing as any).caterer ?? {}), ...(input.caterer ?? {}) };
    const { agreedCost, source } = resolveAgreedCost(
      {
        agreedCost: input.agreedCost,
        negotiatedCost: input.negotiatedCost ?? (existing as any).negotiatedCost,
        caterer: nextCaterer,
      },
      { agreedCost: (existing as any).agreedCost }
    );

    const update: Record<string, unknown> = {
      updatedBy: new Types.ObjectId(actor.user.id),
      agreedCost,
    };

    if (input.role !== undefined) update.role = input.role || (existing as any).role;
    if (input.service !== undefined) update.service = input.service || "";
    if (input.estimatedCost !== undefined) update.estimatedCost = input.estimatedCost;
    if (input.negotiatedCost !== undefined) update.negotiatedCost = input.negotiatedCost;
    if (input.quantity !== undefined) update.quantity = input.quantity;
    if (input.status !== undefined) update.status = input.status;
    if (input.startTime !== undefined) update.startTime = input.startTime || "";
    if (input.endTime !== undefined) update.endTime = input.endTime || "";
    if (input.notes !== undefined) update.notes = input.notes || "";
    if (input.contactPerson !== undefined) update.contactPerson = input.contactPerson || "";
    if (input.contactPhone !== undefined) update.contactPhone = input.contactPhone || "";
    if (input.caterer !== undefined) update.caterer = nextCaterer;

    await eventRepository.updateVendorAssignment(eventId, assignmentId, update);

    const expenseId = await this.settleCostExpense({
      event,
      vendor,
      assignmentId,
      agreedCost,
      service: (update.service as string) || (existing as any).service || (existing as any).role,
      existingExpenseId: (existing as any).expense ? String((existing as any).expense) : null,
      actor,
    });

    await eventRepository.updateVendorAssignment(eventId, assignmentId, {
      expense: expenseId ? new Types.ObjectId(expenseId) : null,
    });

    const costChanged = agreedCost !== ((existing as any).agreedCost ?? 0);

    await auditService.record({
      action: costChanged ? AUDIT_ACTIONS.vendorCostChanged : AUDIT_ACTIONS.vendorAssignmentUpdated,
      entityType: "Event",
      entityId: eventId,
      actor: actor.user,
      ip: context.ip,
      requestId: context.requestId,
      metadata: {
        assignmentId,
        vendorId: String((existing as any).vendor),
        previousCost: (existing as any).agreedCost ?? 0,
        agreedCost,
        costSource: source,
        status: update.status ?? (existing as any).status,
      },
    });

    const refreshed = await eventService.getById(eventId);
    const target = refreshed.vendors.find((row) => row.id === assignmentId);
    if (target) this.queueSync(event as any, target);
    return target ?? null;
  },

  /**
   * Removes an assignment. The expense is archived rather than deleted, and any
   * payment already made to the vendor is left untouched — money that left the
   * bank did not stop leaving it because the plan changed.
   */
  async removeAssignment(
    eventId: string,
    assignmentId: string,
    actor: AuthContext,
    context: { ip: string; requestId: string }
  ) {
    const event = await eventRepository.findByIdRaw(eventId);
    if (!event) throw ApiError.notFound("Event not found.");

    const existing = (event.vendors ?? []).find((row: any) => String(row._id) === assignmentId);
    if (!existing) throw ApiError.notFound("That vendor assignment is not on this event.");

    const paid = await vendorPaymentRepository.paidTotalByAssignment(assignmentId);
    if (paid > 0) {
      throw ApiError.conflict(
        `₹${paid.toLocaleString("en-IN")} has already been paid against this assignment. Mark it cancelled instead of removing it, so the payment keeps its context.`,
        "ASSIGNMENT_HAS_PAYMENTS"
      );
    }

    if ((existing as any).expense) {
      await expenseRepository.archiveById(String((existing as any).expense));
    }

    await eventRepository.pullVendorAssignment(eventId, assignmentId);

    await auditService.record({
      action: AUDIT_ACTIONS.vendorAssignmentRemoved,
      entityType: "Event",
      entityId: eventId,
      actor: actor.user,
      ip: context.ip,
      requestId: context.requestId,
      metadata: {
        assignmentId,
        vendorId: String((existing as any).vendor),
        archivedExpenseId: (existing as any).expense ? String((existing as any).expense) : null,
      },
    });

    return { removed: true, expenseArchived: Boolean((existing as any).expense) };
  },

  /**
   * Records money paid to a vendor. Rejected when it would pay more than the
   * assignment is worth, so the payable can never go negative through a typo.
   */
  async recordPayment(
    eventId: string,
    assignmentId: string,
    input: CreateVendorPaymentInput,
    actor: AuthContext,
    context: { ip: string; requestId: string }
  ): Promise<VendorPaymentDto> {
    const event = await eventRepository.findByIdRaw(eventId);
    if (!event) throw ApiError.notFound("Event not found.");

    const existing = (event.vendors ?? []).find((row: any) => String(row._id) === assignmentId);
    if (!existing) throw ApiError.notFound("That vendor assignment is not on this event.");

    const agreedCost = (existing as any).agreedCost ?? 0;
    const alreadyPaid = await vendorPaymentRepository.paidTotalByAssignment(assignmentId);
    const outstanding = Math.max(0, agreedCost - alreadyPaid);

    if (input.amount > outstanding && input.status === "PAID") {
      throw ApiError.conflict(
        `This payment is more than the ₹${outstanding.toLocaleString("en-IN")} still outstanding on this assignment.`,
        "PAYMENT_EXCEEDS_OUTSTANDING"
      );
    }

    const payment = await vendorPaymentRepository.create({
      vendor: new Types.ObjectId(String((existing as any).vendor)),
      event: new Types.ObjectId(eventId),
      assignmentId,
      expense: (existing as any).expense ?? null,
      amount: input.amount,
      paymentDate: new Date(input.paymentDate),
      method: input.method ?? "cash",
      reference: input.reference || "",
      notes: input.notes || "",
      status: input.status ?? "PAID",
      paidBy: actor.user.name,
      createdBy: new Types.ObjectId(actor.user.id),
    });

    await auditService.record({
      action: AUDIT_ACTIONS.vendorPaymentRecorded,
      entityType: "VendorPayment",
      entityId: String(payment._id),
      actor: actor.user,
      ip: context.ip,
      requestId: context.requestId,
      metadata: {
        eventId,
        assignmentId,
        vendorId: String((existing as any).vendor),
        amount: input.amount,
        agreedCost,
        outstandingAfter:
          input.status === "PAID" ? Math.max(0, outstanding - input.amount) : outstanding,
      },
    });

    // The assignment's paid figure changed, so its sheet row is refreshed.
    const refreshed = await eventService.getById(eventId);
    const target = refreshed.vendors.find((row) => row.id === assignmentId);
    if (target) this.queueSync(event as any, target);

    return toVendorPaymentDto(await vendorPaymentRepository.findById(String(payment._id)));
  },

  /** Every vendor payment recorded against one event. */
  async paymentsForEvent(eventId: string): Promise<VendorPaymentDto[]> {
    const event = await eventRepository.findByIdRaw(eventId);
    if (!event) throw ApiError.notFound("Event not found.");

    const rows = await vendorPaymentRepository.listByEvent(eventId);
    return rows.map(toVendorPaymentDto);
  },

  /**
   * Creates or updates the Expense that represents an assignment's cost.
   *
   * The expense is created with the **event's** date so the cost lands in the
   * same month as the event: event profit and the monthly report then agree on
   * when the money was spent.
   */
  async settleCostExpense(input: {
    event: any;
    vendor: any;
    assignmentId: string;
    agreedCost: number;
    service: string;
    existingExpenseId: string | null;
    actor: AuthContext;
  }): Promise<string | null> {
    const { event, vendor, assignmentId, agreedCost, service, existingExpenseId } = input;

    if (agreedCost <= 0) {
      // A cost of zero is not a cost — retire the expense rather than leaving a
      // ₹0 line in the finance reports.
      if (existingExpenseId) await expenseRepository.archiveById(existingExpenseId);
      return null;
    }

    const values = {
      date: event.eventDate ?? new Date(),
      category: "vendor",
      amount: agreedCost,
      description: `${vendor.name} — ${service || "services"}`,
      vendor: vendor._id,
      vendorName: vendor.name,
      booking: event._id,
      notes: `Vendor assignment ${assignmentId} on event ${String(event._id)}.`,
      paidBy: input.actor.user.name,
    };

    if (existingExpenseId) {
      // An expense that was archived by a previous zero-cost edit has to be
      // un-archived, otherwise the cost would exist but never be counted.
      await expenseRepository.updateById(existingExpenseId, { ...values, archivedAt: null });
      return existingExpenseId;
    }

    const created = await expenseRepository.create({
      ...values,
      paymentMethod: "cash",
      createdBy: new Types.ObjectId(input.actor.user.id),
    });
    return String(created._id);
  },

  /**
   * Fire-and-forget Sheets sync for one assignment row. Never awaited and never
   * allowed to throw: a Sheets outage must not fail the assignment that caused
   * it, and the failure is already logged by the sync service.
   */
  queueSync(event: any, assignment: EventVendorAssignmentDto): void {
    if (!assignment.vendor) return;

    syncService
      .syncVendorAssignment({
        assignmentId: assignment.id,
        eventId: event._id,
        vendorId: assignment.vendor.id,
        vendorName: assignment.vendor.name,
        role: assignment.role,
        service: assignment.service,
        eventDate: event.eventDate,
        agreedCost: assignment.agreedCost,
        amountPaid: assignment.amountPaid,
        status: assignment.status,
      })
      .catch(() => {});
  },
};
