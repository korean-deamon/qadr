import type { NextConfig } from "next"
import { withCn } from "cn/next"
import createNextIntlPlugin from "next-intl/plugin"

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
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
