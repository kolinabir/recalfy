import { Bar, CardSkeleton, HeaderSkeleton } from "@/components/dashboard/skeleton";

/** A connection page: status, then whatever action that status offers. */
export default function Loading() {
  return (
    <div aria-hidden>
      <HeaderSkeleton lede />
      <section className="mt-8 rounded-xl border border-line bg-s1 px-6 py-6">
        <div className="flex items-center gap-3">
          <span className="size-1.5 rounded-full bg-fg-faint/25" />
          <Bar className="h-3 w-32" />
        </div>
        <Bar className="mt-5 h-10 w-40 rounded-xl" />
      </section>
      <div className="mt-4">
        <CardSkeleton lines={2} />
      </div>
    </div>
  );
}
