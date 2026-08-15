import {
  Bar,
  CardSkeleton,
  RowsSkeleton,
} from "@/components/dashboard/skeleton";

/**
 * The overview, in outline: greeting, the recent list, and the column beside
 * it. The wordmark is not here — `Splash` in the layout already owns the one
 * moment that deserves it, arriving at the dashboard, and a second spinner one
 * boundary further in would only say the same thing twice.
 */
export default function Loading() {
  return (
    <div aria-hidden>
      <header>
        <Bar className="h-2.5 w-20" />
        <Bar className="mt-5 h-9 w-56 max-w-full" />
        <div className="mt-6 flex items-center gap-3">
          <span className="size-1.5 rounded-full bg-fg-faint/25" />
          <Bar className="h-2.5 w-44" />
        </div>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_18rem]">
        <section>
          <div className="flex items-center justify-between pb-4">
            <Bar className="h-2.5 w-16" />
            <Bar className="h-2.5 w-24" />
          </div>
          <RowsSkeleton rows={7} />
        </section>

        <aside className="grid content-start gap-8">
          <CardSkeleton lines={4} />
          <CardSkeleton lines={2} />
        </aside>
      </div>
    </div>
  );
}
