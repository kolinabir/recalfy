/**
 * Waits a moment before answering, then answers once.
 *
 * Two jobs, and they are the same job: messages arriving close together are
 * *collected* into one turn, and turns for one conversation are *serialised*
 * so a second never starts while the first is still thinking.
 *
 * Both exist because of the same bug. A turn reads the memory document, calls
 * the model, and writes back — so two turns running at once each build their
 * prompt from a memory that is missing the other's writes. Sending "Interview
 * tomorrow" and forwarding a note about it a second later produced two replies
 * and two identical 8am reminders, neither turn able to see that the other had
 * already scheduled one.
 */

/** How long to wait for the next message before treating the batch as final. */
export const TURN_WINDOW_MS = 2_000;

/**
 * A paste-bomb should not defer the reply indefinitely. At this many messages
 * the batch closes on the spot rather than waiting out another window.
 */
export const MAX_TURN_MESSAGES = 10;

interface Batch<T> {
  items: T[];
  timer: NodeJS.Timeout;
}

export class TurnQueue<T> {
  /** Filling up, not yet running. One per conversation key. */
  private readonly collecting = new Map<string, Batch<T>>();
  /** Running or queued behind something running. Deleted once settled. */
  private readonly chains = new Map<string, Promise<void>>();

  constructor(
    private readonly run: (items: T[]) => Promise<void>,
    private readonly onError: (error: unknown) => void,
    private readonly windowMs: number = TURN_WINDOW_MS,
    private readonly maxItems: number = MAX_TURN_MESSAGES,
  ) {}

  /**
   * Returns immediately — the work happens later, on the timer. Callers are
   * adapters answering a webhook, and none of them should be held open for the
   * seconds a model call takes.
   */
  add(key: string, item: T): void {
    const batch = this.collecting.get(key);

    if (!batch) {
      this.collecting.set(key, { items: [item], timer: this.arm(key) });
      return;
    }

    batch.items.push(item);
    clearTimeout(batch.timer);

    if (batch.items.length >= this.maxItems) {
      this.close(key);
      return;
    }
    batch.timer = this.arm(key);
  }

  /** True while anything for this key is collecting or still running. */
  busy(key: string): boolean {
    return this.collecting.has(key) || this.chains.has(key);
  }

  private arm(key: string): NodeJS.Timeout {
    const timer = setTimeout(() => this.close(key), this.windowMs);
    // Never a reason to hold the process open; a batch mid-window at shutdown
    // is one the user will resend.
    timer.unref?.();
    return timer;
  }

  /**
   * Hands the batch to the chain for this key.
   *
   * `chains` is what serialises: the new turn is appended to whatever is
   * already running rather than started beside it. Errors are reported and
   * swallowed, because a turn that throws must not poison the turns behind it.
   */
  private close(key: string): void {
    const batch = this.collecting.get(key);
    if (!batch) return;

    clearTimeout(batch.timer);
    this.collecting.delete(key);

    const previous = this.chains.get(key) ?? Promise.resolve();
    const next = previous.then(() => this.run(batch.items).catch(this.onError));
    this.chains.set(key, next);

    // Only the newest chain owns the slot: an older one settling must not
    // delete a link that a later message has already queued behind it.
    void next.finally(() => {
      if (this.chains.get(key) === next) this.chains.delete(key);
    });
  }
}
