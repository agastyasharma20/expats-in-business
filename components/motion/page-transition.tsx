"use client";

import { useEffect } from "react";
import { m } from "motion/react";

import { duration, ease } from "./tokens";

// The first render (server HTML + hydration) must not start invisible, or LCP suffers.
// Only later client-side navigations, which remount app/[locale]/template.tsx, animate.
let hasHydrated = false;

/** 200ms fade with an 8px rise between pages. */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const animate = hasHydrated;
  useEffect(() => {
    hasHydrated = true;
  }, []);

  return (
    <m.div
      className="flex flex-1 flex-col"
      initial={animate ? { opacity: 0, y: 8 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: duration.page, ease }}
    >
      {children}
    </m.div>
  );
}
