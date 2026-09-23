import type { Request, Response } from "express";
import { isHoneypotTripped, type EnquiryInput } from "@bandhan/shared";
import { settingService } from "@/services/settingService";
import { leadService } from "@/services/leadService";
import { AUDIT_ACTIONS, auditService } from "@/services/auditService";
import { clientIp, requestId, sendSuccess } from "@/utils/http";
import { logger } from "@/utils/logger";

export const publicController = {
  /** GET /public/settings — the business values the website renders. */
  async settings(_req: Request, res: Response): Promise<void> {
    const settings = await settingService.getPublicSettings();
    // Cacheable briefly: the values change rarely, page loads are frequent.
    res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    sendSuccess(res, settings);
  },

  /**
   * POST /public/enquiries
   *
   * Every valid submission is persisted as a Lead with source = "website".
   * Honeypot hits are answered with the same success shape but stored nowhere,
   * so scripted submitters get no signal to tune their attack.
   */
  async createEnquiry(req: Request, res: Response): Promise<void> {
    const input = req.body as EnquiryInput & { pagePath?: string };

    if (isHoneypotTripped(input)) {
      await auditService.record({
        action: AUDIT_ACTIONS.publicEnquiryRejected,
        entityType: "Lead",
        ip: clientIp(req),
        requestId: requestId(req),
        metadata: { reason: "honeypot" },
      });
      logger.warn("Enquiry rejected by honeypot", { requestId: requestId(req) });
      sendSuccess(res, { received: true }, 201);
      return;
    }

    const lead = await leadService.createFromEnquiry(
      {
        name: input.name,
        phone: input.phone,
        email: input.email,
        eventType: input.eventType,
        eventDate: input.eventDate,
        guestCount: input.guestCount,
        serviceRequired: input.serviceRequired,
        budget: input.budget,
        message: input.message,
        pagePath: input.pagePath,
        stageConfiguration: input.stageConfiguration,
      },
      { ip: clientIp(req), requestId: requestId(req) }
    );

    // Only a reference id is returned — never the stored customer record.
    sendSuccess(res, { received: true, reference: lead.id }, 201);
  },
};
