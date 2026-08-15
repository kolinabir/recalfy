import { Bar, CardSkeleton, HeaderSkeleton } from "@/components/dashboard/skeleton";

/** The plan panel is the page; everything under it is secondary. */
export default function Loading() {
  return (
    <div aria-hidden>
      <HeaderSkeleton />
      <section className="mt-8 rounded-xl border border-line bg-s1 p-7 sm:p-8">
        <Bar className="h-2.5 w-20" />
        <Bar className="mt-5 h-7 w-56 max-w-full" />
        <div className="mt-7 grid gap-2 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Bar key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      </section>
      <div className="mt-4">
        <CardSkeleton lines={2} />
      </div>
    </div>
  );
}
