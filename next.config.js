/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["@dnd-kit/core", "@dnd-kit/sortable", "lucide-react"],
  },
};

module.exports = nextConfig;
