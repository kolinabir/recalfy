import { MemoryDoc } from '../mongo/collections';
import { Fact } from './memory.types';

export interface Deduplicated {
  fresh: Fact[];
  duplicates: Fact[];
}

/**
 * Drops facts already in memory.
 *
 * The model sees the whole memory and is told not to repeat itself, but the
 * conversation window means an older message can prompt it to store the same
 * thing twice. This is the guard that makes that harmless. A fact that
 * supersedes something is always kept — replacing a fact is the point.
 */
export function removeDuplicates(facts: Fact[], existing: MemoryDoc[]): Deduplicated {
  // A superseded fact is stale, so it must not block storing that text again.
  const seen = new Set(
    existing.filter((memory) => !memory.supersededBy).map((memory) => normalise(memory.text)),
  );
  const fresh: Fact[] = [];
  const duplicates: Fact[] = [];

  for (const fact of facts) {
    const key = normalise(fact.text);
    if (fact.supersedes?.length || !seen.has(key)) {
      seen.add(key);
      fresh.push(fact);
    } else {
      duplicates.push(fact);
    }
  }

  return { fresh, duplicates };
}

/** Case, spacing and trailing punctuation shouldn't make a fact look new. */
function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.!?,;:]+$/, '')
    .trim();
}
