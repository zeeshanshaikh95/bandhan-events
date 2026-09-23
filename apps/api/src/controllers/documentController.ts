import type { Request, Response } from "express";
import { documentService } from "@/services/documentService";
import { pathParam } from "@/utils/http";

/**
 * Documents are served through the API, not from a public bucket, so the normal
 * session and permission middleware is what stands between a quotation PDF and
 * the internet. Responses are marked `private, no-store`: a shared laptop must
 * not leave a customer's pricing in the browser cache.
 */
export const documentController = {
  /** GET /documents/:id */
  async download(req: Request, res: Response): Promise<void> {
    const document = await documentService.getForDownload(pathParam(req, "id"));

    res.setHeader("Content-Type", document.mimeType);
    res.setHeader("Content-Length", String(document.data.byteLength));
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${document.fileName.replace(/"/g, "")}"`
    );
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");

    res.send(document.data);
  },
};
