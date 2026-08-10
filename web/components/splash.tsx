import { LoadingMark } from "@/components/wordmark";

/**
 * Full-viewport brand splash — the gate between signing in and the dashboard.
 * Fades in after a beat so a fast auth check never flashes it; anyone who sees
 * it at all sees the mark already mid-spin.
 */
export function Splash() {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg opacity-0 animate-[splash-in_0.4s_ease-out_0.12s_forwards]"
      role="status"
      aria-label="Loading your dashboard"
    >
      <div className="flex flex-col items-center gap-5">
        <LoadingMark className="size-10" />
        <p className="font-mono text-[0.6875rem] tracking-wide text-fg-faint">
          opening your memory
        </p>
      </div>
    </div>
  );
}
