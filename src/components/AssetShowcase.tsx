import { useState } from "react";

type KindId = "ecommerce" | "mobile_app" | "saas";

const KINDS: { id: KindId; label: string; source: string; headline: string; slots: string[] }[] = [
  {
    id: "ecommerce",
    label: "E-commerce products",
    source: "store.com/products/ceramic-mug",
    headline: "Your morning, upgraded",
    slots: ["Lifestyle shot", "Detail close-up", "Hand-held demo", "Price callout"],
  },
  {
    id: "mobile_app",
    label: "Mobile apps",
    source: "apps.apple.com/app/your-app",
    headline: "Track it in two taps",
    slots: ["iPhone mockup", "Feature panel", "Onboarding frame", "Store badge"],
  },
  {
    id: "saas",
    label: "SaaS & websites",
    source: "yourapp.com/pricing",
    headline: "Ship faster, guess less",
    slots: ["Browser mockup", "Dashboard crop", "Metric card", "Trial CTA"],
  },
];

const RATIOS = [
  { label: "9:16", aspect: "aspect-[9/16]" },
  { label: "1:1", aspect: "aspect-square" },
  { label: "16:9", aspect: "aspect-[16/9]" },
  { label: "1:1", aspect: "aspect-square" },
  { label: "9:16", aspect: "aspect-[9/16]" },
  { label: "16:9", aspect: "aspect-[16/9]" },
];

export function AssetShowcase() {
  const [active, setActive] = useState<KindId>("ecommerce");
  const kind = KINDS.find((k) => k.id === active)!;

  return (
    <div className="relative">
      <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-gradient-brand opacity-25 blur-3xl" />

      <div
        role="tablist"
        aria-label="Asset type"
        className="flex flex-wrap gap-2"
        data-testid="showcase-tabs"
      >
        {KINDS.map((k) => (
          <button
            key={k.id}
            role="tab"
            aria-selected={active === k.id}
            data-testid={`showcase-tab-${k.id}`}
            onClick={() => setActive(k.id)}
            className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors ${
              active === k.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground"
            }`}
          >
            {k.label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-dashed border-border bg-card p-4">
          <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
            Before — raw URL
          </p>
          <p className="mt-2 break-all font-mono text-xs tabular-nums text-muted-foreground">
            {kind.source}
          </p>
        </div>
        <div className="rounded-2xl border border-primary/40 bg-primary/5 p-4">
          <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-primary">
            After — ad kit
          </p>
          <p className="mt-2 font-display text-lg leading-tight">{kind.headline}</p>
          <p className="mt-1 font-mono text-xs tabular-nums text-muted-foreground">
            3 ratios · 1 video · UTM link
          </p>
        </div>
      </div>

      <div className="mt-3 columns-2 gap-3 [column-fill:_balance] sm:columns-3">
        {RATIOS.map((r, i) => (
          <div
            key={`${r.label}-${i}`}
            className={`mb-3 break-inside-avoid overflow-hidden rounded-xl border border-border bg-surface transition-transform duration-300 hover:-translate-y-1 ${r.aspect}`}
            style={{ transitionDelay: `${i * 20}ms` }}
          >
            <div className="flex h-full flex-col justify-between p-3">
              <span className="font-mono text-[0.6rem] tabular-nums text-muted-foreground">
                {r.label}
              </span>
              <span className="text-xs font-medium leading-tight">
                {kind.slots[i % kind.slots.length]}
              </span>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-1 text-[0.65rem] text-muted-foreground">
        Illustrative layout preview — your kit renders from your own URL.
      </p>
    </div>
  );
}
