/**
 * SEOHead — Reusable page-level meta tag component
 *
 * Sprint 43: Phase 6.1 SEO Foundation
 *
 * Uses react-helmet-async to inject <head> tags per page.
 * Provides default OpenGraph, Twitter Card, and structured data.
 */

import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: 'website' | 'article';
  noindex?: boolean;
  structuredData?: Record<string, unknown>;
}

const DEFAULTS = {
  siteName: 'Flux Studio',
  title: 'Flux Studio — Design in Motion',
  description:
    'The creative collaboration platform where teams design, prototype, and ship together in real time. AI-assisted workflows, offline-first, and built for speed.',
  url: 'https://fluxstudio.art',
  ogImage: 'https://fluxstudio.art/og-image.png',
};

export function SEOHead({
  title,
  description = DEFAULTS.description,
  canonicalUrl,
  ogImage = DEFAULTS.ogImage,
  ogType = 'website',
  noindex = false,
  structuredData,
}: SEOHeadProps) {
  const fullTitle = title
    ? `${title} | ${DEFAULTS.siteName}`
    : DEFAULTS.title;

  const canonical = canonicalUrl || DEFAULTS.url;

  return (
    <Helmet>
      {/* Primary meta */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}
      <link rel="canonical" href={canonical} />

      {/* Open Graph */}
      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content={DEFAULTS.siteName} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* Structured data (JSON-LD) */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
}
