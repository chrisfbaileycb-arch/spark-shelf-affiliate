import { Link } from "@tanstack/react-router";

export type Guide = {
  title: string;
  description: string;
  ogTitle: string;
  body: React.ReactNode;
};

export const GUIDES: Record<string, Guide> = {
  "tiktok-shop-affiliate": {
    title: "The AI-First Short-Form Affiliate Playbook (TikTok, Shorts, Reels)",
    description:
      "How to pick winning products, generate 15-second AI creator videos, and post 5-10 affiliate reels a day across TikTok, YouTube Shorts, and Facebook Reels — without ever going on camera.",
    ogTitle: "AI-First Short-Form Affiliate Playbook (TikTok, Shorts, Reels)",
    body: (
      <>
        <p>
          TikTok Shop, YouTube Shopping, and Facebook Reels pay creators a percentage of every sale
          they drive. The math is simple: more shots on goal, more commissions. The bottleneck is
          video production. This guide walks through how AI-generated influencer videos change that.
        </p>

        <h2>1. Pick products with real demand</h2>
        <p>
          Open the TikTok Creator Marketplace, Amazon Influencer dashboard, or your chosen affiliate
          network and filter by trending products. Sort by GMV or conversions over the last 7 days
          and look for items with:
        </p>
        <ul>
          <li>Under 500 videos already posted (low competition)</li>
          <li>Commission rate at or above 20%</li>
          <li>Under $40 price point (impulse-buy range)</li>
          <li>A visible "problem → payoff" demo — beauty tools, home gadgets, kitchen fixes</li>
        </ul>

        <h2>2. Grab the product URL</h2>
        <p>
          Copy the product page link directly from Amazon, AliExpress, Shopify, or any supported
          store. Paste it into Influencer Echo. We pull the product name, price, image, and
          description automatically.
        </p>

        <h2>3. Build a persona once</h2>
        <p>
          Your persona is the recurring AI creator that fronts every video. Consistency builds
          recognition. Pick a niche (beauty, home, wellness, gadgets), a vibe (relatable, expert,
          hype), and let the persona generator lock in a HeyGen avatar and ElevenLabs voice. From
          then on every video uses the same face and voice — the way real short-form creators do it.
        </p>

        <h2>4. Generate, review, post</h2>
        <p>
          Each video takes about a minute to render. Preview it, tweak the caption if needed, add
          your tracked affiliate link from Influencer Echo's link manager, and post. Aim for 5-10
          posts per day across 2-3 personas.
        </p>

        <h2>5. Disclose the partnership</h2>
        <p>
          FTC guidelines require you to disclose paid or commissioned relationships. Add #ad or use
          each platform's "Paid partnership" toggle on every post. Influencer Echo appends two
          hashtags automatically — leave those in and add the disclosure hashtag yourself.
        </p>

        <h2>6. Read the click data</h2>
        <p>
          Every affiliate link Influencer Echo generates is click-tracked. After a week you'll see
          which persona × product combinations convert. Double down on the winners. Retire the
          losers.
        </p>

        <h2>7. Compound with referrals</h2>
        <p>
          Influencer Echo gives you 2 months free for every creator you refer who upgrades. If
          you're posting daily anyway, add your referral link to your bio and drop it in creator
          communities. That's how the machine keeps running while you focus on picking better
          products.
        </p>

        <div className="not-prose mt-10 rounded-2xl border border-border bg-surface p-6">
          <p className="font-display text-2xl">Ready to run the playbook?</p>
          <p className="mt-2 text-muted-foreground">
            Pick your pass and generate your first 15-second video in under 60 seconds.
          </p>
          <Link
            to="/auth"
            className="mt-4 inline-block rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-pop hover:opacity-95"
          >
            Start Test Pass ($29.95)
          </Link>
        </div>
      </>
    ),
  },
};
