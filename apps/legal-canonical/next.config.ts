import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  /* config options here */
  serverExternalPackages: ["pdf-parse-fork", "@llamaindex/liteparse", "mammoth", "@crawlee/cheerio", "crawlee", "header-generator", "got-scraping"],
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/en/industries/law-firms',
        destination: '/en/products/legal-assistant-os',
        permanent: true,
      },
      {
        source: '/ar/industries/law-firms',
        destination: '/ar/products/legal-assistant-os',
        permanent: true,
      },
      {
        source: '/en/industries/healthcare',
        destination: '/en/products/medical-scribe',
        permanent: true,
      },
      {
        source: '/ar/industries/healthcare',
        destination: '/ar/products/medical-scribe',
        permanent: true,
      },
      // Catch-all for any other stray links in those folders
      {
        source: '/:locale/industries/:path*',
        destination: '/:locale/products/legal-assistant-os',
        permanent: true,
      },
      {
        source: '/:locale/dashboard/profile',
        destination: '/:locale/dashboard/settings/profile',
        permanent: true,
      },
      {
        source: '/:locale/dashboard/billing',
        destination: '/:locale/dashboard/settings/billing',
        permanent: true,
      }
    ];
  },
};

export default withNextIntl(nextConfig);
