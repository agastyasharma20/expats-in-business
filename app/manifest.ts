import type { MetadataRoute } from "next";

import { pwaConfig } from "@/config/pwa";
import { colorTokens } from "@/lib/design/tokens";

/** Web app manifest: makes EiB installable (Android, desktop Chrome and Edge, iOS via Safari). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: pwaConfig.name,
    short_name: pwaConfig.shortName,
    description: pwaConfig.description,
    start_url: pwaConfig.startUrl,
    scope: "/",
    display: "standalone",
    background_color: colorTokens.canvas,
    theme_color: colorTokens["brand-950"],
    categories: ["business", "social", "networking"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: pwaConfig.shortcuts.map((shortcut) => ({
      name: shortcut.name,
      short_name: shortcut.shortName,
      url: shortcut.url,
      icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    })),
  };
}
