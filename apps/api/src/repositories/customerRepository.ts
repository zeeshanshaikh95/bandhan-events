import { Customer } from "@/models/Customer";
import type { CustomerListQuery } from "@bandhan/shared";

/**
 * Repository for Customer CRUD. Archived customers are excluded everywhere.
 */
export const customerRepository = {
  async create(input: Record<string, unknown>) {
    return Customer.create(input);
  },

  async findById(id: string) {
    return Customer.findOne({ _id: id, archivedAt: null });
  },

  async findByIdLean(id: string) {
    return Customer.findOne({ _id: id, archivedAt: null }).lean();
  },

  async updateById(id: string, update: Record<string, unknown>) {
    return Customer.findOneAndUpdate({ _id: id, archivedAt: null }, update, { new: true });
  },

  async archiveById(id: string) {
    return Customer.findOneAndUpdate({ _id: id, archivedAt: null }, { archivedAt: new Date() }, { new: true });
  },

  /** Every live customer sharing a normalised phone — the duplicate signal. */
  async findByPhoneNormalized(phoneNormalized: string) {
    return Customer.find({ phoneNormalized, archivedAt: null }).lean();
  },

  async list(query: CustomerListQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { archivedAt: null };

    if (query.search) {
      const term = query.search;
      // Digits-only term also matches a formatted phone number.
      const digits = term.replace(/\D/g, "");
      filter.$or = [
        { name: { $regex: term, $options: "i" } },
        { phone: { $regex: term, $options: "i" } },
        { email: { $regex: term, $options: "i" } },
        ...(digits.length >= 3 ? [{ phoneNormalized: { $regex: digits } }] : []),
      ];
    }

    const sort: Record<string, 1 | -1> = {};
    const field = query.sort?.replace("-", "") || "name";
    sort[field] = query.sort?.startsWith("-") ? -1 : 1;

    const [items, total] = await Promise.all([
      Customer.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      Customer.countDocuments(filter),
    ]);

    return { items: items as any[], total };
  },
};
