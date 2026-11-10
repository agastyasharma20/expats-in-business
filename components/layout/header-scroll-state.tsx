"use client";

import { useEffect } from "react";

/**
 * Adds data-scrolled to the site header once the page scrolls, which shrinks it with transforms
 * only (see SiteHeader). Renders nothing, so the header itself stays a Server Component.
 */
export function HeaderScrollState({ headerId }: { headerId: string }) {
  useEffect(() => {
    const header = document.getElementById(headerId);
    if (!header) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      header.toggleAttribute("data-scrolled", window.scrollY > 8);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [headerId]);

  return null;
}
