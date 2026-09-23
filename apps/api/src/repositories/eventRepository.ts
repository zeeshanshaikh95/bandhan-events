import { Types } from "mongoose";
import { Event, type EventDocument } from "@/models/Event";
import type { EventListQuery } from "@bandhan/shared";

/**
 * Repository for Event CRUD operations.
 * Keeps database access centralized and testable.
 */

export const eventRepository = {
  async create(input: Record<string, unknown>): Promise<EventDocument> {
    return Event.create(input);
  },

  async findById(id: string): Promise<EventDocument | null> {
    return Event.findById(id)
      .populate("customer", "name phone email")
      .populate("lead", "name phone")
      .populate("vendors.vendor", "name phone email type status")
      .populate("team.user", "name email")
      .populate("eventNotes.author", "name")
      .populate("createdBy", "name")
      .populate("updatedBy", "name");
  },

  /**
   * Unpopulated. Used by the vendor-assignment writes, which need the raw
   * ObjectId refs — reading a populated vendor document back as a string id is
   * how a subdocument update silently targets nothing.
   */
  async findByIdRaw(id: string): Promise<EventDocument | null> {
    return Event.findById(id);
  },

  async findByIdLean(id: string) {
    return Event.findById(id)
      .populate("customer", "name phone email")
      .populate("lead", "name phone")
      .populate("vendors.vendor", "name phone email type status")
      .populate("team.user", "name email")
      .populate("eventNotes.author", "name")
      .populate("createdBy", "name")
      .populate("updatedBy", "name")
      .lean();
  },

  async updateById(id: string, update: Record<string, unknown>): Promise<EventDocument | null> {
    return Event.findByIdAndUpdate(id, update, { new: true })
      .populate("customer", "name phone email")
      .populate("lead", "name phone")
      .populate("vendors.vendor", "name phone email")
      .populate("team.user", "name email")
      .populate("eventNotes.author", "name")
      .populate("createdBy", "name")
      .populate("updatedBy", "name");
  },

  async archiveById(id: string): Promise<EventDocument | null> {
    return Event.findByIdAndUpdate(id, { archivedAt: new Date() }, { new: true });
  },

  async list(query: EventListQuery): Promise<{ items: EventDocument[]; total: number }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { archivedAt: null };

    // Date range filter
    if (query.startDate || query.endDate) {
      const dateFilter: Record<string, Date> = {};
      if (query.startDate) dateFilter.$gte = new Date(query.startDate);
      if (query.endDate) dateFilter.$lte = new Date(query.endDate);
      filter.eventDate = dateFilter;
    }

    if (query.eventType) filter.eventType = query.eventType;
    if (query.status) filter.status = query.status;
    if (query.paymentStatus) filter.paymentStatus = query.paymentStatus;
    if (query.customer) filter.customer = new Types.ObjectId(query.customer);

    // Text search
    if (query.search) {
      filter.$or = [
        { eventName: { $regex: query.search, $options: "i" } },
        { venue: { $regex: query.search, $options: "i" } },
        { notes: { $regex: query.search, $options: "i" } },
      ];
    }

    const sort: Record<string, 1 | -1> = {};
    const sortField = query.sort?.replace("-", "") || "eventDate";
    sort[sortField] = query.sort?.startsWith("-") ? -1 : 1;

    const [items, total] = await Promise.all([
      Event.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate("customer", "name phone")
        .populate("createdBy", "name")
        .lean(),
      Event.countDocuments(filter),
    ]);

    return { items: items as any[], total };
  },

  async upcomingEvents(days: number = 30): Promise<EventDocument[]> {
    const now = new Date();
    const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    return Event.find({
      archivedAt: null,
      eventDate: { $gte: now, $lte: future },
      status: { $nin: ["COMPLETED", "CANCELLED"] },
    })
      .sort({ eventDate: 1 })
      .populate("customer", "name phone")
      .limit(20)
      .lean() as any;
  },

  async calendarEvents(start: Date, end: Date): Promise<EventDocument[]> {
    return Event.find({
      archivedAt: null,
      eventDate: { $gte: start, $lte: end },
    })
      .sort({ eventDate: 1 })
      .populate("customer", "name")
      .lean() as any;
  },

  async countByStatus(): Promise<{ status: string; count: number }[]> {
    return Event.aggregate([
      { $match: { archivedAt: null } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $project: { status: "$_id", count: 1, _id: 0 } },
    ]);
  },

  async countByMonth(year: number): Promise<{ month: number; count: number }[]> {
    return Event.aggregate([
      {
        $match: {
          archivedAt: null,
          eventDate: {
            $gte: new Date(`${year}-01-01`),
            $lt: new Date(`${year + 1}-01-01`),
          },
        },
      },
      { $group: { _id: { $month: "$eventDate" }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $project: { month: "$_id", count: 1, _id: 0 } },
    ]);
  },

  // ── Vendor assignments ─────────────────────────────────────────────────────
  //
  // Assignments are subdocuments of the event, so every write targets the
  // parent document and is atomic on it: two people editing the vendor list of
  // one wedding cannot interleave into a half-written list.

  /** Adds one assignment and returns the event with vendors populated. */
  async pushVendorAssignment(
    eventId: string,
    assignment: Record<string, unknown>
  ): Promise<EventDocument | null> {
    return Event.findByIdAndUpdate(
      eventId,
      { $push: { vendors: assignment } },
      { new: true, runValidators: true }
    ).populate("vendors.vendor", "name phone email type status");
  },

  /** Updates one assignment by its subdocument id. */
  async updateVendorAssignment(
    eventId: string,
    assignmentId: string,
    update: Record<string, unknown>
  ): Promise<EventDocument | null> {
    const $set = Object.fromEntries(
      Object.entries(update).map(([key, value]) => [`vendors.$[assignment].${key}`, value])
    );

    return Event.findByIdAndUpdate(
      eventId,
      { $set },
      { new: true, arrayFilters: [{ "assignment._id": new Types.ObjectId(assignmentId) }] }
    ).populate("vendors.vendor", "name phone email type status");
  },

  async pullVendorAssignment(
    eventId: string,
    assignmentId: string
  ): Promise<EventDocument | null> {
    return Event.findByIdAndUpdate(
      eventId,
      { $pull: { vendors: { _id: new Types.ObjectId(assignmentId) } } },
      { new: true }
    ).populate("vendors.vendor", "name phone email type status");
  },

  /** One assignment, with its vendor populated. */
  async findVendorAssignment(eventId: string, assignmentId: string) {
    const event = await Event.findOne(
      { _id: eventId, "vendors._id": assignmentId },
      { eventName: true, eventDate: true, customer: true, vendors: { $elemMatch: { _id: assignmentId } } }
    )
      .populate("vendors.vendor", "name phone email type status")
      .lean();

    return event as { vendors?: any[] } | null;
  },

  /**
   * Every event a vendor is assigned to, newest first.
   * Aggregated rather than fetched-then-filtered so a vendor's history does not
   * depend on how many events exist in total.
   */
  async findEventsForVendor(vendorId: string, limit = 100) {
    return Event.aggregate([
      { $match: { archivedAt: null, "vendors.vendor": new Types.ObjectId(vendorId) } },
      { $unwind: "$vendors" },
      { $match: { "vendors.vendor": new Types.ObjectId(vendorId) } },
      { $sort: { eventDate: -1 } },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          eventId: "$_id",
          eventName: 1,
          eventDate: 1,
          eventStatus: "$status",
          assignmentId: { $toString: "$vendors._id" },
          service: "$vendors.service",
          role: "$vendors.role",
          agreedCost: "$vendors.agreedCost",
          assignmentStatus: "$vendors.status",
          expenseId: { $toString: "$vendors.expense" },
        },
      },
    ]);
  },

  /** Assignment ids on one event — used to batch vendor payment lookups. */
  async assignmentIdsForEvent(eventId: string): Promise<string[]> {
    const event = await Event.findById(eventId).select("vendors._id").lean();
    return ((event as any)?.vendors ?? []).map((row: any) => String(row._id));
  },

  /**
   * Contracted vendor cost and event count per vendor, for a page of vendors.
   * One aggregation for the whole page — the list would otherwise need a query
   * per row.
   */
  async vendorSpendByVendorIds(
    vendorIds: string[]
  ): Promise<Map<string, { contracted: number; events: number }>> {
    if (vendorIds.length === 0) return new Map();

    const ids = vendorIds.map((id) => new Types.ObjectId(id));
    const rows = await Event.aggregate([
      { $match: { archivedAt: null, "vendors.vendor": { $in: ids } } },
      { $unwind: "$vendors" },
      { $match: { "vendors.vendor": { $in: ids } } },
      {
        $group: {
          _id: "$vendors.vendor",
          contracted: { $sum: "$vendors.agreedCost" },
          events: { $addToSet: "$_id" },
        },
      },
    ]);

    return new Map(
      rows.map((row) => [String(row._id), { contracted: row.contracted ?? 0, events: row.events.length }])
    );
  },

  async addNote(eventId: string, note: {
    body: string;
    author?: Types.ObjectId;
    authorName: string;
  }): Promise<EventDocument | null> {
    return Event.findByIdAndUpdate(
      eventId,
      {
        $push: {
          eventNotes: {
            body: note.body,
            author: note.author,
            authorName: note.authorName,
          },
        },
      },
      { new: true }
    );
  },
};
