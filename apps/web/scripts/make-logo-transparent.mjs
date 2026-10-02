#!/usr/bin/env node
/**
 * ---------------------------------------------------------------------------
 * LOGO BACKGROUND REMOVAL
 * ---------------------------------------------------------------------------
 * The approved Bandhan Events logo ships as an opaque cream square. The site
 * shows it on dark forest surfaces and over hero photography, where an opaque
 * square (or a `brightness-0 invert` of one) renders as a solid white box.
 *
 * This keys out the cream paper background and writes logo-clear.png with a
 * real alpha channel. The original logo.png is never modified.
 *
 * Re-run after replacing the logo artwork:
 *   node scripts/make-logo-transparent.mjs
 *
 * Tolerance is deliberately tight: the paper texture varies only ~13 levels
 * per channel, while the nearest artwork tone (champagne/gold) sits ~60 away.
 */
import sharp from "sharp";

const SRC = new URL("../src/assets/logo.png", import.meta.url).pathname.replace(
  /^\/([A-Za-z]:)/,
  "$1"
);
const OUT = new URL("../src/assets/logo-clear.png", import.meta.url).pathname.replace(
  /^\/([A-Za-z]:)/,
  "$1"
);
const TOLERANCE = 30;

const { data, info } = await sharp(SRC).raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;

// Estimate the paper colour from the border, where only background exists.
const samples = [];
const at = (x, y) => {
  const i = (y * width + x) * channels;
  return [data[i], data[i + 1], data[i + 2]];
};
for (let x = 0; x < width; x += 2) samples.push(at(x, 0), at(x, height - 1));
for (let y = 0; y < height; y += 2) samples.push(at(0, y), at(width - 1, y));
const median = (values) => {
  values.sort((a, b) => a - b);
  return values[values.length >> 1];
};
const bg = [0, 1, 2].map((c) => median(samples.map((s) => s[c])));

const out = Buffer.alloc(width * height * 4);
let keyed = 0;
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const src = (y * width + x) * channels;
    const dst = (y * width + x) * 4;
    const dr = data[src] - bg[0];
    const dg = data[src + 1] - bg[1];
    const db = data[src + 2] - bg[2];
    const transparent = Math.sqrt(dr * dr + dg * dg + db * db) <= TOLERANCE;
    if (transparent) keyed++;
    out[dst] = data[src];
    out[dst + 1] = data[src + 1];
    out[dst + 2] = data[src + 2];
    out[dst + 3] = transparent ? 0 : 255;
  }
}

await sharp(out, { raw: { width, height, channels: 4 } })
  .png({ compressionLevel: 9 })
  .toFile(OUT);

console.log(
  `logo-clear.png written (${width}x${height}, ${((keyed / (width * height)) * 100).toFixed(1)}% background keyed out)`
);
