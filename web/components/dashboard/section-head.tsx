import Link from "next/link";

/** The small heading-plus-link pair every dashboard block uses. */
export function SectionHead({
  title,
  action,
}: {
  title: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="mb-3 flex items-baseline justify-between">
      <h2 className="eyebrow">{title}</h2>
      {action ? (
        <Link
          href={action.href}
          className="font-mono text-[0.6875rem] text-fg-subtle underline-offset-4 transition-colors hover:text-fg hover:underline"
        >
          {action.label} →
        </Link>
      ) : null}
    </div>
  );
}
