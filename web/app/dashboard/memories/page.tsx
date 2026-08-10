import type { Metadata } from "next";
import Link from "next/link";

import { MemoryExplorer } from "@/components/dashboard/memory-explorer";
import { getMemories, isConnected, requireViewer } from "@/lib/dashboard-data";

export const metadata: Metadata = {
  title: "Memories",
  description: "Everything Recalfy remembers for you.",
};

export default async function MemoriesPage() {
  const viewer = await requireViewer();

  if (!isConnected(viewer)) {
    return (
      <div>
        <PageHead count={0} />
        <p className="mt-8 rounded-xl border border-line px-6 py-10 text-center text-[0.9375rem] text-fg-subtle">
          Nothing here yet —{" "}
          <Link
            href="/dashboard"
            className="text-fg underline underline-offset-4"
          >
            connect Telegram
          </Link>{" "}
          first.
        </p>
      </div>
    );
  }

  const memories = await getMemories(viewer.id);

  return (
    <div>
      <PageHead count={memories.length} />
      <div className="mt-8">
        {memories.length === 0 ? (
          <p className="rounded-xl border border-line px-6 py-10 text-center text-[0.9375rem] text-fg-subtle">
            Forward anything to the bot and it appears here in seconds.
          </p>
        ) : (
          <MemoryExplorer memories={memories} />
        )}
      </div>
    </div>
  );
}

function PageHead({ count }: { count: number }) {
  return (
    <header>
      <p className="eyebrow">Memories</p>
      <h1 className="display display-fill mt-4 text-[clamp(1.75rem,3.4vw,2.5rem)]">
        Everything it knows.
      </h1>
      <p className="mt-4 max-w-prose leading-relaxed text-fg-muted">
        {count > 0 ? (
          <>
            {count} {count === 1 ? "fact" : "facts"}, each its own row.
            Corrections replace instead of piling up, so what you see is what
            the bot would recite.
          </>
        ) : (
          <>One fact, one row — corrections replace instead of piling up.</>
        )}
      </p>
    </header>
  );
}
