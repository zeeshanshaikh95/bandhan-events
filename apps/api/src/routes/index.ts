import { Router } from "express";
import { authRoutes } from "@/routes/authRoutes";
import { publicRoutes } from "@/routes/publicRoutes";
import { requirePasswordChanged } from "@/middleware/authenticate";
import { leadRoutes } from "@/routes/leadRoutes";
import { adminRoutes } from "@/routes/adminRoutes";
import { syncRoutes } from "@/routes/syncRoutes";
import { financeRoutes } from "@/routes/financeRoutes";
import { eventRoutes } from "@/routes/eventRoutes";
import { eventVendorRoutes } from "@/routes/eventVendorRoutes";
import { vendorRoutes } from "@/routes/vendorRoutes";
import { customerRoutes } from "@/routes/customerRoutes";
import { quotationRoutes } from "@/routes/quotationRoutes";
import { invoiceRoutes } from "@/routes/invoiceRoutes";
import { documentRoutes } from "@/routes/documentRoutes";
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

/** Convenience endpoint used by the dashboard shell (pre-login probe). */
apiRouter.get("/ping", (_req, res) => sendSuccess(res, { pong: true }));

/**
 * Password-change gate for the whole admin surface. Applied once, here, so no
 * future router can accidentally ship without it: until a first-login password
 * change has happened, every endpoint below answers PASSWORD_CHANGE_REQUIRED.
 *
 * Scoped to the admin mounts deliberately: an unmatched path must still fall
 * through to the 404 envelope, and `/health`, `/ping`, `/public` and `/auth`
 * stay reachable — login and the forced change itself must never be blocked by
 * their own gate.
 */
apiRouter.use(
  [
    "/leads",
    "/sync",
    "/finance",
    "/events",
    "/vendors",
    "/customers",
    "/quotations",
    "/invoices",
    "/documents",
    "/dashboard",
    "/users",
    "/settings",
    "/audit",
  ],
  requirePasswordChanged
);
apiRouter.use("/leads", leadRoutes);
apiRouter.use("/sync", syncRoutes);
apiRouter.use("/finance", financeRoutes);
// Vendor assignments and vendor payments are addressed through the event they
// belong to, so the event id can never be lost from the request.
eventRoutes.use("/:eventId/vendors", eventVendorRoutes);

apiRouter.use("/events", eventRoutes);
apiRouter.use("/vendors", vendorRoutes);
apiRouter.use("/customers", customerRoutes);
apiRouter.use("/quotations", quotationRoutes);
apiRouter.use("/invoices", invoiceRoutes);
apiRouter.use("/documents", documentRoutes);
apiRouter.use("/dashboard", adminRoutes.dashboard);
apiRouter.use("/users", adminRoutes.users);
apiRouter.use("/settings", adminRoutes.settings);
apiRouter.use("/audit", adminRoutes.audit);

export default apiRouter;
