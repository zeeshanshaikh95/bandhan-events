import { SyncLog, type SyncLogInput } from "@/models/SyncLog";

/**
 * Repository for SyncLog CRUD operations.
 * Keeps database access centralized and testable.
 */

export interface SyncLogListQuery {
  page?: number;
  limit?: number;
  module?: string;
  status?: string;
  operation?: string;
  startDate?: string;
  endDate?: string;
  sort?: string;
}

export const syncLogRepository = {
  async create(input: SyncLogInput) {
    return SyncLog.create(input);
  },

  async findById(id: string) {
    return SyncLog.findById(id).lean();
  },

  async list(query: SyncLogListQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

    if (query.module) filter.module = query.module;
    if (query.status) filter.status = query.status;
    if (query.operation) filter.operation = query.operation;

    if (query.startDate || query.endDate) {
      const dateFilter: Record<string, Date> = {};
      if (query.startDate) dateFilter.$gte = new Date(query.startDate);
      if (query.endDate) dateFilter.$lte = new Date(query.endDate);
      filter.createdAt = dateFilter;
    }

    const sort: Record<string, 1 | -1> = { createdAt: -1 };

    const [items, total] = await Promise.all([
      SyncLog.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      SyncLog.countDocuments(filter),
    ]);

    return { items: items as any[], total };
  },

  async getLatestSyncTime() {
    const latest = await SyncLog.findOne({ status: "success" })
      .sort({ createdAt: -1 })
      .lean();
    return (latest as any)?.createdAt || null;
  },

  async getLatestError() {
    const latest = await SyncLog.findOne({ status: "failed" })
      .sort({ createdAt: -1 })
      .lean();
    return (latest as any)?.errorMessage || null;
  },

  async countByModule(): Promise<Record<string, number>> {
    const counts = await SyncLog.aggregate([
      { $group: { _id: "$module", count: { $sum: 1 } } },
    ]);
    return counts.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {} as Record<string, number>);
  },

  async cleanup(olderThanDays: number): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);
    const result = await SyncLog.deleteMany({ createdAt: { $lt: cutoff } });
    return result.deletedCount;
  },
};
