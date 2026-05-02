/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@smartekai/auth",
    "@smartekai/db",
    "@smartekai/billing",
    "@smartekai/ai",
  ],
  images: {
    domains: ["images.unsplash.com", "avatars.githubusercontent.com"],
  },
};

module.exports = nextConfig;
