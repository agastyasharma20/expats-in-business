"use client";

import { useEffect } from "react";

// The first render (server HTML + hydration) must not start invisible, or LCP suffers.
// Only later client-side navigations, which remount app/[locale]/template.tsx, animate.
let hasHydrated = false;

/**
 * 200ms fade with an 8px rise between pages, as a CSS keyframe (no animation library on every
 * page). prefers-reduced-motion is handled by the global CSS rule.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const animate = hasHydrated;
  useEffect(() => {
    hasHydrated = true;
  }, []);

  return (
    <div className={animate ? "flex flex-1 animate-page-enter flex-col" : "flex flex-1 flex-col"}>
      {children}
    </div>
  );
}
