/**
 * Phrases that assert something was actually done to the user's data, rather
 * than merely answered. Deliberately narrow: a false positive costs one extra
 * model call, a false negative costs the user their data.
 */
const CLAIMS = [
  /\b(?:i(?:'ve| have)?\s+)?(?:remembered|stored|saved|noted|jotted)\b/i,
  /\b(?:i(?:'ve| have)?\s+)?(?:updated|changed|corrected|replaced)\b/i,
  /\b(?:i(?:'ve| have)?\s+)?(?:forgotten|forgot|deleted|removed|dropped|erased|wiped)\b/i,
  /\bi(?:'ll| will|'ve| have)?\s*(?:set (?:a|the) reminder|remind you)\b/i,
  /\breminder (?:is )?(?:set|scheduled|created)\b/i,
  /\b(?:i(?:'ve| have)?\s+)?(?:logged|tracked|recorded)\b/i,
  /\b(?:added|put) (?:it|that|this)?\s*(?:on|to) (?:your|the) (?:shopping\s+)?list\b/i,
  /\bmarked (?:it|that|this)?\s*(?:as\s+)?bought\b/i,
  // "still got it" and "already got it" are statements about what memory
  // holds, not claims of having just changed it. Without the lookbehinds,
  // answering "yep, still got it" is challenged as an unbacked claim — and
  // the model satisfies the challenge by storing the fact a second time,
  // which is how a true answer turns into a duplicate row.
  /(?<!\bstill\s)(?<!\balready\s)\b(?:got it|done|all set|consider it done)\b/i,
];

/**
 * True when a reply tells the user something was done.
 *
 * Used only on turns where the model called no tool: claiming "done" without
 * acting is the one failure that silently destroys the product's promise, so
 * it is caught deterministically rather than trusted to the prompt.
 */
export function claimsAction(reply: string): boolean {
  return CLAIMS.some((pattern) => pattern.test(reply));
}

/** Fed back to the model as a system turn when it claims without acting. */
export const NO_ACTION_TAKEN =
  'You just told the user something was done, but you called no tool, so nothing ' +
  'changed. Either call the correct tool now (remember / forget / remind / ' +
  'set_timezone / cancel_reminder / track / update_entry), or reply again ' +
  'without claiming anything happened.';
