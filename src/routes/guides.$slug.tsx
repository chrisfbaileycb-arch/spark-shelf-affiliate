import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { PublicFooter } from "@/components/PublicFooter";
import { PublicNav } from "@/components/PublicNav";

type Guide = {
  title: string;
  description: string;
  ogTitle: string;
  body: React.ReactNode;
};

const GUIDES: Record<string, Guide> = {
  "tiktok-shop-affiliate": {
    title: "The AI-First Short-Form Affiliate Playbook (TikTok, Shorts, Reels)",
    description: "How to pick winning products, generate 15-second AI creator videos, and post 5-10 affiliate reels a day across TikTok, YouTube Shorts, and Facebook Reels — without ever going on camera.",
    ogTitle: "AI-First Short-Form Affiliate Playbook (TikTok, Shorts, Reels)",
    body: (
      <>
        <p>TikTok Shop pays creators a percentage of every sale they drive. The math is simple: more shots on goal, more commissions. The bottleneck is video production. This guide walks through how AI-generated influencer videos change that.</p>

        <h2>1. Pick products with real demand</h2>
        <p>Open the TikTok Creator Marketplace and filter by "Shop Products". Sort by GMV over the last 7 days and look for items with:</p>
        <ul>
          <li>Under 500 videos already posted (low competition)</li>
          <li>Commission rate at or above 20%</li>
          <li>Under $40 price point (impulse-buy range)</li>
          <li>A visible "problem → payoff" demo — beauty tools, home gadgets, kitchen fixes</li>
        </ul>

        <h2>2. Grab the product URL</h2>
        <p>Copy the product page link directly from TikTok Shop. Paste it into ReelRipper. We pull the product name, price, image, and description automatically.</p>

        <h2>3. Build a persona once</h2>
        <p>Your persona is the recurring AI creator that fronts every video. Consistency builds recognition. Pick a niche (beauty, home, wellness, gadgets), a vibe (relatable, expert, hype), and let the persona generator lock in a HeyGen avatar and ElevenLabs voice. From then on every video uses the same face and voice — the way real TikTok creators do it.</p>

        <h2>4. Generate, review, post</h2>
        <p>Each video takes about a minute to render. Preview it, tweak the caption if needed, add your tracked affiliate link from ReelRipper's link manager, and post. Aim for 5-10 posts per day across 2-3 personas.</p>

        <h2>5. Disclose the partnership</h2>
        <p>FTC guidelines require you to disclose paid or commissioned relationships. Add #ad or use TikTok's "Paid partnership" toggle on every post. ReelRipper appends two hashtags automatically — leave those in and add the disclosure hashtag yourself.</p>

        <h2>6. Read the click data</h2>
        <p>Every affiliate link ReelRipper generates is click-tracked. After a week you'll see which persona × product combinations convert. Double down on the winners. Retire the losers.</p>

        <h2>7. Compound with referrals</h2>
        <p>ReelRipper gives you 2 months free for every creator you refer who upgrades. If you're posting daily anyway, add your referral link to your bio and drop it in creator communities. That's how the machine keeps running while you focus on picking better products.</p>

        <div className="not-prose mt-10 rounded-2xl border border-border bg-surface p-6">
          <p className="font-display text-2xl">Ready to run the playbook?</p>
          <p className="mt-2 text-muted-foreground">3 videos free. No credit card.</p>
          <Link to="/auth" className="mt-4 inline-block rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-pop hover:opacity-95">Start ripping</Link>
        </div>
      </>
    ),
  },
};

export const Route = createFileRoute("/guides/$slug")({
  loader: ({ params }) => {
    const guide = GUIDES[params.slug];
    if (!guide) throw notFound();
    return { guide, slug: params.slug };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Guide not found — ReelRipper" }] };
    const { guide, slug } = loaderData;
    return {
      meta: [
        { title: `${guide.title} — ReelRipper` },
        { name: "description", content: guide.description },
        { property: "og:title", content: guide.ogTitle },
        { property: "og:description", content: guide.description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: `/guides/${slug}` },
      ],
      links: [{ rel: "canonical", href: `/guides/${slug}` }],
      scripts: [{
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: guide.title,
          description: guide.description,
          author: { "@type": "Organization", name: "ReelRipper" },
        }),
      }],
    };
  },
  notFoundComponent: () => (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="font-display text-4xl">Guide not found</h1>
        <Link to="/guides" className="mt-6 inline-block text-primary">← Back to guides</Link>
      </div>
      <PublicFooter />
    </div>
  ),
  errorComponent: ({ reset }) => (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="font-display text-4xl">Something went wrong</h1>
        <button onClick={reset} className="mt-6 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">Try again</button>
      </div>
      <PublicFooter />
    </div>
  ),
  component: GuidePage,
});

function GuidePage() {
  const { guide } = Route.useLoaderData();
  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <article className="prose prose-neutral mx-auto max-w-3xl px-6 py-16">
        <p className="text-sm uppercase tracking-wider text-muted-foreground">Guide</p>
        <h1 className="font-display text-4xl md:text-5xl">{guide.title}</h1>
        <p className="lead text-lg text-muted-foreground">{guide.description}</p>
        {guide.body}
      </article>
      <PublicFooter />
    </div>
  );
}
