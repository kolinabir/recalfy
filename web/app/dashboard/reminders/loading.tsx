import { HeaderSkeleton, RowsSkeleton } from "@/components/dashboard/skeleton";

export default function Loading() {
  return (
    <div aria-hidden>
      <HeaderSkeleton lede />
      <div className="mt-8">
        <RowsSkeleton rows={4} />
      </div>
    </div>
  );
}
