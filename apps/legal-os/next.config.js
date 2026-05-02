const path = require("path");
const createNextIntlPlugin = require("next-intl/plugin");

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@smartekai/auth",
    "@smartekai/db",
    "@smartekai/billing",
    "@smartekai/marketing",
    "@smartekai/ui",
  ],
  serverExternalPackages: [
    "@llamaindex/liteparse",
    "mammoth",
    "pdf-parse-fork",
    "word-extractor",
  ],
  turbopack: {
    root: path.join(__dirname, "../.."),
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        port: "",
        pathname: "/**",
        search: "",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
        port: "",
        pathname: "/**",
        search: "",
      },
    ],
  },
};

module.exports = withNextIntl(nextConfig);
