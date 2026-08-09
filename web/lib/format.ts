/** Date formatting shared by server and client dashboard components. */

/** "just now" · "2h ago" · "yesterday" · "Mar 3" · "Mar 3, 2025" */
export function relativeDate(iso: string, now = new Date()): string {
  const then = new Date(iso);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 172_800) return "yesterday";

  const sameYear = then.getFullYear() === now.getFullYear();
  return then.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

/**
 * A reminder's due time, rendered in the timezone the bot resolved it in —
 * the browser's zone may be a different place entirely.
 */
export function dueLabel(iso: string, tz?: string, now = new Date()): string {
  const due = new Date(iso);
  const zone = tz ? { timeZone: tz } : {};

  const dayOf = (d: Date) =>
    d.toLocaleDateString("en-CA", { ...zone }); // yyyy-mm-dd for equality

  const time = due.toLocaleTimeString("en-US", {
    ...zone,
    hour: "numeric",
    minute: "2-digit",
  });

  if (dayOf(due) === dayOf(now)) return `Today, ${time}`;

  const tomorrow = new Date(now.getTime() + 86_400_000);
  if (dayOf(due) === dayOf(tomorrow)) return `Tomorrow, ${time}`;

  const date = due.toLocaleDateString("en-US", {
    ...zone,
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(due.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
  });
  return `${date}, ${time}`;
}

/** "every day" · "every 2 weeks" */
export function repeatLabel(repeat: {
  unit: "day" | "week" | "month" | "year";
  interval: number;
}): string {
  return repeat.interval === 1
    ? `every ${repeat.unit}`
    : `every ${repeat.interval} ${repeat.unit}s`;
}
