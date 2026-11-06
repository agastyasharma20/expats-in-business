import createMiddleware from "next-intl/middleware";

import { routing } from "@/lib/i18n/routing";

// Locale routing. Milestone 5 adds the nonce-based CSP here.
export default createMiddleware(routing);

export const config = {
  // Skip API routes, Next internals and files with an extension.
  matcher: ["/((?!api|_next|_vercel|.*\..*).*)"],
};
