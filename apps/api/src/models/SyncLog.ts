import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

/**
 * ---------------------------------------------------------------------------
 * SYNC LOG
 * ---------------------------------------------------------------------------
 * Tracks every Google Sheets synchronization attempt for debugging and
 * auditing. Each record captures the operation, module, MongoDB record ID,
 * Google Sheet row number, timestamp, status, and error message.
 */

const syncLogSchema = new Schema(
  {
    operation: {
      type: String,
      enum: ["create", "update", "read", "delete"],
      required: true,
      index: true,
    },
    module: {
      type: String,
      enum: [
        "lead",
        "expense",
        "investment",
        "payment",
        "event",
        "quotation",
        "invoice",
        "vendor",
        "assignment",
      ],
      required: true,
      index: true,
    },
    recordId: {
      type: String,
      required: true,
      index: true,
    },
    sheetName: {
      type: String,
      required: true,
    },
    sheetRowNumber: {
      type: Number,
      default: null,
    },
    status: {
      type: String,
      enum: ["pending", "success", "failed"],
      required: true,
      index: true,
    },
    errorMessage: {
      type: String,
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes for common queries
syncLogSchema.index({ createdAt: -1 });
syncLogSchema.index({ module: 1, status: 1 });
syncLogSchema.index({ recordId: 1, module: 1 });
syncLogSchema.index({ status: 1, createdAt: -1 });

export type SyncLogDocument = HydratedDocument<InferSchemaType<typeof syncLogSchema>>;

export const SyncLog = model("SyncLog", syncLogSchema);

export interface SyncLogInput {
  operation: "create" | "update" | "read" | "delete";
  module:
    | "lead"
    | "expense"
    | "investment"
    | "payment"
    | "event"
    | "quotation"
    | "invoice"
    | "vendor"
    | "assignment";
  recordId: string;
  sheetName: string;
  sheetRowNumber?: number | null;
  status: "pending" | "success" | "failed";
  errorMessage?: string | null;
  metadata?: Record<string, unknown>;
}

export interface SyncLogDto {
  id: string;
  operation: string;
  module: string;
  recordId: string;
  sheetName: string;
  sheetRowNumber: number | null;
  status: string;
  errorMessage: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export function toSyncLogDto(log: SyncLogDocument): SyncLogDto {
  return {
    id: String(log._id),
    operation: log.operation,
    module: log.module,
    recordId: log.recordId,
    sheetName: log.sheetName,
    sheetRowNumber: log.sheetRowNumber ?? null,
    status: log.status,
    errorMessage: log.errorMessage ?? null,
    metadata: (log.metadata as Record<string, unknown>) || {},
    createdAt: (log.createdAt as Date).toISOString(),
  };
}
