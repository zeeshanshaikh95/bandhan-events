import type { IntegrationStatus } from "@bandhan/shared";
import { env } from "@/config/env";
import { emailProvider } from "@/integrations/email";
import { settingService } from "@/services/settingService";
import { ApiError } from "@/utils/ApiError";

/**
 * ---------------------------------------------------------------------------
 * THIRD-PARTY INTEGRATIONS
 * ---------------------------------------------------------------------------
 * Each external service is isolated here. Two rules apply to all of them:
 *
 *   1. Nothing reports success unless the provider actually responded.
 *   2. When credentials are missing the dashboard shows "not connected" and
 *      the operation throws a clear NotImplemented error.
 */

/** WhatsApp: deep links work today; the Business API is future work. */
export const whatsappService = {
  /** Builds a wa.me link — the mechanism the website CTA uses. */
  buildDeepLink(phoneNumber: string, message: string): string {
    const digits = phoneNumber.replace(/\D/g, "");
    if (!digits) return "";
    return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
  },

  get connected(): boolean {
    return Boolean(env.WHATSAPP_PHONE_NUMBER_ID && env.WHATSAPP_ACCESS_TOKEN);
  },

  get statusNote(): string {
    return this.connected
      ? "WhatsApp Business credentials present, but sending is not implemented yet — the site uses wa.me deep links."
      : "WhatsApp Business API not connected. The website uses wa.me deep links, which need no API.";
  },

  async sendMessage(): Promise<never> {
    throw ApiError.notImplemented("WhatsApp Business messaging");
  },
};

/** Meta (Instagram/Facebook) publishing. */
export const metaService = {
  get connected(): boolean {
    return Boolean(env.META_ACCESS_TOKEN && env.META_APP_ID);
  },

  get statusNote(): string {
    return this.connected
      ? "Meta credentials present, but publishing is not implemented yet."
      : "Meta integration not connected. Content can still be planned in the dashboard.";
  },

  async publish(): Promise<never> {
    throw ApiError.notImplemented("Meta publishing");
  },
};

/**
 * Google Business Profile. The owners' listing is registered by its share
 * link (stored in business settings), but the GBP API is not connected — so
 * the status is "linked", never "connected", and no review/rating numbers
 * are ever displayed. No scraping, no fabricated metrics.
 */
export const googleBusinessService = {
  get connected(): boolean {
    return false; // GBP API credentials do not exist yet.
  },

  get statusNote(): string {
    return "Google Business Profile API not connected. The listing is linked below and tracked manually.";
  },

  /** The owner-verified share link, straight from business settings. */
  async profileUrl(): Promise<string> {
    const settings = await settingService.getBusinessSettings();
    return settings.onlinePresence.googleBusinessUrl;
  },
};

/** Media storage for the future media library. */
export const storageService = {
  provider: (env.CLOUDINARY_CLOUD_NAME ? "cloudinary" : "none") as "cloudinary" | "none",

  get connected(): boolean {
    return this.provider === "cloudinary";
  },

  get statusNote(): string {
    return this.connected
      ? "Cloudinary is configured; the upload pipeline arrives with the media library module."
      : "No media storage configured. Set CLOUDINARY_* before uploading files.";
  },

  async upload(): Promise<never> {
    throw ApiError.notImplemented("Media uploads");
  },
};

/**
 * A single place for the dashboard to display integration health. Reads the
 * business settings once so link-backed entries (Google Business Profile,
 * Justdial) reflect what the owners saved — not a compiled constant.
 */
export async function integrationStatuses(): Promise<IntegrationStatus[]> {
  const settings = await settingService.getBusinessSettings();
  const { googleBusinessUrl, justdialUrl } = settings.onlinePresence;

  return [
    {
      key: "email",
      label: "Email",
      connected: emailProvider().name !== "console" && emailProvider().configured,
      note: emailProvider().statusNote,
    },
    {
      key: "whatsapp",
      label: "WhatsApp Business API",
      connected: whatsappService.connected,
      note: whatsappService.statusNote,
    },
    {
      key: "meta",
      label: "Meta (Instagram / Facebook)",
      connected: metaService.connected,
      note: metaService.statusNote,
    },
    {
      key: "google-business",
      label: "Google Business Profile",
      connected: googleBusinessService.connected,
      note: googleBusinessService.statusNote,
      // Profile link + manual tracking state, so the dashboard entry is
      // actionable (open/manage) rather than a dead "not connected" row.
      profileUrl: googleBusinessUrl || null,
      trackedManually: true,
      manualStatus: settings.onlinePresence.googleBusinessUrl
        ? ("LINKED" as const)
        : ("NOT_LINKED" as const),
    },
    {
      key: "justdial",
      label: "Justdial listing",
      connected: false,
      note: justdialUrl
        ? "Listing linked. Status is tracked manually — no Justdial API is used."
        : "No Justdial listing saved yet. Add it in Business settings → Online presence.",
      profileUrl: justdialUrl || null,
      trackedManually: true,
      manualStatus: justdialUrl ? ("LINKED" as const) : ("NOT_LINKED" as const),
    },
    {
      key: "storage",
      label: "Media storage",
      connected: storageService.connected,
      note: storageService.statusNote,
    },
  ];
}
