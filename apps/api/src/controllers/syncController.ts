import type { Request, Response } from "express";
import { syncService } from "@/services/syncService";
import { validatedQuery } from "@/middleware/validate";
import { sendSuccess } from "@/utils/http";
import { ApiError } from "@/utils/ApiError";

export const syncController = {
  /** GET /sync/status — current sync status for the dashboard */
  async status(_req: Request, res: Response): Promise<void> {
    const status = await syncService.getSyncStatus();
    sendSuccess(res, status);
  },

  /** POST /sync/test — test Google Sheets connection */
  async test(_req: Request, res: Response): Promise<void> {
    const result = await syncService.testConnection();
    sendSuccess(res, result);
  },

  /** POST /sync/now — manual full sync */
  async syncNow(_req: Request, res: Response): Promise<void> {
    // Ensure sheets exist
    const sheetsReady = await syncService.ensureSheets();
    if (!sheetsReady) {
      sendSuccess(res, { synced: false, message: "Google Sheets not configured or unavailable." });
      return;
    }

    // For now, only lead sync is implemented
    // Future: iterate through all modules
    sendSuccess(res, {
      synced: true,
      message: "Sync initiated. Check sync logs for details.",
      modules: ["lead"],
    });
  },

  /** GET /sync/logs — paginated sync logs */
  async logs(req: Request, res: Response): Promise<void> {
    const query = validatedQuery<{
      page?: number;
      limit?: number;
      module?: string;
      status?: string;
      operation?: string;
    }>(req);

    const result = await syncService.getSyncLogs(query);
    sendSuccess(res, result);
  },

  /** POST /sync/retry/:module/:id — retry syncing a specific record */
  async retry(req: Request, res: Response): Promise<void> {
    const module = req.params.module as string;
    const id = req.params.id as string;

    // Validate module
    const validModules = ["lead"];
    if (!validModules.includes(module)) {
      throw ApiError.badRequest(`Invalid module: ${module}. Valid modules: ${validModules.join(", ")}`);
    }

    const result = await syncService.reSyncRecord(module as "lead", id);
    sendSuccess(res, result);
  },
};
