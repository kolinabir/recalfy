/**
 * The pause after someone locks their account down from the dashboard.
 *
 * Without it, a lock-down is a race: the person presses the button, and
 * whoever still has the phone in their hand re-links from the same chat before
 * the owner has finished reading the confirmation. A quarter of an hour is
 * long enough to lose that race and short enough not to be a support ticket.
 */
export const RELINK_LOCK_MS = 15 * 60 * 1000;

/** Whole minutes left on the lock; 0 once it has passed or was never set. */
export function minutesLocked(lockedUntil: Date | undefined, now: Date): number {
  if (!lockedUntil) return 0;

  const remaining = lockedUntil.getTime() - now.getTime();
  return remaining > 0 ? Math.ceil(remaining / 60_000) : 0;
}
