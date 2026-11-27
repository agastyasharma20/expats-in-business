/**
 * Which "install the app" instructions fit this device. Pure (no window access) so it is testable;
 * the browser passes its user agent in. Browsers differ a lot here: only Chromium browsers can
 * install with one tap, iPhones need Share, Safari on a Mac uses "Add to Dock", and Firefox on a
 * computer cannot install web apps at all.
 */
export const INSTALL_PLATFORMS = [
  "ios-safari",
  "ios-other",
  "android-chromium",
  "android-samsung",
  "android-firefox",
  "desktop-chromium",
  "desktop-safari",
  "desktop-firefox",
  "other",
] as const;

export type InstallPlatform = (typeof INSTALL_PLATFORMS)[number];

export function detectPlatform(userAgent: string, touchMac = false): InstallPlatform {
  const ua = userAgent.toLowerCase();

  // iPadOS 13+ reports itself as a Mac with a touch screen.
  if (/iphone|ipad|ipod/.test(ua) || touchMac) {
    return /crios|fxios|edgios|opios|gsa\//.test(ua) ? "ios-other" : "ios-safari";
  }
  if (ua.includes("android")) {
    if (ua.includes("samsungbrowser")) return "android-samsung";
    if (ua.includes("firefox")) return "android-firefox";
    return "android-chromium";
  }
  if (ua.includes("firefox")) return "desktop-firefox";
  if (/edg\/|chrome\/|chromium|opr\//.test(ua)) return "desktop-chromium";
  if (ua.includes("safari")) return "desktop-safari";
  return "other";
}

export const isDesktop = (platform: InstallPlatform) =>
  platform.startsWith("desktop-") || platform === "other";
