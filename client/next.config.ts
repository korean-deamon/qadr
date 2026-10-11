import type { NextConfig } from "next"
import { withCn } from "cn/next"
import createNextIntlPlugin from "next-intl/plugin"

const API = process.env.API_INTERNAL_URL ?? "http://localhost:8000"

const nextConfig: NextConfig = {
  output: "standalone",
  // Same-origin API in development (in Docker, Caddy routes /api before Next)
  async rewrites() {
    return [{ source: "/api/v1/:path*", destination: `${API}/api/v1/:path*` }]
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    formats: ["image/avif", "image/webp"],
    // Fewer candidate widths keep every srcset (and the RSC payload) short
    deviceSizes: [640, 828, 1080, 1440, 1920],
    imageSizes: [64, 128, 256, 384],
    localPatterns: [{ pathname: "/api/v1/media/**" }, { pathname: "/images/**" }, { pathname: "/icons/**" }, { pathname: "/_next/static/media/**" }],
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
}

const withNextIntl = createNextIntlPlugin({
  requestConfig: "./src/i18n/request.ts",
  // ICU messages compiled at build time: no message parser in the client bundle
  experimental: { messages: { path: "./messages", format: "json", locales: "infer", precompile: true } },
})

// Project-fitted class-merge tables (~8 KB instead of the full default config)
export default withCn(withNextIntl(nextConfig), {
  content: ["src/**/*.{ts,tsx}"],
  out: "src/lib/cn-tables.ts",
  css: "src/app/globals.css",
})
