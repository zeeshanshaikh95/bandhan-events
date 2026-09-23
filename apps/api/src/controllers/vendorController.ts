import type { Request, Response } from "express";
import type {
  CreateVendorInput,
  UpdateVendorInput,
  VendorListQuery,
  VendorNoteInput,
} from "@bandhan/shared";
import { vendorService } from "@/services/vendorService";
import { validatedQuery } from "@/middleware/validate";
import type { AuthContext } from "@/types/auth";
import { ApiError } from "@/utils/ApiError";
import { clientIp, pathParam, requestId, sendSuccess } from "@/utils/http";

/**
 * Vendor endpoints. Authorization is decided by the route middleware; these
 * handlers only translate HTTP into service calls.
 */

function requireAuthContext(req: Request): AuthContext {
  if (!req.auth) throw ApiError.unauthorized("Please sign in to continue.", "SESSION_REQUIRED");
  return req.auth;
}

function context(req: Request) {
  return { ip: clientIp(req), requestId: requestId(req) };
}

export const vendorController = {
  /** GET /vendors */
  async list(req: Request, res: Response): Promise<void> {
    sendSuccess(res, await vendorService.list(validatedQuery<VendorListQuery>(req)));
  },

  /** GET /vendors/options — counters and city values for the filter bar. */
  async options(_req: Request, res: Response): Promise<void> {
    const [statusCounts, cities] = await Promise.all([
      vendorService.statusCounts(),
      vendorService.cities(),
    ]);
    sendSuccess(res, { statusCounts, cities });
  },

  /** GET /vendors/:id */
  async get(req: Request, res: Response): Promise<void> {
    sendSuccess(res, await vendorService.getById(pathParam(req, "id")));
  },

  /** POST /vendors */
  async create(req: Request, res: Response): Promise<void> {
    const auth = requireAuthContext(req);
    const vendor = await vendorService.create(req.body as CreateVendorInput, auth, context(req));
    sendSuccess(res, vendor, 201);
  },

  /** PATCH /vendors/:id */
  async update(req: Request, res: Response): Promise<void> {
    const auth = requireAuthContext(req);
    const vendor = await vendorService.update(
      pathParam(req, "id"),
      req.body as UpdateVendorInput,
      auth,
      context(req)
    );
    sendSuccess(res, vendor);
  },

  /** PATCH /vendors/:id/status */
  async setStatus(req: Request, res: Response): Promise<void> {
    const auth = requireAuthContext(req);
    const { status, reason } = req.body as { status: string; reason?: string };
    sendSuccess(res, await vendorService.setStatus(pathParam(req, "id"), status, reason, auth, context(req)));
  },

  /** DELETE /vendors/:id — archive, never a physical delete. */
  async archive(req: Request, res: Response): Promise<void> {
    const auth = requireAuthContext(req);
    sendSuccess(res, await vendorService.archive(pathParam(req, "id"), auth, context(req)));
  },

  /** GET /vendors/:id/financials */
  async financials(req: Request, res: Response): Promise<void> {
    sendSuccess(res, await vendorService.financials(pathParam(req, "id")));
  },

  /** GET /vendors/:id/payments */
  async payments(req: Request, res: Response): Promise<void> {
    sendSuccess(res, await vendorService.payments(pathParam(req, "id")));
  },

  /** GET /vendors/:id/notes */
  async notes(req: Request, res: Response): Promise<void> {
    const vendor = await vendorService.getById(pathParam(req, "id"));
    sendSuccess(res, vendor.noteLog);
  },

  /** POST /vendors/:id/notes */
  async addNote(req: Request, res: Response): Promise<void> {
    const auth = requireAuthContext(req);
    const { body } = req.body as VendorNoteInput;
    sendSuccess(res, await vendorService.addNote(pathParam(req, "id"), body, auth, context(req)), 201);
  },

  /** GET /vendors/:id/documents */
  async documents(req: Request, res: Response): Promise<void> {
    sendSuccess(res, await vendorService.documents(pathParam(req, "id")));
  },

  /**
   * POST /vendors/:id/documents
   *
   * The body is the raw file and the name travels in `X-File-Name`, so no
   * multipart parser is involved: the only metadata that reaches storage is a
   * sanitised name and a type checked against an allow-list.
   */
  async uploadDocument(req: Request, res: Response): Promise<void> {
    const auth = requireAuthContext(req);

    const data = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    if (data.byteLength === 0) {
      throw ApiError.badRequest("No file was received.");
    }

    const header = String(req.headers["x-file-name"] ?? "").trim();
    if (!header) {
      throw ApiError.badRequest("The upload is missing its X-File-Name header.");
    }

    // The browser percent-encodes the name so a non-ASCII filename survives the
    // header round-trip. Decoding is best-effort: a malformed value falls back
    // to the raw string rather than failing an otherwise valid upload, and the
    // document service sanitises whatever it is given.
    let rawName = header;
    try {
      rawName = decodeURIComponent(header);
    } catch {
      rawName = header;
    }

    // `express.raw` hands back exactly the bytes; the declared type is what the
    // document service validates against its allow-list.
    const mimeType = (req.headers["content-type"] ?? "").split(";")[0].trim();

    const document = await vendorService.storeDocument(
      pathParam(req, "id"),
      { fileName: rawName, mimeType, data },
      auth
    );

    sendSuccess(res, document, 201);
  },
};
