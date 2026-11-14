import type { NextConfig } from "next";
import path from "node:path";

import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./lib/i18n/request.ts");

const isDev = process.env.NODE_ENV !== "production";
const httpsOrigin = (process.env.APP_URL ?? "").startsWith("https://");

/**
 * Content Security Policy. Scripts and styles only from this origin (inline allowed because the
 * App Router streams inline bootstrap scripts and Cache Components rules out per-request nonces);
 * no plugins, no framing, no foreign form targets except Stripe Checkout and Google sign-in.
 * Dev adds eval and the HMR websocket.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self' https://checkout.stripe.com https://accounts.google.com",
  "manifest-src 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  // Camera stays available to this origin for the door QR scanner; everything else is off.
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  ...(httpsOrigin
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
    : []),
];

const nextConfig: NextConfig = {
  // Local embeddings run on onnxruntime-node (native): load from node_modules, never bundle.
  serverExternalPackages: ["@huggingface/transformers", "onnxruntime-node"],
  cacheComponents: true,
  // 404 for URLs outside any locale (app/global-not-found.tsx); [locale] stays the root layout so
  // next/root-params can provide the locale.
  experimental: {
    globalNotFound: true,
    authInterrupts: true,
    // Team photos are uploaded through a Server Action (checked to 2 MB, then resized).
    serverActions: { bodySizeLimit: "3mb" },
  },
  partialPrefetching: true,
  poweredByHeader: false,
  turbopack: {
    // Pin the workspace root so a stray lockfile in a parent folder is ignored.
    root: path.resolve(import.meta.dirname),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default withNextIntl(nextConfig);
