import type { MetadataRoute } from "next";

import { getEnv } from "@/lib/env";

/** Public pages are crawlable; member, admin, API and private (token) URLs are not. */
export default function robots(): MetadataRoute.Robots {
  const base = getEnv().APP_URL;
  const privatePaths = [
    "/api/",
    "/admin",
    "/dashboard",
    "/settings",
    "/tickets",
    "/notifications",
    "/connections",
    "/community",
    "/moderation",
    "/roulette",
    "/roadmap",
    "/onboarding",
    "/my/",
    "/met/",
    "/provider/",
    "/sponsor-report/",
    "/styleguide",
  ];
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [...privatePaths, ...privatePaths.flatMap((p) => [`/pl${p}`, `/uk${p}`])],
      },
    ],
    sitemap: new URL("/sitemap.xml", base).toString(),
  };
}
