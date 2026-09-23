import { Investment, type InvestmentDocument } from "@/models/Investment";
import type { FinanceQuery } from "@bandhan/shared";

/**
 * Repository for Investment CRUD operations.
 */

export const investmentRepository = {
  async create(input: Record<string, unknown>): Promise<InvestmentDocument> {
    return Investment.create(input);
  },

  async findById(id: string): Promise<InvestmentDocument | null> {
    return Investment.findById(id);
  },

  async findByIdLean(id: string) {
    return Investment.findById(id).lean();
  },

  async updateById(id: string, update: Record<string, unknown>): Promise<InvestmentDocument | null> {
    return Investment.findByIdAndUpdate(id, update, { new: true });
  },

  async list(query: FinanceQuery): Promise<{ items: InvestmentDocument[]; total: number }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

    if (query.startDate || query.endDate) {
      const dateFilter: Record<string, Date> = {};
      if (query.startDate) dateFilter.$gte = new Date(query.startDate);
      if (query.endDate) dateFilter.$lte = new Date(query.endDate);
      filter.date = dateFilter;
    }

    if (query.partner) filter.partner = { $regex: query.partner, $options: "i" };

    if (query.search) {
      filter.$or = [
        { partner: { $regex: query.search, $options: "i" } },
        { purpose: { $regex: query.search, $options: "i" } },
        { notes: { $regex: query.search, $options: "i" } },
      ];
    }

    const sort: Record<string, 1 | -1> = {};
    const sortField = query.sort?.replace("-", "") || "date";
    sort[sortField] = query.sort?.startsWith("-") ? -1 : 1;

    const [items, total] = await Promise.all([
      Investment.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate("createdBy", "name")
        .lean(),
      Investment.countDocuments(filter),
    ]);

    return { items: items as any[], total };
  },

  async totalInvested(): Promise<number> {
    const result = await Investment.aggregate([
      {
        $match: { type: { $in: ["capital", "additional-contribution"] } },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    return result[0]?.total || 0;
  },

  async totalByPartner(): Promise<{ partner: string; total: number }[]> {
    return Investment.aggregate([
      {
        $match: { type: { $in: ["capital", "additional-contribution"] } },
      },
      {
        $group: {
          _id: "$partner",
          total: { $sum: "$amount" },
        },
      },
      { $sort: { total: -1 } },
      { $project: { partner: "$_id", total: 1, _id: 0 } },
    ]);
  },

  async monthlyInvestments(year: number): Promise<{ month: number; total: number }[]> {
    return Investment.aggregate([
      {
        $match: {
          type: { $in: ["capital", "additional-contribution"] },
          date: {
            $gte: new Date(`${year}-01-01`),
            $lt: new Date(`${year + 1}-01-01`),
          },
        },
      },
      {
        $group: {
          _id: { $month: "$date" },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { month: "$_id", total: 1, _id: 0 } },
    ]);
  },
};
