import { Types } from "mongoose";
import { Quotation } from "@/models/Quotation";
import type { QuotationListQuery } from "@bandhan/shared";

/**
 * Repository for Quotation access. Everything except `findByIdLean` populates
 * the references the dashboard renders, so a list of 20 quotations costs a
 * bounded number of queries rather than one per row.
 */

const CUSTOMER_FIELDS = "name phone email address";
const EVENT_FIELDS = "eventName eventDate";

function populate(query: any) {
  return query
    .populate("customer", CUSTOMER_FIELDS)
    .populate("lead", "name phone")
    .populate("event", EVENT_FIELDS)
    .populate("createdBy", "name")
    .populate("updatedBy", "name");
}

export const quotationRepository = {
  async create(input: Record<string, unknown>) {
    return Quotation.create(input);
  },

  async findById(id: string) {
    return populate(Quotation.findById(id));
  },

  /** Unpopulated — used by pricing/conversion logic that reads raw ids. */
  async findByIdRaw(id: string) {
    return Quotation.findById(id);
  },

  async findByIdLean(id: string) {
    return populate(Quotation.findById(id)).lean();
  },

  async updateById(id: string, update: Record<string, unknown>) {
    return populate(Quotation.findByIdAndUpdate(id, update, { new: true }));
  },

  /**
   * Rewrites a sent quotation: the superseded content is archived and the live
   * version number advances in a single atomic write, so two simultaneous edits
   * cannot interleave into a half-recorded history.
   *
   * `versionEntry` already carries the snapshot of the version being replaced;
   * `$push` appends, so `versions` stays in chronological order and the live
   * version is always `versions.length + 1`.
   */
  async createNewVersion(
    id: string,
    versionEntry: Record<string, unknown>,
    update: Record<string, unknown>
  ) {
    return populate(
      Quotation.findByIdAndUpdate(
        id,
        {
          $set: update,
          $push: { versions: versionEntry },
          $inc: { version: 1 },
        },
        { new: true }
      )
    );
  },

  async archiveById(id: string) {
    return Quotation.findByIdAndUpdate(id, { archivedAt: new Date() }, { new: true });
  },

  async list(query: QuotationListQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { archivedAt: null };

    if (query.status) filter.status = query.status;
    if (query.customer) filter.customer = new Types.ObjectId(query.customer);
    if (query.event) filter.event = new Types.ObjectId(query.event);

    if (query.from || query.to) {
      const range: Record<string, Date> = {};
      if (query.from) range.$gte = new Date(`${query.from}T00:00:00.000Z`);
      if (query.to) range.$lte = new Date(`${query.to}T23:59:59.999Z`);
      filter.issueDate = range;
    }

    if (query.search) {
      const term = query.search;
      filter.$or = [
        { quotationNumber: { $regex: term, $options: "i" } },
        { packageName: { $regex: term, $options: "i" } },
      ];
    }

    const sort: Record<string, 1 | -1> = {};
    const field = query.sort?.replace("-", "") || "createdAt";
    sort[field === "grandTotal" ? "totals.grandTotalPaise" : field] = query.sort?.startsWith("-")
      ? -1
      : 1;

    const [items, total] = await Promise.all([
      Quotation.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate("customer", CUSTOMER_FIELDS)
        .populate("event", EVENT_FIELDS)
        .lean(),
      Quotation.countDocuments(filter),
    ]);

    return { items: items as any[], total };
  },

  async countByStatus(): Promise<Record<string, number>> {
    const rows = await Quotation.aggregate([
      { $match: { archivedAt: null } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    return Object.fromEntries(rows.map((row) => [row._id, row.count]));
  },

  async sumAcceptedValue(): Promise<number> {
    const rows = await Quotation.aggregate([
      { $match: { archivedAt: null, status: "ACCEPTED" } },
      { $group: { _id: null, total: { $sum: "$totals.grandTotalPaise" } } },
    ]);
    return rows[0]?.total ?? 0;
  },

  /** Open quotations whose validity date has passed but status has not caught up. */
  async findLapsedOpen(now: Date) {
    return Quotation.find({
      archivedAt: null,
      status: { $in: ["DRAFT", "SENT", "NEGOTIATION"] },
      validUntil: { $ne: null, $lt: now },
    })
      .select("_id validUntil")
      .lean();
  },
};
