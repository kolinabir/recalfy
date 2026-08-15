import {
  Bar,
  HeaderSkeleton,
  RowsSkeleton,
} from "@/components/dashboard/skeleton";

/** Header, search box, group chips, then the list itself. */
export default function Loading() {
  return (
    <div aria-hidden>
      <HeaderSkeleton lede />
      <Bar className="mt-8 h-12 w-full rounded-xl" />
      <div className="mt-4 flex gap-2">
        <Bar className="h-7 w-20 rounded-lg" />
        <Bar className="h-7 w-24 rounded-lg" />
        <Bar className="h-7 w-16 rounded-lg" />
      </div>
      <div className="mt-6">
        <RowsSkeleton rows={7} />
      </div>
    </div>
  );
}
