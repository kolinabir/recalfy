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

/** Enough for "tell me about Rahim" to come back whole; few enough to stay cheap. */
export const MAX_MODEL_RESULTS = 15;

/** Words that match everything and mean nothing to a lookup. */
const STOPWORDS = new Set([
  'a', 'an', 'the', 'my', 'me', 'i', 'is', 'are', 'was', 'of', 'to', 'in', 'on', 'at', 'for',
  'and', 'or', 'what', 'whats', "what's", 'who', 'when', 'where', 'which', 'do', 'does', 'did',
  'about', 'with', 'his', 'her', 'their', 'our', 'your',
]);

/**
 * The model's version of `searchMemories`: OR rather than AND, and ranked by
 * how many of the words landed.
 *
 * The model searches for things it cannot see, so it guesses at wording —
 * "landlord phone" for "Rahim's number is…" and "Rahim is the landlord".
 * Requiring every word would return neither; counting words returns both,
 * with anything matching all of them on top.
 */
export function rankMatches(
  memories: Memory[],
  query: string,
  limit: number = MAX_MODEL_RESULTS,
): Memory[] {
  const terms = tokenise(query)
    .map((term) => term.replace(/[^\p{L}\p{N}'’-]/gu, ''))
    .filter((term) => term.length > 1 && !STOPWORDS.has(term))
    // "keys" should still find "the spare key"; the shorter form is a
    // substring of both, and the longer one of neither.
    .map((term) => (term.length > 3 && term.endsWith('s') ? term.slice(0, -1) : term));
  if (terms.length === 0) return [];

  return memories
    .map((memory) => ({ memory, ...matchOf(memory, terms) }))
    .filter((hit) => hit.matched > 0)
    .sort(
      (a, b) =>
        b.matched - a.matched ||
        b.score - a.score ||
        b.memory.createdAt.getTime() - a.memory.createdAt.getTime(),
    )
    .slice(0, limit)
    .map((hit) => hit.memory);
}

function matchOf(memory: Memory, terms: string[]): { matched: number; score: number } {
  const haystack = `${memory.text} ${memory.group}`.toLowerCase();
  let matched = 0;
  let score = 0;
  for (const term of terms) {
    const at = haystack.indexOf(term);
    if (at === -1) continue;
    matched++;
    score += at === 0 || !/\w/.test(haystack[at - 1]) ? 2 : 1;
  }
  return { matched, score };
}
