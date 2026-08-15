import { CardSkeleton, HeaderSkeleton } from "@/components/dashboard/skeleton";

/** Account, then the preference panels, in the order the page has them. */
export default function Loading() {
  return (
    <div aria-hidden>
      <HeaderSkeleton />
      <div className="mt-8 grid gap-4">
        <CardSkeleton lines={3} />
        <CardSkeleton lines={2} />
        <CardSkeleton lines={2} />
        <CardSkeleton lines={2} />
        <CardSkeleton lines={2} />
      </div>
    </div>
  );
}
