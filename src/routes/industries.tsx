import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Search, Sparkles, Video, X } from "lucide-react";
import { PublicNav } from "@/components/PublicNav";
import { PublicFooter } from "@/components/PublicFooter";
import {
  INDUSTRIES,
  INDUSTRY_CATEGORIES,
  type Industry,
  type IndustryCategory,
} from "@/lib/industries";
import { Sheet, SheetContent } from "@/components/ui/sheet";

export const Route = createFileRoute("/industries")({
  head: () => ({
    meta: [
      { title: "Industries — AI Ad & Video Campaigns | Echo Your Influence" },
      {
        name: "description",
        content:
          "Real estate, SaaS, e-commerce, local services, restaurants, and professional services: paste any URL and get multi-ratio ad cards plus 15–30s vertical video shorts.",
      },
      { property: "og:title", content: "AI Campaign Engine for Every Industry" },
      {
        property: "og:description",
        content:
          "Fluid 1:1, 9:16, and 16:9 ad cards plus AI video shorts, tailored to your niche from a single URL.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/industries" },
    ],
    links: [{ rel: "canonical", href: "/industries" }],
  }),
  component: IndustriesPage,
});

function IndustriesPage() {
  const [category, setCategory] = useState<IndustryCategory>("All");
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<Industry | null>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return INDUSTRIES.filter((ind) => {
      if (category !== "All" && ind.category !== category) return false;
      if (!q) return true;
      return [ind.name, ind.headline, ind.description, ind.category, ind.hookAngle]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [category, query]);

  return (
    <div className="min-h-screen bg-background bg-grain">
      <PublicNav />

      <section className="mx-auto max-w-6xl px-6 pt-10 pb-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Vertical solution matrix
        </div>
        <h1 className="mt-6 max-w-3xl text-balance font-display text-5xl font-semibold leading-[0.95] tracking-tight md:text-6xl">
          AI campaign engine for every industry.
        </h1>
        <p className="mt-5 max-w-2xl text-balance text-lg text-muted-foreground">
          Paste any URL. Echo Your Influence generates multi-ratio fluid ad cards and vertical video
          shorts tailored to your specific niche.
        </p>

        {/* Search + filters */}
        <div className="mt-9 flex flex-col gap-4">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              data-testid="industry-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search industries, e.g. solar, brokerage, menu…"
              aria-label="Search industries"
              className="w-full rounded-full border border-border bg-card py-3 pl-11 pr-4 text-sm outline-none transition-colors focus:border-primary"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {INDUSTRY_CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                data-testid={`industry-filter-${c.toLowerCase().replace(/[^a-z]+/g, "-")}`}
                onClick={() => setCategory(c)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  category === c
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground/70 hover:text-foreground"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {results.map((ind) => (
            <article
              key={ind.slug}
              data-testid={`industry-card-${ind.slug}`}
              className={`group flex flex-col rounded-3xl border bg-card p-7 shadow-pop transition-transform hover:-translate-y-1 ${
                ind.featured ? "border-primary/60 ring-1 ring-primary/20" : "border-border"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <ind.icon className="h-5 w-5" />
                </div>
                <span className="rounded-full border border-border bg-surface px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {ind.category}
                </span>
              </div>

              {ind.featured && ind.featuredBadge && (
                <p className="mt-5 inline-flex w-fit rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground">
                  {ind.featuredBadge}
                </p>
              )}

              <h2 className="mt-4 font-display text-2xl leading-tight">{ind.name}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {ind.headline}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-foreground/70">{ind.description}</p>

              <div className="mt-5 flex flex-wrap gap-2">
                {ind.outputs.map((o) => (
                  <span
                    key={o.label}
                    className="rounded-full border border-border/70 bg-surface px-2.5 py-1 font-mono text-[11px] tabular-nums text-muted-foreground"
                  >
                    {o.ratio === "video" ? "video" : o.ratio}
                  </span>
                ))}
              </div>

              <button
                type="button"
                data-testid={`industry-explore-${ind.slug}`}
                onClick={() => setActive(ind)}
                className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90"
              >
                Explore {ind.category} kits <ArrowRight className="h-4 w-4" />
              </button>
            </article>
          ))}
        </div>

        {results.length === 0 && (
          <p className="py-16 text-center text-muted-foreground">
            No industries match “{query}”. Every vertical still works — paste any URL and Echo
            adapts the hook.
          </p>
        )}

        {/* Real estate spotlight */}
        <div className="mt-14 flex flex-col items-start justify-between gap-6 rounded-3xl border border-border bg-surface p-8 md:flex-row md:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              Real estate spotlight
            </p>
            <p className="mt-2 font-display text-3xl">
              Marketing a real estate office? Unlock Agency team access.
            </p>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              30 video shorts and 500 fluid ad images a month — enough to keep every agent&rsquo;s
              listings posting across feed, stories, and landscape.
            </p>
          </div>
          <Link
            to="/pricing"
            data-testid="industries-agency-cta"
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-pop transition-opacity hover:opacity-90"
          >
            Unlock Agency team access <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <IndustryDrawer industry={active} onClose={() => setActive(null)} />
      <PublicFooter />
    </div>
  );
}

function IndustryDrawer({
  industry,
  onClose,
}: {
  industry: Industry | null;
  onClose: () => void;
}) {
  return (
    <Sheet open={!!industry} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto border-border bg-background sm:max-w-xl"
      >
        {industry && (
          <div className="pb-10">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <industry.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {industry.category}
                  </p>
                  <h2 className="font-display text-2xl leading-tight">{industry.name}</h2>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                className="rounded-full p-2 text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
              {industry.headline}
            </p>

            {/* Before */}
            <p className="mt-8 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Before — what you paste
            </p>
            <div className="mt-3 space-y-2">
              {industry.before.map((b) => (
                <div
                  key={b}
                  className="flex items-center gap-2 rounded-2xl border border-dashed border-border bg-surface px-4 py-3 font-mono text-xs text-muted-foreground"
                >
                  <span className="text-primary">https://</span>
                  {b}
                </div>
              ))}
            </div>

            {/* After */}
            <p className="mt-8 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              After — one pass, every surface
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {industry.outputs.map((o) => (
                <div
                  key={o.label}
                  className="rounded-2xl border border-border bg-card p-3 shadow-pop"
                >
                  <div
                    className={`grid w-full place-items-center rounded-xl bg-gradient-to-br from-primary/15 to-accent/10 text-primary ${
                      o.ratio === "1:1"
                        ? "aspect-square"
                        : o.ratio === "16:9"
                          ? "aspect-video"
                          : "aspect-[9/16]"
                    }`}
                  >
                    {o.ratio === "video" ? (
                      <Video className="h-6 w-6" />
                    ) : (
                      <Sparkles className="h-6 w-6" />
                    )}
                  </div>
                  <p className="mt-2 font-mono text-[11px] tabular-nums text-muted-foreground">
                    {o.ratio === "video" ? "9:16 video" : o.ratio}
                  </p>
                  <p className="text-xs leading-snug">{o.label}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-2xl border border-border bg-surface p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Hook angle
              </p>
              <p className="mt-2 text-sm leading-relaxed">{industry.hookAngle}</p>
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              Previews above are illustrative layouts, not rendered customer campaigns.
            </p>

            <Link
              to="/auth"
              className="mt-6 flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-pop transition-opacity hover:opacity-90"
            >
              Start Test Pass ($29.95) <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
