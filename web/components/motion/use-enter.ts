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
export function useEnter(fallbackMs = 700) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -80px 0px" });
  const [elapsed, setElapsed] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setElapsed(true), fallbackMs);
    return () => clearTimeout(id);
  }, [fallbackMs]);

  return { ref, entered: inView || elapsed };
}
