/**
 * Colour tokens mirrored from app/globals.css (`:root`). The CSS file is the source used by the UI;
 * this copy exists so the styleguide and tests can compute contrast. tests/unit/tokens.test.ts fails
 * if the two drift apart. Never import these values into components for styling: use Tailwind classes.
 */
export const colorTokens = {
  "brand-950": "#093334",
  "brand-900": "#074c4c",
  "brand-800": "#104d4d",
  "brand-700": "#12635a",
  "brand-500": "#2e8f80",
  "brand-200": "#b3dfe3",
  "brand-100": "#c5e8eb",
  "brand-50": "#f2faf9",
  "ember-500": "#ff3514",
  "ember-700": "#a5200a",
  "ember-600": "#c2260c",
  "ember-50": "#fff0ec",
  ink: "#0f1a1a",
  "ink-muted": "#51605f",
  "on-dark": "#ffffff",
  "on-dark-muted": "#b3c2c1",
  line: "#dce5e4",
  "line-strong": "#7a8b8a",
  surface: "#ffffff",
  canvas: "#f7faf9",
  success: "#1f7a4d",
  "success-50": "#e8f5ee",
  warning: "#8a4f00",
  "warning-50": "#fdf3e3",
  "danger-700": "#93261f",
  danger: "#b3261e",
  "danger-50": "#fcebea",
  highlight: "#f2b544",
} as const;

export type ColorToken = keyof typeof colorTokens;

/** Token names in display order. Their usage notes are message ids under `styleguide.tokens`. */
export const colorTokenNames = Object.keys(colorTokens) as ColorToken[];

export type ContrastLevel = "body" | "large" | "nonText";

export type ContrastPair = {
  id: string;
  foreground: ColorToken;
  background: ColorToken;
  /** body needs 4.5:1; large (≥ 24px, or ≥ 18.66px bold) and nonText need 3:1. */
  level: ContrastLevel;
};

/**
 * Every text/background combination the design system uses. Each one is shown with its ratio on
 * /styleguide and checked in tests/unit/contrast.test.ts. The `id` is the message key for its usage.
 */
export const contrastPairs: ContrastPair[] = [
  { id: "bodyOnCanvas", foreground: "ink", background: "canvas", level: "body" },
  { id: "bodyOnSurface", foreground: "ink", background: "surface", level: "body" },
  { id: "mutedOnCanvas", foreground: "ink-muted", background: "canvas", level: "body" },
  { id: "mutedOnSurface", foreground: "ink-muted", background: "surface", level: "body" },
  { id: "mutedOnWash", foreground: "ink-muted", background: "brand-50", level: "body" },
  { id: "headingOnCanvas", foreground: "brand-950", background: "canvas", level: "body" },
  { id: "headingOnSurface", foreground: "brand-950", background: "surface", level: "body" },
  { id: "linkOnSurface", foreground: "brand-700", background: "surface", level: "body" },
  { id: "linkOnCanvas", foreground: "brand-700", background: "canvas", level: "body" },
  { id: "primaryButton", foreground: "on-dark", background: "brand-700", level: "body" },
  { id: "primaryButtonHover", foreground: "on-dark", background: "brand-800", level: "body" },
  { id: "footerText", foreground: "on-dark", background: "brand-950", level: "body" },
  { id: "footerMuted", foreground: "on-dark-muted", background: "brand-950", level: "body" },
  { id: "secondaryButton", foreground: "brand-950", background: "brand-100", level: "body" },
  { id: "ghostHover", foreground: "brand-950", background: "brand-50", level: "body" },
  { id: "highlightButton", foreground: "on-dark", background: "ember-600", level: "body" },
  { id: "highlightButtonHover", foreground: "on-dark", background: "ember-700", level: "body" },
  { id: "secondaryButtonHover", foreground: "brand-950", background: "brand-200", level: "body" },
  { id: "destructiveButton", foreground: "on-dark", background: "danger", level: "body" },
  { id: "destructiveButtonHover", foreground: "on-dark", background: "danger-700", level: "body" },
  { id: "linkHover", foreground: "brand-800", background: "surface", level: "body" },
  { id: "bubbleBadge", foreground: "ember-600", background: "ember-50", level: "body" },
  { id: "foundingBadge", foreground: "ink", background: "highlight", level: "body" },
  { id: "successText", foreground: "success", background: "surface", level: "body" },
  { id: "successAlert", foreground: "success", background: "success-50", level: "body" },
  { id: "warningText", foreground: "warning", background: "surface", level: "body" },
  { id: "warningAlert", foreground: "warning", background: "warning-50", level: "body" },
  { id: "errorText", foreground: "danger", background: "surface", level: "body" },
  { id: "errorAlert", foreground: "danger", background: "danger-50", level: "body" },
  { id: "inputBorder", foreground: "line-strong", background: "surface", level: "nonText" },
  { id: "focusRing", foreground: "brand-700", background: "surface", level: "nonText" },
  { id: "focusRingOnCanvas", foreground: "brand-700", background: "canvas", level: "nonText" },
  { id: "focusRingOnWash", foreground: "brand-700", background: "brand-50", level: "nonText" },
  { id: "focusRingOnTint", foreground: "brand-700", background: "brand-100", level: "nonText" },
  { id: "outlineButtonBorder", foreground: "brand-950", background: "surface", level: "nonText" },
  { id: "dashedBorderOnCanvas", foreground: "line-strong", background: "canvas", level: "nonText" },
];
