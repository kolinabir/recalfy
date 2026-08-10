import { LoadingMark } from "@/components/wordmark";

/**
 * In-shell loading state for dashboard pages — the sidebar stays put, the
 * content column shows the mark tying itself while the page streams in.
 */
export default function Loading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <LoadingMark className="size-8" />
    </div>
  );
}
