import { Cabin, Nunito_Sans } from "next/font/google";

// The fonts used on expatsinbusiness.org (docs/brand/BRAND.md), self-hosted through next/font.
// Cabin has no Cyrillic subset; Ukrainian headings fall back to Nunito Sans (see --font-heading).
export const headingFont = Cabin({
  variable: "--font-cabin",
  subsets: ["latin", "latin-ext"],
  weight: ["600", "700"],
  display: "swap",
});

export const bodyFont = Nunito_Sans({
  variable: "--font-nunito-sans",
  subsets: ["latin", "latin-ext", "cyrillic", "cyrillic-ext"],
  display: "swap",
});
