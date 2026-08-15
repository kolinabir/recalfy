import { Bar, CardSkeleton, HeaderSkeleton } from "@/components/dashboard/skeleton";

/** The two-column split: what is filling it, and the figures beside it. */
export default function Loading() {
  return (
    <div aria-hidden>
      <HeaderSkeleton lede />
      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_18rem]">
        <div>
          <Bar className="h-2.5 w-16" />
          <div className="mt-6 grid gap-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i}>
                <Bar className="h-3 w-28" />
                <Bar className="mt-2.5 h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>
        <div className="grid content-start gap-8">
          <CardSkeleton lines={3} />
          <CardSkeleton lines={2} />
        </div>
      </div>
    </div>
  );
}
