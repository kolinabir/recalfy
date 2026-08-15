/**
 * The shapes a dashboard page leaves behind while it loads.
 *
 * A spinner says "something is happening". A skeleton says *what* is
 * happening — the page you asked for, in the layout it will have, so the eye
 * has already found the row it was going to read by the time the words land.
 * The wordmark loader stays for the dashboard root, where there is no shape
 * to promise yet because you have only just arrived.
 *
 * Everything here is decoration for a state nobody interacts with, so the
 * whole thing is hidden from screen readers by the callers' `aria-hidden`.
 */

export function Bar({ className = "" }: { className?: string }) {
  return (
    <span
      className={`block animate-pulse rounded bg-fg-faint/15 ${className}`}
    />
  );
}

/** Eyebrow, display heading, and the sentence some pages put under it. */
export function HeaderSkeleton({ lede = false }: { lede?: boolean }) {
  return (
    <header>
      <Bar className="h-2.5 w-20" />
      <Bar className="mt-5 h-9 w-72 max-w-full" />
      {lede ? <Bar className="mt-5 h-3.5 w-96 max-w-full" /> : null}
    </header>
  );
}

/** A bordered list, matching MemoryListShell and the reminder list. */
export function RowsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="flex items-center gap-4 px-5 py-4">
          <span className="size-1.5 shrink-0 rounded-full bg-fg-faint/25" />
          {/* Varied widths: rows of identical length read as a table, and the
              page underneath is a list of sentences. */}
          <Bar className={`h-3.5 ${["w-2/3", "w-1/2", "w-5/6", "w-3/5"][i % 4]}`} />
          <Bar className="ml-auto hidden h-2.5 w-12 shrink-0 sm:block" />
        </li>
      ))}
    </ul>
  );
}

/** One bordered panel — the unit settings, billing and the channels use. */
export function CardSkeleton({ lines = 2 }: { lines?: number }) {
  return (
    <section className="rounded-xl border border-line px-6 py-6">
      <Bar className="h-2.5 w-24" />
      {Array.from({ length: lines }, (_, i) => (
        <Bar key={i} className={`mt-4 h-3 ${i === lines - 1 ? "w-1/2" : "w-full"}`} />
      ))}
    </section>
  );
}
