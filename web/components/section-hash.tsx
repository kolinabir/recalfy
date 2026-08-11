"use client";

import { useEffect } from "react";

/**
 * Keeps the address bar in step with what you're actually looking at, so a
 * section can be linked to by scrolling to it and copying the URL.
 *
 * History is replaced rather than pushed — a scroll is not a navigation, and
 * pushing would turn the back button into an undo-scrolling button.
 *
 * Offsets are measured up front and re-measured only when the layout could
 * have moved, so the scroll handler itself is pure arithmetic: no layout reads
 * on every frame, and no dependency on requestAnimationFrame (which browsers
 * pause in background tabs).
 */
export function SectionHash({ ids }: { ids: string[] }) {
  useEffect(() => {
    let tops: { id: string; top: number }[] = [];
    let height = 0;

    const measure = () => {
      height = document.documentElement.scrollHeight;
      tops = ids
        .map((id) => {
          const el = document.getElementById(id);
          if (!el) return null;
          return { id, top: el.getBoundingClientRect().top + window.scrollY };
        })
        .filter((entry): entry is { id: string; top: number } => entry !== null);
    };

    const sync = () => {
      // Reveal animations and font swaps change the page height after mount;
      // re-measure when that happens rather than trusting stale offsets.
      if (document.documentElement.scrollHeight !== height) measure();

      // Anchor on the line just under the fixed header: the current section is
      // the last one whose top has passed it.
      const line = window.scrollY + 140;
      let current = "";
      for (const entry of tops) {
        if (entry.top <= line) current = entry.id;
      }

      // At the very bottom the last section may never reach the line, but it is
      // unambiguously what's on screen.
      const atEnd =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 2;
      if (atEnd && tops.length) current = tops[tops.length - 1].id;

      const next = current ? `#${current}` : "";
      if (next !== window.location.hash) {
        window.history.replaceState(
          null,
          "",
          next || window.location.pathname + window.location.search,
        );
      }
    };

    measure();
    sync();

    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync, { passive: true });
    return () => {
      window.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, [ids]);

  return null;
}
