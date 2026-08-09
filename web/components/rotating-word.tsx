"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

/**
 * The thing being forgotten is the thing that rotates. Every entry is a real,
 * specific loss — a missed flight, a walnut allergy — not a category.
 */
const WORDS = [
  "Mum's flight lands at 6",
  "Sara's allergic to walnuts",
  "the warranty ends Friday",
  "where you parked at the airport",
  "the plumber quoted 40k",
  "why you walked into the room",
];

export function RotatingWord() {
  const [i, setI] = useState(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => setI((n) => (n + 1) % WORDS.length), 2600);
    return () => clearInterval(id);
  }, [reduced]);

  if (reduced) {
    return <span className="text-accent">{WORDS[0]}</span>;
  }

  return (
    <span className="relative inline-block align-top">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={WORDS[i]}
          initial={{ opacity: 0, y: "0.35em", filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: "-0.35em", filter: "blur(10px)" }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="inline-block whitespace-nowrap text-accent"
        >
          {WORDS[i]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
