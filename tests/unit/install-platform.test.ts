import { describe, expect, it } from "vitest";

import { detectPlatform, INSTALL_PLATFORMS, isDesktop } from "@/lib/pwa/platform";

const UA = {
  iphoneSafari:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  iphoneChrome:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.0.0 Mobile/15E148 Safari/604.1",
  iphoneFirefox:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/127.0 Mobile/15E148 Safari/605.1.15",
  androidChrome:
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36",
  androidSamsung:
    "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36",
  androidFirefox: "Mozilla/5.0 (Android 14; Mobile; rv:127.0) Gecko/127.0 Firefox/127.0",
  windowsChrome:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  windowsEdge:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0",
  windowsFirefox:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0",
  macSafari:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
};

describe("detectPlatform", () => {
  it("tells iPhone Safari from other iPhone browsers", () => {
    expect(detectPlatform(UA.iphoneSafari)).toBe("ios-safari");
    expect(detectPlatform(UA.iphoneChrome)).toBe("ios-other");
    expect(detectPlatform(UA.iphoneFirefox)).toBe("ios-other");
  });

  it("treats a touch-screen Mac as an iPad", () => {
    expect(detectPlatform(UA.macSafari, true)).toBe("ios-safari");
  });

  it("recognises the Android browsers", () => {
    expect(detectPlatform(UA.androidChrome)).toBe("android-chromium");
    expect(detectPlatform(UA.androidSamsung)).toBe("android-samsung");
    expect(detectPlatform(UA.androidFirefox)).toBe("android-firefox");
  });

  it("recognises computers", () => {
    expect(detectPlatform(UA.windowsChrome)).toBe("desktop-chromium");
    expect(detectPlatform(UA.windowsEdge)).toBe("desktop-chromium");
    expect(detectPlatform(UA.windowsFirefox)).toBe("desktop-firefox");
    expect(detectPlatform(UA.macSafari)).toBe("desktop-safari");
  });

  it("falls back to generic steps for anything else", () => {
    expect(detectPlatform("")).toBe("other");
    expect(detectPlatform("SomeBot/1.0")).toBe("other");
  });

  it("always returns a known platform and knows which are computers", () => {
    for (const ua of Object.values(UA)) expect(INSTALL_PLATFORMS).toContain(detectPlatform(ua));
    expect(isDesktop("desktop-safari")).toBe(true);
    expect(isDesktop("other")).toBe(true);
    expect(isDesktop("ios-safari")).toBe(false);
    expect(isDesktop("android-chromium")).toBe(false);
  });
});
