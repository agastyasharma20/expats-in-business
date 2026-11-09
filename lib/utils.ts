import { createCn } from "cn/config";

/**
 * Class merger that knows EiB's custom Tailwind tokens. Without this, tailwind-merge treats
 * `text-body`/`text-small`/`text-h3` as colours and silently drops e.g. `text-primary-foreground`.
 * Keep these lists in sync with the --text-*, --shadow-* and --radius-* tokens in app/globals.css.
 */
export const cn = createCn({
  extend: {
    classGroups: {
      "font-size": [{ text: ["display", "display-sm", "h1", "h2", "h3", "body", "small"] }],
      shadow: [{ shadow: ["card", "raised"] }],
      rounded: [{ rounded: ["pill"] }],
    },
  },
});
