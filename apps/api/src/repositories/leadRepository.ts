import type { FilterQuery, Types } from "mongoose";
import type { LeadListQuery, StageConfiguration } from "@bandhan/shared";
import { Lead, type LeadDocument } from "@/models/Lead";

interface CreateLeadInput {
  name: string;
  phone: string;
  email?: string;
  eventType: string;
  eventDate?: Date;
  guestCount?: number;
  serviceRequired: string;
  budget?: string;
  message?: string;
  source: string;
  status?: string;
  assignedTo?: string;
  nextFollowUpAt?: Date;
  pagePath?: string;
  stageConfiguration?: StageConfiguration;
}

export const leadRepository = {
  async create(input: CreateLeadInput): Promise<LeadDocument> {
    const document: Record<string, unknown> = { ...input };
    if (!input.email) document.email = null;
    if (!input.eventDate) document.eventDate = null;
    if (input.assignedTo) document.assignedTo = input.assignedTo;
    // Mongoose would otherwise drop the key entirely when absent — the DTO
    // expects an explicit null so `stageConfiguration` never flips shape.
    if (!input.stageConfiguration) document.stageConfiguration = null;
    return Lead.create(document);
  },

  async findById(id: string): Promise<LeadDocument | null> {
    return Lead.findOne({ _id: id, archivedAt: null }).populate("assignedTo", "name email role");
  },

  async findByIdWithNotes(id: string): Promise<LeadDocument | null> {
    return Lead.findOne({ _id: id, archivedAt: null }).select("+notes").populate("assignedTo", "name email role");
  },

  /**
   * Server-side pagination — the admin never downloads a whole collection.
   * The search term is escaped before it reaches the regex, so a crafted
   * string cannot become an expensive or surprising query (ReDoS / injection).
   */
  async list(query: LeadListQuery): Promise<{ items: LeadDocument[]; total: number }> {
    const filter: FilterQuery<LeadDocument> = { archivedAt: null };

    if (query.status) filter.status = query.status;
    if (query.source) filter.source = query.source;
    if (query.assignedTo) filter.assignedTo = query.assignedTo;
    if (query.from || query.to) {
      filter.createdAt = {
        ...(query.from ? { $gte: query.from } : {}),
        ...(query.to ? { $lte: query.to } : {}),
      };
    }
    if (query.search) {
      const term = query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { name: { $regex: term, $options: "i" } },
        { phone: { $regex: term, $options: "i" } },
        { email: { $regex: term, $options: "i" } },
        { message: { $regex: term, $options: "i" } },
      ];
    }

    const skip = (query.page - 1) * query.limit;
    const [items, total] = await Promise.all([
      Lead.find(filter)
        .sort(query.sort)
        .skip(skip)
        .limit(query.limit)
        .populate("assignedTo", "name email role"),
      Lead.countDocuments(filter),
    ]);

    return { items, total };
  },

  async updateById(id: string, update: Record<string, unknown>): Promise<LeadDocument | null> {
    return Lead.findOneAndUpdate({ _id: id, archivedAt: null }, update, {
      new: true,
      runValidators: true,
    }).populate("assignedTo", "name email role");
  },

  async addNote(
    id: string,
    note: { body: string; author: Types.ObjectId | null; authorName: string }
  ): Promise<LeadDocument | null> {
    return Lead.findOneAndUpdate(
      { _id: id, archivedAt: null },
      { $push: { notes: { ...note, createdAt: new Date() } } },
      { new: true, runValidators: true }
    ).populate("assignedTo", "name email role");
  },

  async archiveById(id: string): Promise<LeadDocument | null> {
    return Lead.findOneAndUpdate(
      { _id: id, archivedAt: null },
      { $set: { archivedAt: new Date() } },
      { new: true }
    );
  },

  /** Dashboard counters. */
  async countCreatedSince(since: Date): Promise<number> {
    return Lead.countDocuments({ createdAt: { $gte: since }, archivedAt: null });
  },

  async countByStatus(): Promise<Array<{ _id: string; count: number }>> {
    return Lead.aggregate<{ _id: string; count: number }>([
      { $match: { archivedAt: null } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
  },

  async countBySource(): Promise<Array<{ _id: string; count: number }>> {
    return Lead.aggregate<{ _id: string; count: number }>([
      { $match: { archivedAt: null } },
      { $group: { _id: "$source", count: { $sum: 1 } } },
    ]);
  },

  async countFollowUpsDue(until: Date): Promise<number> {
    return Lead.countDocuments({
      archivedAt: null,
      nextFollowUpAt: { $ne: null, $lte: until },
      status: { $nin: ["COMPLETED", "LOST"] },
    });
  },

  async recent(limit: number): Promise<LeadDocument[]> {
    return Lead.find({ archivedAt: null }).sort({ createdAt: -1 }).limit(limit);
  },
};
