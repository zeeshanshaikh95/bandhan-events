import { Types } from "mongoose";
import { Payment, type PaymentDocument } from "@/models/Payment";
import type { FinanceQuery } from "@bandhan/shared";

/**
 * Repository for Payment CRUD operations.
 * Keeps database access centralized and testable.
 */

export const paymentRepository = {
  async create(input: Record<string, unknown>): Promise<PaymentDocument> {
    return Payment.create(input);
  },

  async findById(id: string): Promise<PaymentDocument | null> {
    return Payment.findById(id)
      .populate("customer", "name")
      .populate("booking", "eventName");
  },

  async findByIdLean(id: string) {
    return Payment.findById(id)
      .populate("customer", "name")
      .populate("booking", "eventName")
      .lean();
  },

  async updateById(id: string, update: Record<string, unknown>): Promise<PaymentDocument | null> {
    return Payment.findByIdAndUpdate(id, update, { new: true })
      .populate("customer", "name")
      .populate("booking", "eventName");
  },

  async list(query: FinanceQuery): Promise<{ items: PaymentDocument[]; total: number }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

    if (query.startDate || query.endDate) {
      const dateFilter: Record<string, Date> = {};
      if (query.startDate) dateFilter.$gte = new Date(query.startDate);
      if (query.endDate) dateFilter.$lte = new Date(query.endDate);
      filter.paymentDate = dateFilter;
    }

    if (query.method) filter.method = query.method;
    if (query.status) filter.status = query.status;
    if (query.booking) filter.booking = new Types.ObjectId(query.booking);
    if (query.customer) filter.customer = new Types.ObjectId(query.customer);

    if (query.search) {
      filter.$or = [
        { reference: { $regex: query.search, $options: "i" } },
        { notes: { $regex: query.search, $options: "i" } },
      ];
    }

    const sort: Record<string, 1 | -1> = {};
    const sortField = query.sort?.replace("-", "") || "paymentDate";
    sort[sortField] = query.sort?.startsWith("-") ? -1 : 1;

    const [items, total] = await Promise.all([
      Payment.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate("customer", "name")
        .populate("booking", "eventName")
        .populate("createdBy", "name")
        .lean(),
      Payment.countDocuments(filter),
    ]);

    return { items: items as any[], total };
  },

  async totalReceived(): Promise<number> {
    const result = await Payment.aggregate([
      { $match: { status: "RECEIVED" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    return result[0]?.total || 0;
  },

  async totalReceivedByDateRange(start: Date, end: Date): Promise<number> {
    const result = await Payment.aggregate([
      { $match: { status: "RECEIVED", paymentDate: { $gte: start, $lt: end } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    return result[0]?.total || 0;
  },

  async totalPending(): Promise<number> {
    const result = await Payment.aggregate([
      { $match: { status: "PENDING" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    return result[0]?.total || 0;
  },

  async totalByBooking(bookingId: string): Promise<number> {
    const result = await Payment.aggregate([
      { $match: { booking: new Types.ObjectId(bookingId), status: "RECEIVED" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    return result[0]?.total || 0;
  },

  async monthlyReceived(year: number): Promise<{ month: number; total: number }[]> {
    return Payment.aggregate([
      {
        $match: {
          status: "RECEIVED",
          paymentDate: {
            $gte: new Date(`${year}-01-01`),
            $lt: new Date(`${year + 1}-01-01`),
          },
        },
      },
      {
        $group: {
          _id: { $month: "$paymentDate" },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { month: "$_id", total: 1, _id: 0 } },
    ]);
  },

  async countByStatus(): Promise<{ status: string; count: number; total: number }[]> {
    return Payment.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          total: { $sum: "$amount" },
        },
      },
      { $project: { status: "$_id", count: 1, total: 1, _id: 0 } },
    ]);
  },

  async outstandingByBooking(): Promise<{
    bookingId: string;
    totalQuoted: number;
    totalPaid: number;
    outstanding: number;
  }[]> {
    // Get all bookings with their payments
    const results = await Payment.aggregate([
      { $match: { status: "RECEIVED", booking: { $ne: null } } },
      {
        $group: {
          _id: "$booking",
          totalPaid: { $sum: "$amount" },
        },
      },
    ]);
    return results.map((r) => ({
      bookingId: String(r._id),
      totalQuoted: 0, // Will be enriched with booking data
      totalPaid: r.totalPaid,
      outstanding: 0,
    }));
  },

  /**
   * Received totals for a set of invoices, in one aggregation.
   *
   * Invoice lists need a paid figure per row; asking per invoice would be an
   * N+1 query, so the grouping happens here once and the caller merges.
   */
  async receivedTotalsByInvoice(invoiceIds: string[]): Promise<Map<string, number>> {
    if (invoiceIds.length === 0) return new Map();

    const rows = await Payment.aggregate([
      {
        $match: {
          status: "RECEIVED",
          invoice: { $in: invoiceIds.map((id) => new Types.ObjectId(id)) },
        },
      },
      { $group: { _id: "$invoice", paid: { $sum: "$amount" } } },
    ]);

    return new Map(rows.map((row) => [String(row._id), row.paid as number]));
  },

  /** Every payment recorded against one invoice, newest first. */
  async listByInvoice(invoiceId: string) {
    return Payment.find({ invoice: new Types.ObjectId(invoiceId) })
      .sort({ paymentDate: -1 })
      .populate("createdBy", "name")
      .lean();
  },
};
