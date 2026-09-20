import { useQuery } from "@tanstack/react-query";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { PublicBusinessSettings } from "@bandhan/shared";
import { publicApi } from "@/services/api";
import { siteConfig, whatsappMessages } from "@/config/site";

/**
 * ---------------------------------------------------------------------------
 * BUSINESS SETTINGS
 * ---------------------------------------------------------------------------
 * Contact details are owner-editable data in MongoDB, so components read them
 * from here instead of hardcoding a phone number, email or Instagram handle.
 *
 * Resolution order for each public value:
 *   1. the database value, when the owners have filled it in;
 *   2. the env/`siteConfig` default, so the site keeps working before the
 *      owners have had a chance to edit anything.
 *
 * If the API is unreachable the site renders exactly as it did before the
 * backend existed — a settings outage must never blank a public page.
 */

export interface ResolvedSettings extends PublicBusinessSettings {
  /** Full address as one printable line. */
  formattedAddress: string;
  /** Google Maps search link (no API key required). */
  mapsLink: string;
}

const FALLBACK: PublicBusinessSettings = {
  brand: {
    name: siteConfig.name,
    tagline: siteConfig.tagline,
  },
  contact: {
    phoneDisplay: siteConfig.contact.phoneDisplay,
    whatsappNumber: siteConfig.contact.whatsappNumber,
    email: siteConfig.contact.email,
    instagramUrl: siteConfig.contact.instagramUrl,
    instagramHandle: siteConfig.contact.instagramHandle,
  },
  address: { ...siteConfig.address },
};

function pickValue(configured: string | undefined, fallback: string): string {
  const value = configured?.trim();
  // "" in the database means "not confirmed yet" — fall back rather than
  // render a blank contact line.
  return value ? value : fallback;
}

function resolve(settings?: PublicBusinessSettings): ResolvedSettings {
  const source = settings ?? FALLBACK;
  const contact = {
    phoneDisplay: pickValue(source.contact?.phoneDisplay, FALLBACK.contact.phoneDisplay),
    whatsappNumber: pickValue(source.contact?.whatsappNumber, FALLBACK.contact.whatsappNumber),
    email: pickValue(source.contact?.email, FALLBACK.contact.email),
    instagramUrl: pickValue(source.contact?.instagramUrl, FALLBACK.contact.instagramUrl),
    instagramHandle: pickValue(source.contact?.instagramHandle, FALLBACK.contact.instagramHandle),
  };
  const address = { ...FALLBACK.address, ...source.address };

  const formattedAddress = [
    address.street,
    address.locality,
    address.area,
    `${address.city} – ${address.postalCode}`,
  ].join(", ");

  return {
    brand: { ...FALLBACK.brand, ...source.brand },
    contact,
    address,
    formattedAddress,
    mapsLink: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${FALLBACK.brand.name}, ${formattedAddress}`
    )}`,
  };
}

const SettingsContext = createContext<ResolvedSettings>(resolve());

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { data } = useQuery({
    queryKey: ["public", "settings"],
    queryFn: () => publicApi.settings(),
    staleTime: 5 * 60_000,
    retry: 1,
  });

  const value = useMemo(() => resolve(data), [data]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

/** Owner-editable business values, resolved with safe fallbacks. */
export function useBusinessSettings(): ResolvedSettings {
  return useContext(SettingsContext);
}

/** Pre-approved WhatsApp messages, kept in one place for the whole site. */
export { whatsappMessages };

/**
 * Returns a builder for wa.me deep links using the configured business number.
 * Returns `null` when no number is configured, so a CTA can render as a
 * disabled state instead of dialling a placeholder.
 */
export function useWhatsApp(): (message?: string) => string | null {
  const { contact } = useBusinessSettings();
  return useMemo(() => {
    const number = contact.whatsappNumber.replace(/\D/g, "");
    if (number.length < 8) return () => null;
    return (message: string = whatsappMessages.general) =>
      `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  }, [contact.whatsappNumber]);
}
