import { Memory } from './memory.types';

/**
 * Picks the facts that answer a few typed words.
 *
 * Deliberately dumb string matching, and deliberately not the model. This runs
 * on every keystroke of an inline query, where the whole point is that the list
 * appears as fast as the keyboard — a model call would cost seconds and money
 * per letter typed. It also means an inline lookup never sends the memory
 * anywhere: the matching happens in this process, over rows already fetched.
 *
 * Every term must match (AND, not OR). Someone typing two words is narrowing,
 * and a list that grows as you type reads as broken.
 */

/** Telegram accepts 50; well short of it keeps the payload small and the list readable. */
export const MAX_RESULTS = 20;

export function searchMemories(
  memories: Memory[],
  query: string,
  limit: number = MAX_RESULTS,
): Memory[] {
  const terms = tokenise(query);

  // An empty query is someone who has just typed the bot's name and is waiting
  // to see what happens. The most recent facts are the best guess, and showing
  // something beats an empty panel that looks broken.
  if (terms.length === 0) return recentFirst(memories).slice(0, limit);

  const scored = memories
    .map((memory) => ({ memory, score: scoreOf(memory, terms) }))
    .filter((hit) => hit.score > 0);

  scored.sort(
    (a, b) => b.score - a.score || b.memory.createdAt.getTime() - a.memory.createdAt.getTime(),
  );

  return scored.slice(0, limit).map((hit) => hit.memory);
}

/**
 * Zero means "not a match" — every term has to appear somewhere. Above that,
 * a term landing at the start of a word beats one buried mid-word, so typing
 * "rent" puts "Rent is due on the 3rd" above "Parent's address".
 */
function scoreOf(memory: Memory, terms: string[]): number {
  const haystack = `${memory.text} ${memory.group}`.toLowerCase();
  let score = 0;

  for (const term of terms) {
    const at = haystack.indexOf(term);
    if (at === -1) return 0;
    score += at === 0 || !/\w/.test(haystack[at - 1]) ? 2 : 1;
  }

  return score;
}

function tokenise(query: string): string[] {
  return query.toLowerCase().split(/\s+/).filter(Boolean);
}

function recentFirst(memories: Memory[]): Memory[] {
  return [...memories].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}
