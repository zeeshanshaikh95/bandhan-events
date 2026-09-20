# Bandhan Events — website

Premium marketing site for **Bandhan Events**, Mulund West, Mumbai — event
decoration (Decorator division) and a vegetarian banquet & catering venue.

- **Stack:** React 18 + TypeScript + Vite, Tailwind CSS, React Router, Framer Motion, Lucide icons
- **Routes:** `/` · `/about` · `/decorators` · `/banquet-catering` · `/gallery` · `/gifting` · `/contact` (+ styled 404)

## Getting started

```bash
npm install
npm run dev        # local dev server
npm run typecheck  # types only
npm run build      # type-check + production build into dist/
npm run preview    # preview the production build
```

## Editing content (no component changes needed)

| What you want to change | Where |
| --- | --- |
| Phone, WhatsApp number, email, Instagram, address, nav links | `src/config/site.ts` (or `.env`) |
| Page titles, meta descriptions, structured data | `src/config/seo.ts` |
| Decoration services, before/after, decor gallery | `src/data/decoratorData.ts` |
| Facilities, policies, event categories, venue gallery | `src/data/venueData.ts` |
| Gallery items and categories | `src/data/galleryData.ts` |
| Gifting collections | `src/data/giftingData.ts` |
| Every photograph used on the site | `src/data/images.ts` |

### Environment variables

Copy `.env.example` to `.env` and fill in real values. Everything in `VITE_*`
ends up in the public JS bundle — **never put secrets, API keys or database
credentials there.**

| Variable | Purpose |
| --- | --- |
| `VITE_WHATSAPP_NUMBER` | WhatsApp business number, digits only with country code |
| `VITE_CONTACT_PHONE_DISPLAY` | Phone number as shown on the site |
| `VITE_CONTACT_EMAIL` | Public email address |
| `VITE_SITE_URL` | Canonical site URL, no trailing slash (used for SEO tags) |
| `VITE_INSTAGRAM_URL` | Instagram profile URL |

Sensible placeholders are used until these are confirmed. Values marked `TODO`
in the source are awaiting real business information — **do not invent
facilities, capacities, awards, ratings, menus or pricing.**

## Replacing the photography

All current images are curated placeholder photography. To swap in real
Bandhan Events work:

1. Drop the new files into `public/images/` (WebP preferred, ~1600px wide).
2. Point the relevant entries in `src/data/images.ts` at the new filenames.
3. Run `npm run images`.

Step 3 is the responsive-image pipeline (`scripts/optimize-images.mjs`): it
re-encodes each photo at 480/800/1200px into WebP, writes
`src/data/imageManifest.ts`, and from there `<SmartImage />` builds a real
`srcset` — so phones download ~30–60 KB instead of a 480 KB original. Images
that are missing from the manifest simply fall back to a plain `src`, so
nothing breaks if the step is skipped.

## Deployment

Static output — deploy `dist/` anywhere (Netlify, Vercel, Cloudflare Pages,
S3 + CDN). Two things matter:

1. **SPA fallback:** rewrite unknown paths to `/index.html`, otherwise deep
   links like `/banquet-catering` return 404. Netlify: `/* /index.html 200`.
2. **Update `public/robots.txt` and `public/sitemap.xml`** if the domain
   differs from `https://bandhanevents.in`.

## Performance & accessibility notes

- Routes are code-split with `React.lazy`; vendor chunks are pinned for caching.
- Responsive WebP `srcset` with explicit `sizes` per layout; below-fold images lazy-load.
- `prefers-reduced-motion` disables scroll reveals, hero motion and smooth scrolling.
- Semantic landmarks, one `<h1>` per page, skip link, visible focus rings,
  alt text on every image, keyboard-accessible carousels and gallery lightbox
  (focus is trapped in the lightbox and returned to the thumbnail on close).
- Marketing pages render client-side, so the static metadata in `index.html`
  carries the homepage title/description/Open Graph tags for link scrapers
  (WhatsApp, Facebook) that do not run JavaScript. `data-rh` marks those
  defaults as replaceable so per-route tags never duplicate them.
