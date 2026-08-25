import { Reveal } from "@/components/motion/reveal";
import { FEATURES } from "@/lib/features-data";

/**
 * The feature grid, with no heading of its own — the page it sits on supplies
 * that. It used to carry an eyebrow and a headline because it was one section
 * among eight on the home page; now it is the whole of /features.
 */
export function FeatureGrid() {
  return (
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
          <h3 className="mt-4 text-[0.9375rem] font-medium">{feature.title}</h3>
          <p className="mt-2 text-[0.8125rem] leading-relaxed text-fg-subtle">
            {feature.body}
          </p>
        </Reveal>
      ))}
    </div>
  );
}
