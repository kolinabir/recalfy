import { LoadingMark } from "@/components/wordmark";

/**
 * Arriving at the dashboard. The sidebar stays put and the content column
 * shows the mark tying itself while the overview streams in.
 *
 * This is the only page that gets the mark. Every other route has its own
 * `loading.tsx` with a skeleton of the shape it is about to be — once you are
 * inside, you asked for a specific page, and a spinner in place of it throws
 * away the one thing we already know: what it will look like.
 */
export default function Loading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <LoadingMark className="size-8" />
    </div>
  );
}
