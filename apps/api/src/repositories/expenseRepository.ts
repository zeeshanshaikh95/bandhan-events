import { Types } from "mongoose";
import { Expense, type ExpenseDocument } from "@/models/Expense";
import type { FinanceQuery } from "@bandhan/shared";

/**
 * Repository for Expense CRUD operations.
 * Archived expenses are excluded by default.
 */

export const expenseRepository = {
  async create(input: Record<string, unknown>): Promise<ExpenseDocument> {
    return Expense.create(input);
  },

  async findById(id: string): Promise<ExpenseDocument | null> {
    return Expense.findById(id)
      .populate("vendor", "name")
      .populate("booking", "eventName");
  },

  async findByIdLean(id: string) {
    return Expense.findById(id)
      .populate("vendor", "name")
      .populate("booking", "eventName")
      .lean();
  },

  async updateById(id: string, update: Record<string, unknown>): Promise<ExpenseDocument | null> {
    return Expense.findByIdAndUpdate(id, update, { new: true })
      .populate("vendor", "name")
      .populate("booking", "eventName");
  },

  async archiveById(id: string): Promise<ExpenseDocument | null> {
    return Expense.findByIdAndUpdate(
      id,
      { archivedAt: new Date() },
      { new: true }
    );
  },

  async list(query: FinanceQuery): Promise<{ items: ExpenseDocument[]; total: number }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { archivedAt: null };

    if (query.startDate || query.endDate) {
      const dateFilter: Record<string, Date> = {};
      if (query.startDate) dateFilter.$gte = new Date(query.startDate);
      if (query.endDate) dateFilter.$lte = new Date(query.endDate);
      filter.date = dateFilter;
    }

    if (query.category) filter.category = query.category;
    if (query.method) filter.paymentMethod = query.method;
    if (query.booking) filter.booking = new Types.ObjectId(query.booking);

    if (query.search) {
      filter.$or = [
        { description: { $regex: query.search, $options: "i" } },
        { vendorName: { $regex: query.search, $options: "i" } },
        { notes: { $regex: query.search, $options: "i" } },
      ];
    }

    const sort: Record<string, 1 | -1> = {};
    const sortField = query.sort?.replace("-", "") || "date";
    sort[sortField] = query.sort?.startsWith("-") ? -1 : 1;

    const [items, total] = await Promise.all([
      Expense.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate("vendor", "name")
        .populate("booking", "eventName")
        .populate("createdBy", "name")
        .lean(),
      Expense.countDocuments(filter),
    ]);

    return { items: items as any[], total };
  },

  async totalExpenses(): Promise<number> {
    const result = await Expense.aggregate([
      { $match: { archivedAt: null } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    return result[0]?.total || 0;
  },

  async totalByDateRange(start: Date, end: Date): Promise<number> {
    const result = await Expense.aggregate([
      { $match: { archivedAt: null, date: { $gte: start, $lt: end } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    return result[0]?.total || 0;
  },

  async totalByBooking(bookingId: string): Promise<number> {
    const result = await Expense.aggregate([
      { $match: { booking: new Types.ObjectId(bookingId), archivedAt: null } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    return result[0]?.total || 0;
  },

  async monthlyExpenses(year: number): Promise<{ month: number; total: number }[]> {
    return Expense.aggregate([
      {
        $match: {
          archivedAt: null,
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

  async byCategory(): Promise<{ category: string; total: number }[]> {
    return Expense.aggregate([
      { $match: { archivedAt: null } },
      {
        $group: {
          _id: "$category",
          total: { $sum: "$amount" },
        },
      },
      { $sort: { total: -1 } },
      { $project: { category: "$_id", total: 1, _id: 0 } },
    ]);
  },

  async byCategoryDateRange(start: Date, end: Date): Promise<{ category: string; total: number }[]> {
    return Expense.aggregate([
      { $match: { archivedAt: null, date: { $gte: start, $lt: end } } },
      {
        $group: {
          _id: "$category",
          total: { $sum: "$amount" },
        },
      },
      { $sort: { total: -1 } },
      { $project: { category: "$_id", total: 1, _id: 0 } },
    ]);
  },
};
