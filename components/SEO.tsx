import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

// Derived from NEXTAUTH_URL env var — automatically correct in every environment.
// Falls back to empty string so canonical is still valid as a relative URL.
const SITE_URL = (process.env.NEXTAUTH_URL || '').replace(/\/$/, '');
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.jpg`;
const SITE_NAME = 'The Humours Hub';

interface SEOProps {
  /** Page title — will be appended with " | The Humours Hub" */
  title: string;
  /** Meta description — keep under 160 characters */
  description?: string;
  /**
   * Canonical path — pass ONLY the path, e.g. "/shows" or "/about".
   * SITE_URL is prepended automatically from NEXTAUTH_URL.
   * If omitted, current router pathname is used.
   */
  canonicalPath?: string;
  /** Absolute URL for OG/Twitter image — defaults to /og-image.jpg */
  ogImage?: string;
  /** If true, adds noindex,nofollow robots meta tag */
  noIndex?: boolean;
  /** Page type for OG — defaults to 'website' */
  ogType?: 'website' | 'article';
}

/**
 * SEO component — drop into every page instead of <Head>.
 * Handles title, description, canonical, OG, Twitter cards,
 * and Google site verification from env var.
 *
 * canonical is auto-derived from NEXTAUTH_URL + current route.
 * Override per-page by passing canonicalPath="/your-path".
 */
export default function SEO({
  title,
  description,
  canonicalPath,
  ogImage,
  noIndex = false,
  ogType = 'website',
}: SEOProps) {
  const router = useRouter();

  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;

  // Use provided path or fall back to current route (strips query string)
  const resolvedPath = canonicalPath ?? router.pathname;
  const canonicalUrl = `${SITE_URL}${resolvedPath === '/' ? '' : resolvedPath}`;
  const ogImageUrl = ogImage || DEFAULT_OG_IMAGE;

  return (
    <Head>
      {/* ── Primary Meta ──────────────────────────────────────────── */}
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}

      {/* ── Robots ────────────────────────────────────────────────── */}
      {noIndex ? (
        <meta name="robots" content="noindex,nofollow" />
      ) : (
        <meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1" />
      )}

      {/* ── Canonical ─────────────────────────────────────────────── */}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

      {/* ── Open Graph ────────────────────────────────────────────── */}
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      {description && <meta property="og:description" content={description} />}
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
      <meta property="og:image" content={ogImageUrl} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={`${SITE_NAME} — Ahmedabad's Comedy Night`} />
      <meta property="og:locale" content="en_IN" />

      {/* ── Twitter Card ──────────────────────────────────────────── */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      {description && <meta name="twitter:description" content={description} />}
      <meta name="twitter:image" content={ogImageUrl} />
      <meta name="twitter:image:alt" content={`${SITE_NAME} — Ahmedabad's Comedy Night`} />

      {/* ── Google Search Console Verification ───────────────────── */}
      {process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION && (
        <meta
          name="google-site-verification"
          content={process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION}
        />
      )}
    </Head>
  );
}
