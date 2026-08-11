import { Reveal } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

const CHANNELS = [
  { name: "Telegram", note: "Live", live: true },
  { name: "WhatsApp", note: "Live", live: true },
  { name: "Slack", note: "Building", live: false },
  { name: "Discord", note: "Queued", live: false },
  { name: "iMessage", note: "Queued", live: false },
  { name: "Signal", note: "Queued", live: false },
];

export function Channels() {
  return (
    <section id="channels" className="scroll-mt-24 pb-24 lg:pb-32">
      <div className="shell grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        <Reveal as="header">
          <p className="eyebrow">Where it lives</p>
          <h2 className="display display-fill mt-5 text-[clamp(2rem,4.2vw,3rem)]">
            The memory outlives{" "}
            <span className="block text-fg-muted">the app you started in.</span>
          </h2>
          <p className="mt-6 max-w-sm leading-relaxed text-fg-muted">
            Your facts don&apos;t belong to a chat app. Add a second channel and
            the same memory, reminders and history are already waiting there —
            nothing to migrate, nothing to repeat.
          </p>
        </Reveal>

        <ul className="grid gap-2 sm:grid-cols-2">
          {CHANNELS.map((channel, i) => (
            <Reveal
              key={channel.name}
              as="li"
              delay={i * 0.05}
              className={cn(
                "group flex items-center justify-between gap-4 rounded-lg border px-5 py-4 transition-all duration-500",
                channel.live
                  ? "border-line bg-s1 hover:-translate-y-0.5 hover:border-accent/40"
                  : "border-line hover:-translate-y-0.5 hover:border-line",
              )}
            >
              <span
                className={cn(
                  "text-[0.9375rem]",
                  channel.live ? "font-medium text-fg" : "text-fg-muted",
                )}
              >
                {channel.name}
              </span>
              <span className="flex items-center gap-2 font-mono text-[0.6875rem] tracking-wide text-fg-subtle">
                <span
                  aria-hidden
                  className={cn(
                    "size-1.5 rounded-full",
                    channel.live
                      ? "bg-accent shadow-[0_0_8px_var(--accent)]"
                      : "bg-fg-faint/40",
                  )}
                />
                {channel.note}
              </span>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
