/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@smartekai/auth", "@smartekai/db", "@smartekai/billing"],
  images: {
    domains: ["images.unsplash.com", "avatars.githubusercontent.com"],
  },
  experimental: {
    turbo: {
      rules: {
        "*.svg": {
          loaders: ["@svgr/webpack"],
          as: "*.js",
        },
      },
    },
  },
};

module.exports = nextConfig;
