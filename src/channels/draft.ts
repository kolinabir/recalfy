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

/**
 * No preview until the reply is about two sentences long.
 *
 * A preview cannot be withdrawn: Telegram is meant to drop it when the real
 * message lands, and on some clients it lingers beside the answer for a few
 * seconds first. For a one-line reply that is the whole answer shown twice —
 * seen 8 Oct 2026 as "Alive and kicking! …" stacked on "Alive and kicking!".
 * A short reply arrives in a couple of seconds anyway; watching it being typed
 * buys nothing. A long one is where the preview earns its keep.
 */
const MIN_START_CHARS = 160;

export class Draft {
  private pending: string | null = null;
  private sentAt = 0;
  private timer: NodeJS.Timeout | null = null;
  /** Once a reply is long enough to preview, every later frame is painted. */
  private started = false;
  /** Serialises writes, so two edits can never land out of order. */
  private queue: Promise<void> = Promise.resolve();

  constructor(
    private readonly write: (text: string) => Promise<void>,
    private readonly minGapMs: number = MIN_GAP_MS,
    private readonly minStartChars: number = MIN_START_CHARS,
  ) {}

  /**
   * Replaces what the user is looking at. Returns immediately.
   *
   * Nothing is painted until the text reaches `minStartChars` — see
   * MIN_START_CHARS. Empty text is ignored rather than painted. Telegram draws it as a
   * "Thinking…" placeholder, and a draft cannot be deleted — there is no
   * draft_id on sendMessage and no method to clear one — so a placeholder
   * painted for a reply that turns out to be short just sits next to the
   * answer until it expires. Nothing is better than a stuck nothing.
   */
  show(text: string): void {
    if (text === '') return;
    if (!this.started && text.length < this.minStartChars) return;
    this.started = true;
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
