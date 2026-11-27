import {
  CheckIcon,
  DownloadIcon,
  MenuIcon,
  MonitorIcon,
  MoreVerticalIcon,
  PlusSquareIcon,
  QrCodeIcon,
  ShareIcon,
  SmartphoneIcon,
  type LucideIcon,
} from "lucide-react";

import type { InstallPlatform } from "@/lib/pwa/platform";

/** The steps to install on each kind of device. Text lives in messages (pwa.install.steps.<key>). */
export type InstallStep = { icon: LucideIcon; key: string };

export const INSTALL_STEPS: Record<InstallPlatform, InstallStep[]> = {
  "ios-safari": [
    { icon: ShareIcon, key: "share" },
    { icon: PlusSquareIcon, key: "addHome" },
    { icon: CheckIcon, key: "confirmAdd" },
  ],
  "ios-other": [
    { icon: ShareIcon, key: "share" },
    { icon: PlusSquareIcon, key: "addHome" },
    { icon: SmartphoneIcon, key: "orSafari" },
  ],
  "android-chromium": [
    { icon: MoreVerticalIcon, key: "menuDots" },
    { icon: DownloadIcon, key: "installApp" },
    { icon: CheckIcon, key: "confirmInstall" },
  ],
  "android-samsung": [
    { icon: MenuIcon, key: "menuLines" },
    { icon: PlusSquareIcon, key: "addToHome" },
    { icon: CheckIcon, key: "confirmAdd" },
  ],
  "android-firefox": [
    { icon: MoreVerticalIcon, key: "menuDots" },
    { icon: DownloadIcon, key: "installApp" },
    { icon: CheckIcon, key: "confirmInstall" },
  ],
  "desktop-chromium": [
    { icon: MonitorIcon, key: "addressIcon" },
    { icon: DownloadIcon, key: "clickInstall" },
  ],
  "desktop-safari": [
    { icon: MenuIcon, key: "fileMenu" },
    { icon: PlusSquareIcon, key: "addDock" },
  ],
  "desktop-firefox": [
    { icon: MonitorIcon, key: "firefoxNo" },
    { icon: QrCodeIcon, key: "useChromeOrPhone" },
  ],
  other: [
    { icon: MoreVerticalIcon, key: "browserMenu" },
    { icon: DownloadIcon, key: "installOrAdd" },
  ],
};

/** The order "other devices" are listed in. */
export const DEVICE_GROUPS: { id: string; platforms: InstallPlatform[] }[] = [
  { id: "ios", platforms: ["ios-safari"] },
  { id: "android", platforms: ["android-chromium", "android-samsung", "android-firefox"] },
  { id: "desktop", platforms: ["desktop-chromium", "desktop-safari", "desktop-firefox"] },
];
