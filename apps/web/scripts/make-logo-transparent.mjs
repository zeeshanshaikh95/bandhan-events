#!/usr/bin/env node
/**
 * ---------------------------------------------------------------------------
 * LOGO PIPELINE — trim, background removal, brand assets
 * ---------------------------------------------------------------------------
 * The approved Bandhan Events logo is delivered as an opaque presentation
 * mockup: the artwork sits on warm cream paper with a heavy vignette and wide
 * margins. The site paints the logo on dark forest surfaces (header over the
 * hero, mobile menu, footer, admin shell) and on ivory, where an opaque cream
 * square renders as a solid white box — and the mockup's own margins would
 * make the mark paint at roughly half the size the header expects.
 *
 * This script derives every logo-bearing asset from src/assets/logo.png (the
 * supplied artwork, which is never modified):
 *
 *   src/assets/logo-clear.png      full lockup, trimmed + keyed -> <Logo />
 *   public/logo-footer.png         square, cream plinth        -> JSON-LD logo
 *   public/favicon48.png           monogram on forest, rounded  -> browser tab
 *   public/apple-touch-icon.png    monogram on forest, full bleed -> home screen
 *
 * Source pixels are never recoloured or redrawn, and the lockup's aspect ratio
 * is preserved exactly. The trimmed lockup is only scaled down in proportion,
 * to keep the bundled asset light — it still ships at several times the
 * largest size the layout ever paints it at.
 *
 * Re-run after replacing the logo artwork:
 *   node scripts/make-logo-transparent.mjs
 *
 * Background separation: the paper is a low-saturation cream (RGB channel
 * spread <= ~40, luminance ~130-225). The artwork is either very dark ink
 * (the wordmark, luminance <= ~60) or saturated gold (channel spread >= ~48).
 * Those two independent cues separate cleanly even where the vignette pushes
 * the paper into shadow — something a plain colour-distance threshold cannot
 * do, because shadowed paper and gold overlap heavily in luminance.
 */
import { statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(root, "src", "assets", "logo.png");
const CLEAR = path.join(root, "src", "assets", "logo-clear.png");
const FOOTER = path.join(root, "public", "logo-footer.png");
const FAVICON = path.join(root, "public", "favicon48.png");
const TOUCH_ICON = path.join(root, "public", "apple-touch-icon.png");

/** Brand tokens — mirror tailwind.config.ts. */
const FOREST = "#17251D";
const CREAM = "#EFE8DA";

/** Alpha at or below this counts as empty space. */
const ALPHA_FLOOR = 8;

/**
 * The lockup is never painted wider than ~90px (the footer at `h-16`), so
 * 520px still covers 5x DPR with room to spare while keeping the bundled
 * asset far lighter than the mockup it comes from.
 */
const LOCKUP_WIDTH = 520;

/** Cue ramps, combined with `max`. */
const INK = { from: 60, to: 110 }; // dark wordmark: solid ink at <= 60 luminance
const GOLD = { from: 38, to: 48 }; // gold: solid artwork once channel spread >= 48
const GLARE = { from: 235, to: 245 }; // speculars brighter than the paper ever gets

const clamp01 = (value) => (value < 0 ? 0 : value > 1 ? 1 : value);
const smoothstep = ({ from, to }, value) => {
  const t = clamp01((value - from) / (to - from));
  return t * t * (3 - 2 * t);
};

/** Per-pixel opacity: 0 = paper, 255 = artwork. */
function alphaAt(r, g, b) {
  const luminance = (r + g + b) / 3;
  const spread = Math.max(r, g, b) - Math.min(r, g, b);
  const alpha = Math.max(
    1 - smoothstep(INK, luminance),
    smoothstep(GOLD, spread),
    smoothstep(GLARE, luminance)
  );
  return Math.round(255 * clamp01(alpha));
}

/** Keys the paper out and reports the tight bounds of whatever survives. */
function keyArtwork(data, info) {
  const { channels, width, height } = info;
  const pixels = Buffer.alloc(width * height * 4);
  const bounds = { left: width, top: height, right: -1, bottom: -1 };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const src = (y * width + x) * channels;
      const dst = (y * width + x) * 4;
      const [r, g, b] = [data[src], data[src + 1], data[src + 2]];
      pixels[dst] = r;
      pixels[dst + 1] = g;
      pixels[dst + 2] = b;
      pixels[dst + 3] = alphaAt(r, g, b);
      if (pixels[dst + 3] > ALPHA_FLOOR) {
        if (x < bounds.left) bounds.left = x;
        if (x > bounds.right) bounds.right = x;
        if (y < bounds.top) bounds.top = y;
        if (y > bounds.bottom) bounds.bottom = y;
      }
    }
  }

  if (bounds.right < 0) throw new Error("Background removal left nothing behind — is src/assets/logo.png intact?");

  return {
    pixels,
    width,
    height,
    bounds: {
      left: bounds.left,
      top: bounds.top,
      width: bounds.right - bounds.left + 1,
      height: bounds.bottom - bounds.top + 1,
    },
  };
}

/** Row-by-row "does this row contain artwork" flags for a keyed RGBA buffer. */
function inkRows({ data, info }) {
  const { width, height } = info;
  const rows = [];
  for (let y = 0; y < height; y++) {
    let hasInk = false;
    for (let x = 0; x < width && !hasInk; x++) hasInk = data[(y * width + x) * 4 + 3] > ALPHA_FLOOR;
    rows.push(hasInk);
  }
  return rows;
}

/**
 * The favicons use the monogram alone: the interlaced "B" and its leaf. The
 * full lockup is 1.4:1 and its wordmark turns to mud at 48px, so this finds
 * the blank band between the monogram and "BANDHAN".
 */
function monogramHeight(rows) {
  const searchTo = Math.round(rows.length * 0.75);
  for (let y = 1; y < searchTo; y++) {
    if (rows[y]) continue;
    let end = y;
    while (end < searchTo && !rows[end]) end++;
    if (end - y >= 4) return y;
    y = end;
  }
  return Math.round(rows.length * 0.6);
}

/** The monogram on its own, padded to a square so it can never be distorted. */
async function squareMonogram(lockupPng) {
  const raw = await sharp(lockupPng).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const cropped = await sharp(lockupPng)
    .extract({ left: 0, top: 0, width: raw.info.width, height: monogramHeight(inkRows(raw)) })
    .trim({ threshold: ALPHA_FLOOR })
    .toBuffer();
  const meta = await sharp(cropped).metadata();
  const side = Math.max(meta.width ?? 1, meta.height ?? 1);
  return sharp(cropped)
    .resize({ width: side, height: side, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

/** Places the mark, centred, on a forest tile of `size` px. */
async function forestIcon(mark, size, radius, destination) {
  const scaled = await sharp(mark).resize({ width: Math.round(size * 0.72), fit: "inside" }).toBuffer();
  const tile =
    radius > 0
      ? await sharp(
          Buffer.from(
            `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="${FOREST}"/></svg>`
          )
        )
          .png()
          .toBuffer()
      : await sharp({ create: { width: size, height: size, channels: 4, background: FOREST } })
          .png()
          .toBuffer();

  await sharp(tile)
    .composite([{ input: scaled, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toFile(destination);
}

async function main() {
  const source = await sharp(SRC).raw().toBuffer({ resolveWithObject: true });
  const keyed = keyArtwork(source.data, source.info);
  const { bounds } = keyed;

  // 1. Trim the empty paper margin; the lockup keeps its native resolution.
  const lockupPng = await sharp(keyed.pixels, {
    raw: { width: keyed.width, height: keyed.height, channels: 4 },
  })
    .extract(bounds)
    .resize({ width: LOCKUP_WIDTH, withoutEnlargement: true })
    .png({ compressionLevel: 9 })
    .toBuffer();
  await sharp(lockupPng).toFile(CLEAR);
  const lockupSize = await sharp(lockupPng).metadata();

  // 2. Square cream plinth for the JSON-LD Organization logo.
  const FOOTER_SIZE = 512;
  await sharp({
    create: { width: FOOTER_SIZE, height: FOOTER_SIZE, channels: 4, background: CREAM },
  })
    .composite([
      {
        input: await sharp(lockupPng)
          .resize({ width: Math.round(FOOTER_SIZE * 0.86), fit: "inside" })
          .toBuffer(),
        gravity: "center",
      },
    ])
    .removeAlpha()
    .png({ compressionLevel: 9 })
    .toFile(FOOTER);

  // 3. Favicons: monogram alone, gold on forest.
  const mark = await squareMonogram(lockupPng);
  await forestIcon(mark, 96, 21, FAVICON);
  await forestIcon(mark, 180, 0, TOUCH_ICON);

  const kb = (file) => (statSync(file).size / 1024).toFixed(0).padStart(4);
  console.log(
    [
      `${path.relative(root, CLEAR).padEnd(28)} ${lockupSize.width}x${lockupSize.height}px  ${kb(CLEAR)} KB`,
      `${path.relative(root, FOOTER).padEnd(28)} ${FOOTER_SIZE}x${FOOTER_SIZE}px  ${kb(FOOTER)} KB`,
      `${path.relative(root, FAVICON).padEnd(28)} 96x96px     ${kb(FAVICON)} KB`,
      `${path.relative(root, TOUCH_ICON).padEnd(28)} 180x180px   ${kb(TOUCH_ICON)} KB`,
    ].join("\n")
  );
}

await main();
