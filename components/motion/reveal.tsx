"use client";

import { m } from "motion/react";

import { duration, ease, stagger } from "./tokens";

type RevealProps = {
  children: React.ReactNode;
  /** Position in a group: each step adds a 60ms delay. */
  index?: number;
  className?: string;
  as?: "div" | "section" | "li";
};

/**
 * Fades and lifts content in when it scrolls into view (500ms, once). Use for content below the
 * fold: the server renders it transparent until hydration, so never wrap the LCP element.
 */
export function Reveal({ children, index = 0, className, as = "div" }: RevealProps) {
  const Component = m[as];
  return (
    <Component
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: duration.entrance, ease, delay: index * stagger }}
    >
      {children}
    </Component>
  );
}
