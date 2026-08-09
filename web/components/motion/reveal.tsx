"use client";

import { motion, useReducedMotion } from "motion/react";

import { useEnter } from "@/components/motion/use-enter";

/**
 * The single scroll-entry move used across the site: content resolves out of a
 * short blur and lift. One move, reused everywhere, so the page reads as one
 * system rather than a demo reel of different effects.
 */
export const EASE = [0.16, 1, 0.3, 1] as const;

export function Reveal({
  children,
  delay = 0,
  className,
  as = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li" | "article" | "header" | "p";
}) {
  const reduced = useReducedMotion();
  const { ref, entered } = useEnter();
  const Comp = motion[as];

  if (reduced) {
    return <Comp className={className}>{children}</Comp>;
  }

  return (
    <Comp
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={ref as any}
      className={className}
      initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
      animate={
        entered
          ? { opacity: 1, y: 0, filter: "blur(0px)" }
          : { opacity: 0, y: 18, filter: "blur(8px)" }
      }
      transition={{ duration: 0.7, ease: EASE, delay }}
    >
      {children}
    </Comp>
  );
}
