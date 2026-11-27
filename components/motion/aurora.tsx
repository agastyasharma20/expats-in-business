"use client";

import { useEffect, useState } from "react";

/**
 * Decorative drifting light behind the hero. It mounts only after the page has loaded and the
 * browser is idle, so it can never delay the first paint or the largest contentful paint (measured:
 * rendering it up front cost 3.5 s of LCP on a throttled phone). Without JavaScript it is absent.
 */
export function Aurora() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const start = () => {
      const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 200));
      idle(() => setReady(true));
    };
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
    return () => window.removeEventListener("load", start);
  }, []);

  if (!ready) return null;
  return (
    <div aria-hidden="true" className="aurora aurora-in">
      <span className="aurora-blob aurora-blob-a" />
      <span className="aurora-blob aurora-blob-b" />
      <span className="aurora-blob aurora-blob-c" />
    </div>
  );
}
