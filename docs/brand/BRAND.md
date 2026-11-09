# EiB brand: extracted from the live site

Extracted on 2026-11-07 with the Playwright MCP from https://expatsinbusiness.org/ and
https://expatsinbusiness.org/eib-connect/, at 1440 px and 375 px. The method was computed styles plus
Elementor global CSS variables, with logo pixels sampled on a canvas.
Screenshots: `home-desktop.png`, `home-mobile.png`, `eib-connect-desktop.png`, `eib-connect-mobile.png`.
The cookie banner covers the lower left of each shot.

## 1. What the live site uses

### Colours

| Value                | Where found                                                                                                                            | Notes                                                      |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `#093334`            | `--e-global-color-primary`; top bar, footer and section backgrounds on EiB Connect; favicon circle (pixel sample); "Accept all" button | **Deep Teal.** The starting token `#0A3335` was 1 step off |
| `#074C4C`            | Logo wordmark and monogram (pixel histogram of the 3000 px logo)                                                                       | Logo teal                                                  |
| `#104D4D`            | `--e-global-color-secondary` and `--e-global-color-text`; section backgrounds                                                          | Secondary teal                                             |
| `#C5E8EB`            | `--e-global-color-accent`                                                                                                              | Light tint                                                 |
| `#FF3514`            | Every "JOIN NOW!" CTA background on EiB Connect                                                                                        | Orange-red CTA                                             |
| `#62718D`            | Theme body text colour (`body`); footer text                                                                                           | Grey-blue body text                                        |
| `#202B5D`            | Card titles on EiB Connect (h3, Cabin 500)                                                                                             | Navy, used once                                            |
| `#1780C2`            | Cultoura 2025 sections on the homepage                                                                                                 | **Cultoura sub-brand**, not EiB core                       |
| `#F4F4F4`, `#FFFBF1` | Light section backgrounds                                                                                                              |                                                            |
| `#12635A`            | **Not found** on either page                                                                                                           | Starting token "EiB Green" was an estimate                 |

### Typography

| Role                    | Live value                                                                                                             | Source                                                           |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Headings                | **Cabin** 700 (h1/h3 50/56 px), 600 (40/44), 500 (24/30), sentence case                                                | computed `font-family`, `document.fonts` (loaded: Cabin 400–700) |
| Body                    | **Nunito Sans** 400, 17/26 px                                                                                          | computed on `body`; loaded: Nunito Sans 400–700                  |
| Buttons                 | Cabin 700 20 px, square corners (radius 0); outline button "NEED HELP?" Cabin 400 18 px with a 1.4 px Deep Teal border | computed on `.elementor-button`                                  |
| Declared but not loaded | Roboto / Roboto Slab (`--e-global-typography-*`), Inter (a stylesheet link)                                            | Elementor defaults; no element renders them                      |

Cabin and Nunito Sans are both Google Fonts, so we self-host them through `next/font/google`.

### Logo and icon

| Asset                                                                              | Live URL                                                  | Status                                                                                                                                                                                         |
| ---------------------------------------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Wordmark ("EB" monogram + "Expats in Business"), 3000×915 PNG, teal on transparent | `/wp-content/uploads/2024/12/35-1-e1734818059343.png`     | **Broken on the live site.** The `<img>` points at an old staging host (`dwz.psz.mybluehost.me`), so only the alt text shows. The same path on expatsinbusiness.org works. Worth telling Ziyan |
| Monogram favicon: white "EB" on a Deep Teal circle, 270×270                        | `/wp-content/uploads/2025/01/cropped-favicon-270x270.png` | Works                                                                                                                                                                                          |

Originals are kept in `docs/brand/source/`. `node scripts/brand-assets.mjs` regenerates:

- `public/brand/eib-logo.png` (1200 px, original teal) and `public/brand/eib-logo-white.png` (for Deep Teal backgrounds)
- `public/brand/eib-monogram.png`, `app/icon.png` and `app/apple-icon.png`

The logo is a large raster (3000 px), so it was **not** redrawn as SVG. A hand-traced "EB" would drift
from the real artwork. If EiB has the vector source (AI/SVG/PDF), drop it into `docs/brand/source/`.

## 2. Contrast check (WCAG 2.1, computed)

| Pair                                      | Ratio       | Use                                                                          |
| ----------------------------------------- | ----------- | ---------------------------------------------------------------------------- |
| white on `#093334`                        | 13.68       | ✅ any text                                                                  |
| white on `#104D4D`                        | 9.59        | ✅ any text                                                                  |
| white on `#12635A`                        | 7.10        | ✅ any text                                                                  |
| white on `#FF3514` (live CTA)             | **3.64**    | ❌ fails body text; only passes for large text (≥ 24 px, or ≥ 18.66 px bold) |
| white on `#C2260C` (darkened CTA)         | 5.87        | ✅ any text                                                                  |
| `#62718D` (live body) on white            | 4.92        | ✅ barely                                                                    |
| `#62718D` on `#093334` (live footer text) | **2.78**    | ❌ fails                                                                     |
| `#51605F` on white / canvas               | 6.59 / 6.27 | ✅                                                                           |
| `#B3C2C1` on `#093334`                    | 7.43        | ✅ muted text on dark                                                        |
| `#093334` on `#C5E8EB`                    | 10.50       | ✅                                                                           |
| `#1780C2` on white                        | 4.28        | ❌ for body text (Cultoura blue)                                             |

## 3. Starting tokens vs live

| Token                      | Starting              | Live / new              | Decision                                                                                                |
| -------------------------- | --------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------- |
| `brand-950` Deep Teal      | `#0A3335`             | `#093334`               | **Use live**                                                                                            |
| `brand-900` logo teal      | (none)                | `#074C4C`               | **Add**                                                                                                 |
| `brand-800`                | `#0E4A48`             | `#104D4D`               | **Use live** (Elementor secondary)                                                                      |
| `brand-700` primary action | `#12635A`             | not on site             | **Keep** as the accessible primary button and link colour (7.10:1). It sits inside the live teal family |
| `brand-500`                | `#2E8F80`             | not on site             | Keep; decoration and focus only (3.92:1 with white)                                                     |
| `brand-100` tint           | `#E0F4F3`             | `#C5E8EB`               | **Use live**                                                                                            |
| `brand-50`                 | `#F2FAF9`             | (none)                  | Keep (lightest wash)                                                                                    |
| `ember-500` CTA            | (none)                | `#FF3514`               | **Add for decoration and large text only**                                                              |
| `ember-600`                | (none)                | `#C2260C`               | **Add**: the "Join" highlight button with white text (5.87:1)                                           |
| `highlight`                | `#F2B544`             | not on site             | Keep for the founding badge only (dark text)                                                            |
| ink / muted                | `#0F1A1A` / `#51605F` | `#212121` / `#62718D`   | **Keep ours**: same feel, more contrast                                                                 |
| on-dark muted              | (none)                | `#62718D` fails on teal | **Add** `#B3C2C1`                                                                                       |
| Headings font              | Montserrat            | **Cabin**               | **Use live**                                                                                            |
| Body font                  | Inter                 | **Nunito Sans**         | **Use live**                                                                                            |
| Buttons                    | radius 8              | radius 0                | Use **8 px**: modern and touch-friendly. The square live buttons read as theme defaults                 |

## 4. Recommendation

1. **Teal family is the brand.** Deep Teal `#093334` for the logo, headings, the top bar and the footer. EiB Green `#12635A` for primary buttons and links. The tint `#C5E8EB` for soft surfaces.
2. **Keep the live energy of the orange-red CTA, but only where it stays accessible.** Use `ember-600` (`#C2260C`) for one "Join EiB" highlight button per screen. Use `ember-500` (`#FF3514`) only for icons, the live dot and large display text.
3. **Fonts: Cabin (headings, 600–700, sentence case) and Nunito Sans (body).** This replaces the brief's Montserrat and Inter guess. These are the fonts EiB members already see.
4. **Cultoura blue `#1780C2` stays a sub-brand colour.** It's reserved for Cultoura pages later, and fails 4.5:1 on white for body text.
5. **Tell Ziyan the live logo is broken** (staging URL) and ask for the vector source of the logo.
