import { Types } from "mongoose";
import { Invoice } from "@/models/Invoice";
import type { InvoiceListQuery } from "@bandhan/shared";

/**
 * Repository for Invoice access.
 *
 * Outstanding balances are never read from the invoice document — they are
 * derived from the Payment collection via the aggregations below, which keeps
 * one source of truth for money received.
 */

function populate(query: any) {
  return query
    .populate("customer", "name phone email address")
    .populate("event", "eventName eventDate")
    .populate("quotation", "quotationNumber")
    .populate("createdBy", "name")
    .populate("updatedBy", "name");
}

export const invoiceRepository = {
  async create(input: Record<string, unknown>) {
    return Invoice.create(input);
  },

  async findById(id: string) {
    return populate(Invoice.findById(id));
  },

  async findByIdRaw(id: string) {
    return Invoice.findById(id);
  },

  async findByIdLean(id: string) {
    return populate(Invoice.findById(id)).lean();
  },

  async updateById(id: string, update: Record<string, unknown>) {
    return populate(Invoice.findByIdAndUpdate(id, update, { new: true }));
  },

  async list(query: InvoiceListQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { archivedAt: null };

    if (query.status) filter.status = query.status;
    if (query.customer) filter.customer = new Types.ObjectId(query.customer);
    if (query.event) filter.event = new Types.ObjectId(query.event);
    if (query.overdue) {
      // Overdue is "past due date and not void" — the paid portion is applied
      // after the query, because it lives in the Payment collection.
      filter.dueDate = { $ne: null, $lt: new Date() };
      filter.status = { $nin: ["PAID", "VOID", "DRAFT"] };
    }

    if (query.from || query.to) {
      const range: Record<string, Date> = {};
      if (query.from) range.$gte = new Date(`${query.from}T00:00:00.000Z`);
      if (query.to) range.$lte = new Date(`${query.to}T23:59:59.999Z`);
      filter.issueDate = range;
    }

    if (query.search) {
      const term = query.search;
      filter.$or = [{ invoiceNumber: { $regex: term, $options: "i" } }, { notes: { $regex: term, $options: "i" } }];
    }

    const sort: Record<string, 1 | -1> = {};
    const field = query.sort?.replace("-", "") || "createdAt";
    sort[field === "grandTotal" ? "totals.grandTotalPaise" : field] = query.sort?.startsWith("-") ? -1 : 1;

    const [items, total] = await Promise.all([
      Invoice.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate("customer", "name phone")
        .populate("event", "eventName")
        .populate("quotation", "quotationNumber")
        .lean(),
      Invoice.countDocuments(filter),
    ]);

    return { items: items as any[], total };
  },

  async countByStatus(): Promise<Record<string, number>> {
    const rows = await Invoice.aggregate([
      { $match: { archivedAt: null } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    return Object.fromEntries(rows.map((row) => [row._id, row.count]));
  },

  /** Every live invoice id + total, for business-wide balance calculations. */
  async openTotals(): Promise<{ ids: string[]; totalPaise: number }> {
    const rows = await Invoice.aggregate([
      { $match: { archivedAt: null, status: { $nin: ["VOID", "DRAFT"] } } },
      { $group: { _id: null, ids: { $push: "$_id" }, totalPaise: { $sum: "$totals.grandTotalPaise" } } },
    ]);

    if (rows.length === 0) return { ids: [], totalPaise: 0 };
    return { ids: rows[0].ids.map(String), totalPaise: rows[0].totalPaise };
  },
};
