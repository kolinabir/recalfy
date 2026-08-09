import {
  ArrowLeftRight,
  BellRing,
  Clock,
  Download,
  EyeOff,
  Globe,
  Layers,
  Trash2,
} from "lucide-react";

import { Reveal } from "@/components/motion/reveal";

const FEATURES = [
  {
    icon: Layers,
    title: "Atomic facts",
    body: "Every statement stored on its own, so one can be changed without touching the rest.",
  },
  {
    icon: ArrowLeftRight,
    title: "Supersession",
    body: "A correction retires the old fact instead of stacking on top of it.",
  },
  {
    icon: BellRing,
    title: "Unprompted reminders",
    body: "It messages you first, at the time you mentioned once, weeks ago.",
  },
  {
    icon: Clock,
    title: "Timezone-aware",
    body: "It infers where you are and resolves “at 5” into a real, confirmed moment.",
  },
  {
    icon: Trash2,
    title: "Forget on request",
    body: "“Forget everything about the old flat” removes exactly those records — and tells you what went.",
  },
  {
    icon: Download,
    title: "Plain-markdown export",
    body: "The same document the model reads, downloadable any day you like.",
  },
  {
    icon: EyeOff,
    title: "Never trained on",
    body: "No training, no sharing, no analytics on the contents of your memory.",
  },
  {
    icon: Globe,
    title: "Channel-portable",
    body: "Add a second chat app and the whole memory is already there.",
  },
];

export function Features() {
  return (
    <section className="rails pb-24 lg:pb-32">
      <div className="shell">
        <Reveal as="header" className="max-w-2xl pb-12">
          <p className="eyebrow">Everything in it</p>
          <h2 className="display display-fill mt-5 text-[clamp(2rem,4.2vw,3rem)]">
            Small product.
            <span className="block text-fg-muted">Very few loose ends.</span>
          </h2>
        </Reveal>

        <div className="grid border-t border-l border-line sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature, i) => (
            <Reveal
              key={feature.title}
              delay={(i % 4) * 0.05}
              className="group border-r border-b border-line p-6 transition-colors duration-500 hover:bg-s1"
            >
              <feature.icon
                className="size-4 text-fg-faint transition-colors duration-500 group-hover:text-accent"
                strokeWidth={1.75}
              />
              <h3 className="mt-4 text-[0.9375rem] font-medium">
                {feature.title}
              </h3>
              <p className="mt-2 text-[0.8125rem] leading-relaxed text-fg-subtle">
                {feature.body}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
