import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ─── Core ──────────────────────────────────
  reactStrictMode: true,
  compress: true, // gzip compression (Next default, made explicit)
  poweredByHeader: false, // no X-Powered-By fingerprint

  // A stray lockfile at the user profile root makes Next infer the WRONG
  // workspace root (the entire home dir). Pin it to this project so
  // Turbopack only watches/builds what it should.
  turbopack: {
    root: process.cwd(),
  },

  // ─── Image Optimization ────────────────────
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.r2.dev",
      },
      {
        protocol: "https",
        hostname: "pub-*.r2.dev",
      },
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },

  // ─── Security Headers ─────────────────────
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

