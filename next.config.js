const withSerwist = require("@serwist/next").default({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Empty turbopack config so Next.js 16 accepts the webpack plugin from @serwist/next
  turbopack: {},
  experimental: {
    optimizePackageImports: ["@dnd-kit/core", "@dnd-kit/sortable", "lucide-react"],
  },
};

module.exports = withSerwist(nextConfig);
