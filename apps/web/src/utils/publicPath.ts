/**
 * Resolves a public-asset path (a file in /public referenced with a
 * root-absolute URL like "/images/hero.webp") against Vite's configured base.
 *
 * Vite rewrites asset URLs it can see — imports, index.html, CSS — but string
 * literals pointing at public/ files are left untouched. GitHub Pages serves
 * project sites from a sub-path (VITE_BASE=/bandhan-events/), so raw string
 * paths 404 in the deployed bundle and every content image breaks. Routing
 * them through here produces "/bandhan-events/images/hero.webp" in that build
 * while keeping "/images/hero.webp" locally and on a root-hosted domain.
 */
export function publicPath(path: string): string {
  const base = import.meta.env.BASE_URL;
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  return `${normalizedBase}${normalizedPath}`;
}
