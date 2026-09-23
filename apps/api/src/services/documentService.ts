import { Types } from "mongoose";
import type { DocumentDto, DocumentKind } from "@bandhan/shared";
import { MAX_DOCUMENT_BYTES, RenderedDocument } from "@/models/RenderedDocument";
import type { AuthContext } from "@/types/auth";
import { ApiError } from "@/utils/ApiError";

/**
 * ---------------------------------------------------------------------------
 * DOCUMENT SERVICE
 * ---------------------------------------------------------------------------
 * Stores generated PDFs and hands them back to authorised callers only.
 *
 * Access model: a document is reachable exclusively through
 * `GET /api/v1/documents/:id`, which runs the normal session + permission
 * checks. There is no public URL and no storage credential in the browser, so
 * a customer's quotation cannot be fetched by guessing an id or by reading the
 * front-end bundle.
 *
 * The storage provider is swappable: `store` is the only function that would
 * change to move the bytes into S3/Cloudinary. Nothing else in the codebase
 * knows how a document is persisted.
 */

function toDocumentDto(document: any): DocumentDto {
  return {
    id: String(document._id),
    kind: document.kind as DocumentKind,
    fileName: document.fileName,
    mimeType: document.mimeType,
    sizeBytes: document.sizeBytes,
    downloadUrl: `/api/v1/documents/${String(document._id)}`,
    createdAt: (document.createdAt as Date)?.toISOString() || "",
  };
}

/**
 * Accepted upload types. An allow-list rather than a deny-list: anything not
 * named here is refused, including anything executable. The extension is never
 * trusted — the caller's declared type is checked, and the bytes are served
 * back with the stored type, never sniffed.
 */
export const ALLOWED_DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

export const MAX_UPLOAD_BYTES = MAX_DOCUMENT_BYTES;

export const documentService = {
  async store(input: {
    kind: DocumentKind;
    fileName: string;
    data: Buffer;
    entityType: string;
    entityId: string;
    actor: AuthContext;
    /** Defaults to PDF for generated documents; set explicitly for uploads. */
    mimeType?: string;
  }): Promise<DocumentDto> {
    const mimeType = input.mimeType ?? "application/pdf";

    if (!ALLOWED_DOCUMENT_MIME_TYPES.includes(mimeType as never)) {
      throw ApiError.badRequest(
        "That file type is not accepted. Upload a PDF, JPEG, PNG, WebP or AVIF file.",
        { mimeType: ["Unsupported file type."] }
      );
    }
    if (input.data.byteLength === 0) {
      throw ApiError.badRequest("That file is empty.");
    }
    if (input.data.byteLength > MAX_DOCUMENT_BYTES) {
      throw ApiError.badRequest(
        `That file is larger than the ${Math.round(MAX_DOCUMENT_BYTES / (1024 * 1024))} MB limit.`
      );
    }
    // The declared Content-Type is attacker-controlled: verify the bytes actually
    // are what they claim to be (magic-byte signatures), so nothing can masquerade
    // as an allowed type on the way in.
    if (!matchesSignature(mimeType, input.data)) {
      throw ApiError.badRequest("That file's contents do not match its file type.", {
        mimeType: ["File content does not match the declared type."],
      });
    }

    const document = await RenderedDocument.create({
      kind: input.kind,
      fileName: sanitizeFileName(input.fileName, mimeType),
      mimeType,
      sizeBytes: input.data.byteLength,
      data: input.data,
      entityType: input.entityType,
      entityId: new Types.ObjectId(input.entityId),
      createdBy: new Types.ObjectId(input.actor.user.id),
    });

    return toDocumentDto(document);
  },

  /** Fetches the bytes. Used only by the authenticated download endpoint. */
  async getForDownload(id: string) {
    const document = await RenderedDocument.findById(id).select("+data");
    if (!document || document.archivedAt) {
      throw ApiError.notFound("That document could not be found.");
    }
    if (!document.data || document.data.length === 0) {
      throw ApiError.notFound("That document's file is no longer available.");
    }

    return {
      fileName: document.fileName,
      mimeType: document.mimeType,
      data: Buffer.from(document.data as unknown as Uint8Array),
    };
  },

  /** Metadata for the documents attached to a record, newest first. */
  async listForEntity(entityType: string, entityId: string): Promise<DocumentDto[]> {
    const documents = await RenderedDocument.find({
      entityType,
      entityId: new Types.ObjectId(entityId),
      archivedAt: null,
    })
      .select("-data")
      .sort({ createdAt: -1 })
      .lean();

    return documents.map(toDocumentDto);
  },

  async findLatest(entityType: string, entityId: string) {
    return RenderedDocument.findOne({
      entityType,
      entityId: new Types.ObjectId(entityId),
      archivedAt: null,
    })
      .select("-data")
      .sort({ createdAt: -1 })
      .lean();
  },
};

/**
 * Storage keys are generated from the record, never from user input, but the
 * download still echoes the stored name — so strip anything that could break a
 * Content-Disposition header or land on a filesystem, cap the length, and
 * force the extension that matches the stored MIME type (an image upload must
 * not come back as "photo.png.pdf", and a sneaky ".html" must not survive).
 */
const MIME_EXTENSIONS: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/avif": ".avif",
};

function sanitizeFileName(value: string, mimeType: string): string {
  const ext = MIME_EXTENSIONS[mimeType] ?? ".pdf";
  const cleaned = value
    .replace(/[^\w.\- ]+/g, "")
    .replace(/\.{2,}/g, ".")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);

  let base = cleaned;
  if (base.toLowerCase().endsWith(ext)) base = base.slice(0, -ext.length);
  else base = base.replace(/\.[a-z0-9]{1,5}$/i, "");

  base = base.replace(/[. ]+$/, "");
  return `${base || "document"}${ext}`;
}

/**
 * Magic-byte signatures for the accepted types. The allow-list decides *which*
 * types may be stored; this decides whether the bytes actually are that type.
 */
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const AVIF_COMPATIBLE_BRANDS = ["mif1", "msf1", "avif", "avis"];

export function matchesSignature(mimeType: string, data: Buffer): boolean {
  switch (mimeType) {
    case "application/pdf":
      return data.length >= 5 && data.subarray(0, 5).toString("latin1") === "%PDF-";
    case "image/jpeg":
      return data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
    case "image/png":
      return data.length >= 8 && PNG_SIGNATURE.every((byte, index) => data[index] === byte);
    case "image/webp":
      return (
        data.length >= 12 &&
        data.subarray(0, 4).toString("latin1") === "RIFF" &&
        data.subarray(8, 12).toString("latin1") === "WEBP"
      );
    case "image/avif":
      return (
        data.length >= 12 &&
        data.subarray(4, 8).toString("latin1") === "ftyp" &&
        AVIF_COMPATIBLE_BRANDS.includes(data.subarray(8, 12).toString("latin1"))
      );
    default:
      return false;
  }
}
