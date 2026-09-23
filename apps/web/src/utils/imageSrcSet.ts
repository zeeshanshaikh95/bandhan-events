import type { SiteImage } from "@/data/images";
import { imageManifest } from "@/data/imageManifest";
import { publicPath } from "@/utils/publicPath";

/**
 * ---------------------------------------------------------------------------
 * RESPONSIVE IMAGE HELPERS
 * ---------------------------------------------------------------------------
 * Kept separate from <SmartImage /> so the component module stays a pure
 * component (Vite fast-refresh friendly) and so other image elements — e.g.
 * the gallery lightbox viewer — can reuse the exact same width candidates.
 */

/**
 * Builds a `srcset` string from the generated image manifest.
 *
 * The untouched original is appended at its native width so wide viewports
 * still get full resolution without shipping a near-duplicate top-end variant.
 * Returns `undefined` for images the pipeline has not processed, in which case
 * the browser simply uses `src`.
 */
export function imageSrcSet(image: SiteImage): string | undefined {
  const entry = imageManifest[image.src];
  if (!entry) return undefined;

  const candidates = entry.variants.map((variant) => ({
    w: variant.w,
    src: publicPath(variant.src),
  }));
  const widest = candidates[candidates.length - 1];
  if (entry.width > 0 && (!widest || entry.width > widest.w)) {
    candidates.push({ w: entry.width, src: publicPath(image.src) });
  }

  if (candidates.length < 2) return undefined;
  return candidates.map((candidate) => `${candidate.src} ${candidate.w}w`).join(", ");
}

/** Native pixel dimensions — taken from the manifest so nothing is guessed. */
export function imageIntrinsicSize(image: SiteImage): { width: number; height: number } {
  const entry = imageManifest[image.src];
  return {
    width: entry?.width || image.width || 1600,
    height: entry?.height || image.height || 1067,
  };
}
