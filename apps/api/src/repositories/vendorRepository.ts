import { Types } from "mongoose";
import { Vendor } from "@/models/Vendor";
import type { VendorDocument } from "@/models/Vendor";
import type { VendorListQuery } from "@bandhan/shared";

/**
 * Repository for Vendor access. Everything except the `Raw` variants populates
 * the two audit references the detail page renders.
 */

const AUDIT_FIELDS = "name";

function populate(query: any) {
  return query.populate("createdBy", AUDIT_FIELDS).populate("updatedBy", AUDIT_FIELDS);
}

export const vendorRepository = {
  async create(input: Record<string, unknown>): Promise<VendorDocument> {
    return Vendor.create(input);
  },

  async findById(id: string) {
    return populate(Vendor.findById(id));
  },

  /** Unpopulated — for logic that only needs ids and stored values. */
  async findByIdRaw(id: string): Promise<VendorDocument | null> {
    return Vendor.findById(id);
  },

  async updateById(id: string, update: Record<string, unknown>) {
    return populate(Vendor.findByIdAndUpdate(id, update, { new: true }));
  },

  /**
   * Soft delete. A vendor referenced by history is never removed; the record
   * is taken out of circulation instead so past events, expenses and payments
   * keep resolving.
   */
  async archiveById(id: string) {
    return Vendor.findByIdAndUpdate(
      id,
      { archivedAt: new Date(), status: "INACTIVE" },
      { new: true }
    );
  },

  async addNote(
    id: string,
    note: { body: string; author: Types.ObjectId | null; authorName: string }
  ) {
    return populate(
      Vendor.findByIdAndUpdate(id, { $push: { noteLog: note } }, { new: true })
    );
  },

  async list(query: VendorListQuery): Promise<{ items: VendorDocument[]; total: number }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { archivedAt: null };
    if (query.type) filter.type = query.type;
    if (query.status) filter.status = query.status;
    if (query.city) filter.city = new RegExp(`^${escapeRegex(query.city)}`, "i");
    if (query.area) filter.area = new RegExp(`^${escapeRegex(query.area)}`, "i");
    if (query.category) filter.category = new RegExp(`^${escapeRegex(query.category)}`, "i");
    if (query.activeOnly) filter.status = "ACTIVE";

    if (query.search) {
      // Matched against exactly the fields the person would type.
      const term = new RegExp(escapeRegex(query.search), "i");
      filter.$or = [
        { name: term },
        { company: term },
        { contactPerson: term },
        { phone: term },
        { whatsapp: term },
        { email: term },
        { services: term },
        { city: term },
        { area: term },
      ];
    }

    const sort: Record<string, 1 | -1> = {};
    const field = query.sort?.replace("-", "") || "name";
    sort[field] = query.sort?.startsWith("-") ? -1 : 1;

    const [items, total] = await Promise.all([
      populate(Vendor.find(filter).sort(sort).skip(skip).limit(limit)),
      Vendor.countDocuments(filter),
    ]);

    return { items, total };
  },

  /** Options for the city filter — only cities actually in use. */
  async distinctCities(): Promise<string[]> {
    const values = await Vendor.distinct("city", { archivedAt: null, city: { $ne: "" } });
    return (values as string[]).sort((a, b) => a.localeCompare(b));
  },

  async countByStatus(): Promise<Record<string, number>> {
    const rows = await Vendor.aggregate([
      { $match: { archivedAt: null } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    return Object.fromEntries(rows.map((row) => [row._id, row.count]));
  },

  async findDuplicate(name: string, phone: string) {
    const filter: Record<string, unknown> = { archivedAt: null };
    const clauses: Record<string, unknown>[] = [
      { name: new RegExp(`^${escapeRegex(name)}$`, "i") },
    ];
    if (phone) clauses.push({ phone });
    filter.$or = clauses;
    return Vendor.findOne(filter).select("name phone").lean();
  },
};

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
