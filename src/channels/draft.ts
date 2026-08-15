/**
 * A reply the user can watch being written.
 *
 * The model produces tokens far faster than any chat network will accept
 * edits, so this coalesces: `show` is cheap and can be called on every token,
 * while at most one write is in flight and at most one is queued. Whatever the
 * latest text is when the gap elapses is what gets sent — intermediate states
 * are dropped rather than queued, because nobody wants to watch a backlog of
 * stale half-sentences drain after the answer is already known.
 *
 * Nothing here throws. A draft is a nicety; failing to paint one must never
 * cost the user the actual reply.
 */

/** Telegram animates draft changes, and anything faster than this is wasted. */
const MIN_GAP_MS = 900;

export class Draft {
  private pending: string | null = null;
  private sentAt = 0;
  private timer: NodeJS.Timeout | null = null;
  /** Serialises writes, so two edits can never land out of order. */
  private queue: Promise<void> = Promise.resolve();

  constructor(
    private readonly write: (text: string) => Promise<void>,
    private readonly minGapMs: number = MIN_GAP_MS,
  ) {}

  /** Replaces what the user is looking at. Returns immediately. */
  show(text: string): void {
    this.pending = text;
    if (this.timer) return;

    const wait = Math.max(0, this.minGapMs - (Date.now() - this.sentAt));
    this.timer = setTimeout(() => {
      this.timer = null;
      this.flush();
    }, wait);
    // Never hold the process open for a half-written sentence.
    this.timer.unref?.();
  }

  /**
   * Waits for writes already in flight and abandons anything still pending.
   *
   * Called just before the real message is sent: the draft is about to be
   * replaced by the finished reply, so painting one more frame of it would
   * only race the thing that supersedes it.
   */
  async settle(): Promise<void> {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.pending = null;
    await this.queue;
  }

  private flush(): void {
    const text = this.pending;
    if (text === null) return;

    this.pending = null;
    this.sentAt = Date.now();
    this.queue = this.queue.then(() => this.write(text)).catch(() => {});
  }
}
