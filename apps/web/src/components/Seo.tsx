import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import {
  seoByRoute,
  buildLocalBusinessJsonLd,
  buildOrganizationJsonLd,
  buildBreadcrumbJsonLd,
} from "@/config/seo";
import { siteConfig } from "@/config/site";
import { useBusinessSettings } from "@/providers/SettingsProvider";

interface SeoProps {
  /** Optional override — otherwise metadata is looked up by current route. */
  route?: string;
  /** Breadcrumb trail rendered as BreadcrumbList structured data. */
  breadcrumbs?: { name: string; path: string }[];
}

export default function Seo({ route, breadcrumbs }: SeoProps) {
  const location = useLocation();
  // Business values are editable in the dashboard, so structured data follows them.
  const { address } = useBusinessSettings();
  const key = route ?? location.pathname;
  const seo = seoByRoute[key];
  // Unknown routes (i.e. the 404 page) must not claim the homepage's title or
  // canonical URL — fall back to a distinct, noindex-able page entry.
  const page = seo ?? { ...seoByRoute["/404"], path: location.pathname };
  const url = `${siteConfig.url}${page.path}`;
  const fullTitle = page.title;
  const noindex = !seo || page.noindex;

  return (
    <Helmet prioritizeSeoTags>
      <title>{fullTitle}</title>
      <meta name="description" content={page.description} />
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex, follow" />}
      <meta property="og:site_name" content={siteConfig.name} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={page.description} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={`${siteConfig.url}${siteConfig.ogImage}`} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta
        property="og:image:alt"
        content="Bandhan Events — wedding decoration and banquet venue in Mulund West, Mumbai"
      />
      <meta property="og:locale" content="en_IN" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={page.description} />
      <meta name="twitter:image" content={`${siteConfig.url}${siteConfig.ogImage}`} />

      {/* Organization + LocalBusiness/EventVenue structured data on every route */}
      <script type="application/ld+json">{JSON.stringify(buildOrganizationJsonLd(address))}</script>
      <script type="application/ld+json">
        {JSON.stringify(buildLocalBusinessJsonLd(address))}
      </script>
      {breadcrumbs && (
        <script type="application/ld+json">
          {JSON.stringify(buildBreadcrumbJsonLd(breadcrumbs))}
        </script>
      )}
    </Helmet>
  );
}
