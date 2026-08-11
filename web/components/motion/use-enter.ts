"use client";

import { useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";

/**
 * In-view detection with a hard fallback.
 *
 * Content must never depend on IntersectionObserver to become visible — if the
 * observer never reports (embedded/offscreen renderers, some headless surfaces,
 * prerendered snapshots), the page would ship blank. So the entry state also
 * resolves on a timer, whichever comes first.
 */
export function useEnter(fallbackMs = 700, amount?: number | "some" | "all") {
  const ref = useRef<HTMLElement>(null);
  // `amount` waits until that fraction of the element is on screen, for content
  // that should not start playing before it can actually be watched. Without
  // it, the usual nudge margin applies: fire just before the element lands.
  const inView = useInView(
    ref,
    amount === undefined
      ? { once: true, margin: "0px 0px -80px 0px" }
      : { once: true, amount },
  );
  const [elapsed, setElapsed] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setElapsed(true), fallbackMs);
    return () => clearTimeout(id);
  }, [fallbackMs]);

  return { ref, entered: inView || elapsed };
}
