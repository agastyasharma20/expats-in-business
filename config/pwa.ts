/**
 * App identity for the installable web app (manifest, install prompt). Swappable values: the
 * descriptive texts mirror `meta` in messages/en.json (manifest files cannot use next-intl).
 */
export const pwaConfig = {
  name: "Expats in Business",
  shortName: "EiB",
  description: "The business network for internationals.",
  /** Opens on the locale-aware home page; `source=pwa` lets analytics tell installs apart. */
  startUrl: "/?source=pwa",
  /** Quick actions on the app icon (long-press on Android, right-click on desktop). */
  shortcuts: [
    { name: "My events and tickets", shortName: "Tickets", url: "/my/events?source=pwa" },
    { name: "Upcoming events", shortName: "Events", url: "/events?source=pwa" },
    { name: "Ask the concierge", shortName: "Concierge", url: "/concierge?source=pwa" },
  ],
} as const;
