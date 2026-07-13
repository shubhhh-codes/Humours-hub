import type { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';

const SITE_URL = (process.env.NEXTAUTH_URL || 'https://humourshub.shubhhh.in').replace(/\/$/, '');
// Static pages that should always appear in the sitemap
const STATIC_PAGES = [
  { url: '/', changefreq: 'weekly', priority: '1.0' },
  { url: '/shows', changefreq: 'weekly', priority: '0.9' },
  { url: '/gallery', changefreq: 'weekly', priority: '0.8' },
  { url: '/about', changefreq: 'monthly', priority: '0.7' },
  { url: '/perform-with-us', changefreq: 'monthly', priority: '0.7' },
  { url: '/contact', changefreq: 'monthly', priority: '0.6' },
  { url: '/support', changefreq: 'monthly', priority: '0.6' },
  { url: '/policies', changefreq: 'monthly', priority: '0.4' },
];

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function generateSitemap(): Promise<string> {
  const now = new Date().toISOString().split('T')[0];

  // Try to get dynamic content dates from the DB
  let lastShowModified = now;
  let lastGalleryModified = now;

  try {
    const client = await clientPromise;
    const db = client.db();

    // Get the most recently updated show
    const latestShow = await db
      .collection('homepage_content')
      .findOne(
        { type: { $in: ['next_show', 'past_shows'] }, isVisible: true },
        { sort: { updatedAt: -1 }, projection: { updatedAt: 1 } }
      );

    if (latestShow?.updatedAt) {
      lastShowModified = new Date(latestShow.updatedAt).toISOString().split('T')[0];
    }

    // Get the most recently updated gallery item
    const latestGallery = await db
      .collection('homepage_content')
      .findOne(
        { type: 'gallery', isVisible: true },
        { sort: { updatedAt: -1 }, projection: { updatedAt: 1 } }
      );

    if (latestGallery?.updatedAt) {
      lastGalleryModified = new Date(latestGallery.updatedAt).toISOString().split('T')[0];
    }
  } catch {
    // If DB fails, use today's date — sitemap still works
  }

  const dynamicDates: Record<string, string> = {
    '/': now,
    '/shows': lastShowModified,
    '/gallery': lastGalleryModified,
    '/about': now,
    '/perform-with-us': now,
    '/contact': now,
    '/support': now,
    '/policies': now,
  };

  const urls = STATIC_PAGES.map(
    ({ url, changefreq, priority }) => `
  <url>
    <loc>${escapeXml(SITE_URL + url)}</loc>
    <lastmod>${dynamicDates[url] || now}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
  ).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${urls}
</urlset>`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const sitemap = await generateSitemap();

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.status(200).send(sitemap);
  } catch (error) {
    console.error('Sitemap generation error:', error);
    res.status(500).json({ message: 'Failed to generate sitemap' });
  }
}
