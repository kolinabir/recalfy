"use client";

import { useEffect } from "react";

export type HashSection = { id: string; name: string };

/**
 * Keeps the address bar — and the tab title — in step with what you're actually
 * looking at, so a section can be linked to by scrolling to it and copying the
 * URL, and the open tab says which part you're in.
 *
 * History is replaced rather than pushed: a scroll is not a navigation, and
 * pushing would turn the back button into an undo-scrolling button.
 *
 * Offsets are measured up front and re-measured only when the document actually
 * resizes, so the scroll handler itself is pure arithmetic. That matters more
 * than it sounds: reading `scrollHeight` while layout is dirty costs ~3.7ms in
 * a forced reflow, and doing it per scroll event blows the frame budget.
 *
 * The title is only ever changed on the client, after paint. The document's
 * real <title> is what search engines index; this is a reading aid for the
 * person with the tab open.
 */
export function SectionHash({
  sections,
  suffix,
}: {
  sections: HashSection[];
  /** Trails the section name, e.g. "Pricing · Recalfy". */
  suffix: string;
}) {
  useEffect(() => {
    // The rendered <title> is the one metadata produced — capture it rather
    // than restating it here, so the tab above the first section still reads
    // the full, indexable title instead of a truncated stand-in.
    const base = document.title;
    let tops: { id: string; name: string; top: number }[] = [];
    let height = 0;
    let frame = 0;

    const measure = () => {
      height = document.documentElement.scrollHeight;
      tops = sections
        .map((section) => {
          const el = document.getElementById(section.id);
          if (!el) return null;
          return {
            ...section,
            top: el.getBoundingClientRect().top + window.scrollY,
          };
        })
        .filter((entry): entry is (typeof tops)[number] => entry !== null);
    };

    const sync = () => {
      frame = 0;

      // Anchor on the line just under the fixed header: the current section is
      // the last one whose top has passed it.
      const line = window.scrollY + 140;
      let current: (typeof tops)[number] | undefined;
      for (const entry of tops) {
        if (entry.top <= line) current = entry;
      }

      // At the very bottom the last section may never reach the line, but it is
      // unambiguously what's on screen. This reads the cached height on
      // purpose: `scrollHeight` here forces a synchronous reflow, and it would
      // do so on every scroll event.
      const atEnd = window.innerHeight + window.scrollY >= height - 2;
      if (atEnd && tops.length) current = tops[tops.length - 1];

      const next = current ? `#${current.id}` : "";
      if (next !== window.location.hash) {
        window.history.replaceState(
          null,
          "",
          next || window.location.pathname + window.location.search,
        );
      }

      const heading = current ? `${current.name} · ${suffix}` : base;
      if (document.title !== heading) document.title = heading;
    };

    /*
      Scroll fires far more often than the screen refreshes — many times per
      frame on a trackpad or a 120Hz display. Coalescing to one run per frame is
      what keeps this off the critical path; without it the handler is re-entered
      before its previous result could possibly have been seen.
    */
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(sync);
    };

    /*
      Layout is read here and nowhere else. Reveal animations and font swaps
      change the page height after mount, so re-measure when the document
      actually resizes rather than probing for it on every scroll.
    */
    const remeasure = () => {
      measure();
      onScroll();
    };

    measure();
    sync();

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", remeasure, { passive: true });
    const resized = new ResizeObserver(remeasure);
    resized.observe(document.body);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      resized.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", remeasure);
      document.title = base;
    };
  }, [sections, suffix]);

  return null;
}
