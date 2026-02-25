/**
 * Sitemap Generator — Build-time script for generating sitemap.xml
 *
 * Generates a dynamic sitemap including all static pages and formation category pages.
 * Run via: npx tsx src/sitemap-generator.ts
 *
 * Outputs to public/sitemap.xml
 */

import { writeFileSync } from 'fs';
import { resolve } from 'path';

const BASE_URL = 'https://fluxstudio.art';

interface SitemapEntry {
  loc: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: string;
  lastmod?: string;
}

// All formation category slugs — keep in sync with FormationCategory.tsx
const FORMATION_CATEGORIES = [
  'marching-band',
  'dance-team',
  'drum-corps',
  'color-guard',
  'winter-guard',
  'indoor-drumline',
  'cheerleading',
  'pep-band',
  'drill-team',
];

const today = new Date().toISOString().split('T')[0];

const staticPages: SitemapEntry[] = [
  { loc: '/', changefreq: 'weekly', priority: '1.0', lastmod: today },
  { loc: '/login', changefreq: 'monthly', priority: '0.8' },
  { loc: '/signup', changefreq: 'monthly', priority: '0.8' },
  { loc: '/pricing', changefreq: 'weekly', priority: '0.9', lastmod: today },
  { loc: '/help', changefreq: 'weekly', priority: '0.6' },
  { loc: '/terms', changefreq: 'yearly', priority: '0.3' },
  { loc: '/privacy', changefreq: 'yearly', priority: '0.3' },
  { loc: '/try', changefreq: 'weekly', priority: '0.9', lastmod: today },
  { loc: '/templates', changefreq: 'weekly', priority: '0.9', lastmod: today },
];

const categoryPages: SitemapEntry[] = FORMATION_CATEGORIES.map(slug => ({
  loc: `/formations/${slug}`,
  changefreq: 'weekly' as const,
  priority: '0.8',
  lastmod: today,
}));

const allEntries = [...staticPages, ...categoryPages];

export function generateSitemapXml(): string {
  const urls = allEntries.map(entry => {
    const lastmodTag = entry.lastmod ? `\n    <lastmod>${entry.lastmod}</lastmod>` : '';
    return `  <url>
    <loc>${BASE_URL}${entry.loc}</loc>${lastmodTag}
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`;
}

// When run directly, write to public/sitemap.xml
const isDirectRun = process.argv[1]?.endsWith('sitemap-generator.ts') ||
                    process.argv[1]?.endsWith('sitemap-generator.js');

if (isDirectRun) {
  const xml = generateSitemapXml();
  const outPath = resolve(__dirname, '..', 'public', 'sitemap.xml');
  writeFileSync(outPath, xml, 'utf-8');
  console.log(`Sitemap written to ${outPath} (${allEntries.length} URLs)`);
}
