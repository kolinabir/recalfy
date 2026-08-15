/**
 * "Say this at most once per window, per key."
 *
 * The answer to a stranger who keeps typing, and to an account whose plan has
 * lapsed: both need to be told why nothing is happening, and neither needs to
 * be told twice in a row. Without it, the honest thing to do — explain — turns
 * into the bot arguing with someone one line at a time.
 *
 * In memory on purpose. A restart re-arms every key, which errs toward one
 * extra explanation; the alternative is a collection whose only job is
 * remembering that we already apologised.
 */
export class Cooldown {
  private readonly openAgainAt = new Map<string, number>();

  constructor(private readonly windowMs: number) {}

  /** True the first time for a key, then once per window. Claims as it answers. */
  allow(key: string, now = Date.now()): boolean {
    const closedUntil = this.openAgainAt.get(key);
    if (closedUntil !== undefined && closedUntil > now) return false;

    this.openAgainAt.set(key, now + this.windowMs);
    return true;
  }
}
