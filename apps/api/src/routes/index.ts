import { Router } from "express";
import { authRoutes } from "@/routes/authRoutes";
import { publicRoutes } from "@/routes/publicRoutes";
import { leadRoutes } from "@/routes/leadRoutes";
import { adminRoutes } from "@/routes/adminRoutes";
import { databaseState, isDatabaseReady } from "@/config/db";
import { sendSuccess } from "@/utils/http";

/**
 * All API routes live under /api/v1. Versioning is in the path from day one so
 * a future breaking change never has to move the dashboard and the website at
 * the same moment.
 */
export const apiRouter = Router();

/** Liveness + readiness. Deliberately reveals nothing beyond database health. */
apiRouter.get("/health", (_req, res) => {
  res.status(isDatabaseReady() ? 200 : 503).json({
    success: isDatabaseReady(),
    data: {
      status: isDatabaseReady() ? "ok" : "degraded",
      database: databaseState(),
      uptimeSeconds: Math.round(process.uptime()),
    },
  });
});

apiRouter.use("/public", publicRoutes);
apiRouter.use("/auth", authRoutes);
apiRouter.use("/leads", leadRoutes);
apiRouter.use("/dashboard", adminRoutes.dashboard);
apiRouter.use("/users", adminRoutes.users);
apiRouter.use("/settings", adminRoutes.settings);
apiRouter.use("/audit", adminRoutes.audit);

/** Convenience endpoint used by the dashboard shell. */
apiRouter.get("/ping", (_req, res) => sendSuccess(res, { pong: true }));

export default apiRouter;
