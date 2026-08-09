/** Who a Telegram update claims to be from. */
export interface Sender {
  id?: number;
  username?: string;
}

/**
 * Who may talk to the bot. Accepts numeric ids and `@username`s.
 *
 * Prefer numeric ids: they are permanent, whereas a username can be released
 * and claimed by someone else, who would then inherit the access. Usernames
 * are here because an id can't be looked up until its owner has messaged the
 * bot — swap them for ids once `npm run whoami` reveals them.
 */
export class Allowlist {
  private readonly ids: ReadonlySet<number>;
  private readonly usernames: ReadonlySet<string>;

  constructor(entries: string[]) {
    const ids = new Set<number>();
    const usernames = new Set<string>();

    for (const entry of entries) {
      const trimmed = entry.trim();
      if (trimmed === '') continue;

      if (isNumericId(trimmed)) ids.add(Number(trimmed));
      else usernames.add(normaliseUsername(trimmed));
    }

    if (ids.size + usernames.size === 0) {
      throw new Error(
        'TELEGRAM_ALLOWED_USERS is empty. The webhook is public — refusing to start with an open bot.',
      );
    }

    this.ids = ids;
    this.usernames = usernames;
  }

  admits({ id, username }: Sender): boolean {
    if (id !== undefined && this.ids.has(id)) return true;
    return username !== undefined && this.usernames.has(normaliseUsername(username));
  }

  get size(): number {
    return this.ids.size + this.usernames.size;
  }

  /** True while any entry is still a username rather than a permanent id. */
  get hasUnresolvedUsernames(): boolean {
    return this.usernames.size > 0;
  }
}

function isNumericId(entry: string): boolean {
  return /^-?\d+$/.test(entry);
}

function normaliseUsername(entry: string): string {
  return entry.replace(/^@/, '').toLowerCase();
}
