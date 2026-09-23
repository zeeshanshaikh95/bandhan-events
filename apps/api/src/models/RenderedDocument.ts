import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";
import { DOCUMENT_KINDS } from "@bandhan/shared";

/**
 * ---------------------------------------------------------------------------
 * RENDERED DOCUMENT
 * ---------------------------------------------------------------------------
 * Stores generated PDFs (quotation, invoice, receipt).
 *
 * The project's Cloudinary/S3 integration is still a stub, so the working
 * default keeps the bytes in MongoDB and serves them through an authenticated
 * API route. That means:
 *
 *   - no object-storage credentials exist in the browser,
 *   - a document URL is useless without a valid session, and
 *   - a private quotation can never leak via a guessed public link.
 *
 * Swapping the bytes for a storage key later only changes `pdfService` and the
 * download handler — the document id in the quotation/invoice never moves.
 *
 * PDFs are small (tens of KB) and capped at 5 MB, well inside Mongo's 16 MB
 * document limit.
 */

const renderedDocumentSchema = new Schema(
  {
    kind: { type: String, enum: DOCUMENT_KINDS, required: true, index: true },
    fileName: { type: String, required: true, trim: true, maxlength: 200 },
    mimeType: { type: String, required: true, default: "application/pdf" },
    sizeBytes: { type: Number, required: true, min: 0 },

    /** The PDF itself. Never selected in list queries. */
    data: { type: Schema.Types.Buffer, required: false },

    /** Loose back-references so a document can be traced to its record. */
    entityType: { type: String, required: true, index: true },
    entityId: { type: Schema.Types.ObjectId, required: true, index: true },

    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    archivedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.__v;
        delete ret.data; // the buffer never travels in JSON
        return ret;
      },
    },
  }
);

renderedDocumentSchema.index({ createdAt: -1 });
renderedDocumentSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

export type RenderedDocumentDocument = HydratedDocument<
  InferSchemaType<typeof renderedDocumentSchema>
>;

export const RenderedDocument = model("RenderedDocument", renderedDocumentSchema);

/** Documents larger than this are rejected rather than silently truncated. */
export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;
