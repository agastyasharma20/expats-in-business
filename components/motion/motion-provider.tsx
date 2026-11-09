"use client";

import { domAnimation, LazyMotion, MotionConfig } from "motion/react";

/**
 * Wraps the app once. reducedMotion="user" makes every Motion animation respect the OS setting;
 * LazyMotion + `m` components keep the animation bundle small (strict: `motion.*` is not allowed).
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={domAnimation} strict>
        {children}
      </LazyMotion>
    </MotionConfig>
  );
}
