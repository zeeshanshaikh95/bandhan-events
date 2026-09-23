import { Types } from "mongoose";
import { VendorPayment } from "@/models/VendorPayment";
import type { VendorPaymentDocument } from "@/models/VendorPayment";

/**
 * Repository for money paid out to vendors.
 *
 * Every total here is computed by the database rather than in JavaScript, so a
 * vendor with hundreds of payments costs one query — and the numbers agree with
 * what the finance module reports, because both read the same collection.
 */

function populate(query: any) {
  return query
    .populate("vendor", "name type phone")
    .populate("event", "eventName eventDate")
    .populate("createdBy", "name");
}

const liveFilter = { archivedAt: null } as const;

export const vendorPaymentRepository = {
  async create(input: Record<string, unknown>): Promise<VendorPaymentDocument> {
    return VendorPayment.create(input);
  },

  async findById(id: string) {
    return populate(VendorPayment.findById(id));
  },

  async findByIdRaw(id: string): Promise<VendorPaymentDocument | null> {
    return VendorPayment.findById(id);
  },

  async updateById(id: string, update: Record<string, unknown>) {
    return populate(VendorPayment.findByIdAndUpdate(id, update, { new: true }));
  },

  async listByVendor(vendorId: string, limit = 100) {
    return populate(VendorPayment.find({ ...liveFilter, vendor: vendorId }))
      .sort({ paymentDate: -1 })
      .limit(limit);
  },

  async listByEvent(eventId: string) {
    return populate(VendorPayment.find({ ...liveFilter, event: eventId })).sort({ paymentDate: -1 });
  },

  /**
   * Totals for one assignment. `PAID` only — a scheduled or refunded record is
   * not money that has left the business.
   */
  async paidTotalByAssignment(assignmentId: string): Promise<number> {
    const [row] = await VendorPayment.aggregate([
      { $match: { ...liveFilter, assignmentId, status: "PAID" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    return row?.total ?? 0;
  },

  /** Batched variant: totals for every assignment on one event, one query. */
  async paidTotalsByAssignment(eventId: string): Promise<Map<string, number>> {
    const rows = await VendorPayment.aggregate([
      { $match: { ...liveFilter, event: new Types.ObjectId(eventId), status: "PAID" } },
      { $group: { _id: "$assignmentId", total: { $sum: "$amount" } } },
    ]);
    return new Map(rows.filter((row) => row._id).map((row) => [String(row._id), row.total]));
  },

  /**
   * Paid total per assignment for one vendor — the vendor's event history needs
   * "what did we pay on that job", which is per assignment, not per vendor.
   */
  async paidTotalsByAssignmentForVendor(vendorId: string): Promise<Map<string, number>> {
    const rows = await VendorPayment.aggregate([
      {
        $match: {
          ...liveFilter,
          status: "PAID",
          vendor: new Types.ObjectId(vendorId),
          assignmentId: { $ne: null },
        },
      },
      { $group: { _id: "$assignmentId", total: { $sum: "$amount" } } },
    ]);
    return new Map(rows.map((row) => [String(row._id), row.total]));
  },

  /**
   * Batched variant across many assignments — lets the event list/detail show
   * real paid and outstanding figures without a query per assignment.
   */
  async paidTotalsByAssignments(assignmentIds: string[]): Promise<Map<string, number>> {
    if (assignmentIds.length === 0) return new Map();
    const rows = await VendorPayment.aggregate([
      { $match: { ...liveFilter, status: "PAID", assignmentId: { $in: assignmentIds } } },
      { $group: { _id: "$assignmentId", total: { $sum: "$amount" } } },
    ]);
    return new Map(rows.map((row) => [String(row._id), row.total]));
  },

  /** Paid-out total per vendor, for the vendor list and vendor detail header. */
  async paidTotalsByVendor(vendorIds: string[]): Promise<Map<string, number>> {
    if (vendorIds.length === 0) return new Map();
    const rows = await VendorPayment.aggregate([
      {
        $match: {
          ...liveFilter,
          status: "PAID",
          vendor: { $in: vendorIds.map((id) => new Types.ObjectId(id)) },
        },
      },
      { $group: { _id: "$vendor", total: { $sum: "$amount" } } },
    ]);
    return new Map(rows.map((row) => [String(row._id), row.total]));
  },

  async paidTotalForVendor(vendorId: string): Promise<number> {
    const totals = await this.paidTotalsByVendor([vendorId]);
    return totals.get(vendorId) ?? 0;
  },

  /** Business-wide outflow — feeds the finance cash-flow "money out" line. */
  async totalPaidOut(): Promise<number> {
    const [row] = await VendorPayment.aggregate([
      { $match: { ...liveFilter, status: "PAID" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    return row?.total ?? 0;
  },

  async paidTotalBetween(start: Date, end: Date): Promise<number> {
    const [row] = await VendorPayment.aggregate([
      { $match: { ...liveFilter, status: "PAID", paymentDate: { $gte: start, $lte: end } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    return row?.total ?? 0;
  },
};
