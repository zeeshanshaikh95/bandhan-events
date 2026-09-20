import {
  businessSettingsSchema,
  DEFAULT_BUSINESS_SETTINGS,
  toPublicSettings,
  type BusinessSettings,
  type PublicBusinessSettings,
} from "@bandhan/shared";
import { SETTING_KEYS } from "@/models/SiteSetting";
import { settingRepository } from "@/repositories/settingRepository";
import { AUDIT_ACTIONS, auditService } from "@/services/auditService";
import type { AuthContext } from "@/types/auth";
import { logger } from "@/utils/logger";

/** Deep merge so a partial stored document still yields a complete settings object. */
function mergeSettings(stored: unknown): BusinessSettings {
  const base = structuredClone(DEFAULT_BUSINESS_SETTINGS) as BusinessSettings;
  if (!stored || typeof stored !== "object") return base;

  const incoming = stored as Partial<BusinessSettings>;
  return {
    brand: { ...base.brand, ...(incoming.brand ?? {}) },
    contact: { ...base.contact, ...(incoming.contact ?? {}) },
    address: { ...base.address, ...(incoming.address ?? {}) },
    onlinePresence: { ...base.onlinePresence, ...(incoming.onlinePresence ?? {}) },
    internal: { ...base.internal, ...(incoming.internal ?? {}) },
  };
}

/**
 * Settings are read on every page load and written rarely, so a short
 * in-process cache keeps the public endpoint cheap without another service.
 */
let cache: { value: BusinessSettings; loadedAt: number } | null = null;
const CACHE_TTL_MS = 30_000;

export const settingService = {
  async getBusinessSettings(options: { fresh?: boolean } = {}): Promise<BusinessSettings> {
    if (!options.fresh && cache && Date.now() - cache.loadedAt < CACHE_TTL_MS) {
      return cache.value;
    }

    const stored = await settingRepository.getBusiness();
    const merged = mergeSettings(stored);

    // A hand-edited or corrupted document must not take the website down.
    const parsed = businessSettingsSchema.safeParse(merged);
    const value = parsed.success ? (parsed.data as BusinessSettings) : DEFAULT_BUSINESS_SETTINGS;
    if (!parsed.success) {
      logger.error("Stored business settings failed validation; serving defaults", {
        issues: parsed.error.issues.map((issue) => issue.path.join(".")),
      });
    }

    cache = { value, loadedAt: Date.now() };
    return value;
  },

  async getPublicSettings(): Promise<PublicBusinessSettings> {
    return toPublicSettings(await this.getBusinessSettings());
  },

  async updateBusinessSettings(
    patch: unknown,
    actor: AuthContext,
    context: { ip: string; requestId: string }
  ): Promise<BusinessSettings> {
    const current = await this.getBusinessSettings({ fresh: true });
    const candidate = {
      brand: { ...current.brand, ...((patch as Partial<BusinessSettings>).brand ?? {}) },
      contact: { ...current.contact, ...((patch as Partial<BusinessSettings>).contact ?? {}) },
      address: { ...current.address, ...((patch as Partial<BusinessSettings>).address ?? {}) },
      onlinePresence: {
        ...current.onlinePresence,
        ...((patch as Partial<BusinessSettings>).onlinePresence ?? {}),
      },
      internal: { ...current.internal, ...((patch as Partial<BusinessSettings>).internal ?? {}) },
    };

    const parsed = businessSettingsSchema.parse(candidate);
    const value = parsed as BusinessSettings;

    await settingRepository.upsert(SETTING_KEYS.business, value, actor.user.id);
    cache = { value, loadedAt: Date.now() };

    await auditService.record({
      action: AUDIT_ACTIONS.settingsUpdated,
      entityType: "SiteSetting",
      entityId: SETTING_KEYS.business,
      actor: actor.user,
      ip: context.ip,
      requestId: context.requestId,
      metadata: { groups: Object.keys(patch as Record<string, unknown>) },
    });

    return value;
  },

  /** Seed/admin helper. */
  async replaceBusinessSettings(value: BusinessSettings, updatedBy: string | null): Promise<void> {
    await settingRepository.upsert(SETTING_KEYS.business, value, updatedBy);
    cache = { value, loadedAt: Date.now() };
  },

  /** Called after tests or seed to drop cached values. */
  clearCache(): void {
    cache = null;
  },
};
