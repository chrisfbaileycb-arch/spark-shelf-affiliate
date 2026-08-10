import { Link } from "@tanstack/react-router";

export type Guide = {
  title: string;
  description: string;
  ogTitle: string;
  body: React.ReactNode;
};

export const GUIDES: Record<string, Guide> = {
  "tiktok-shop-affiliate": {
    title: "The AI-First Short-Form & Multi-Media Campaign Playbook",
    description:
      "How to pick winning products, generate AI spokesperson videos, produce silent cinematic b-roll clips, and build multi-ratio ad kits to scale daily campaign testing across TikTok, YouTube Shorts, Instagram Reels, and Meta Ads — without ever going on camera.",
    ogTitle: "The AI-First Short-Form & Multi-Media Campaign Playbook",
    body: (
      <>
        <p>
          TikTok Shop, YouTube Shopping, Facebook Reels, and Meta Ads all reward accounts that keep
          posting fresh angles. Testing more creative variations gives you more chances to find the
          one that lands — no single format wins every time.
        </p>
        <p>
          The traditional bottleneck has always been production time. This playbook details how
          Influencer Echo's multi-engine creative studio shortens that bottleneck by turning a
          single URL into a full media kit without a camera, a studio, or an editor.
        </p>


        <h2>1. Pick products or services with real demand</h2>
        <p>
          Open TikTok Creator Marketplace, Amazon Influencers, Zillow/MLS listings, or your chosen
          affiliate network / SaaS dashboard:
        </p>
        <ul>
          <li>
            <strong>E-Commerce &amp; Amazon:</strong> a common starting filter is a healthy
            commission rate, an impulse-friendly price point, and a clear "problem → payoff" visual
            demo. Check the current terms on the program's own page — rates change often.
          </li>
          <li>
            <strong>Real Estate &amp; Local Services:</strong> grab active property or service
            booking URLs that benefit from virtual walkthroughs or visual before/after proofs.
          </li>
          <li>
            <strong>SaaS &amp; Apps:</strong> target recurring digital tools with visually engaging
            web interfaces or mobile app screenshots.
          </li>
        </ul>


        <h2>2. Paste the URL into Influencer Echo</h2>
        <p>
          Copy the product, app, or website link directly from Amazon, Shopify, Zillow, or any URL.
          Paste it into Influencer Echo. Our extraction engine automatically pulls the title, key
          value propositions, price, and high-res media assets into a unified creative brief.
        </p>

        <h2>3. Choose your media pipeline &amp; engines</h2>
        <p>
          Influencer Echo gives you a multi-engine studio to generate both video and static assets
          in one pass:
        </p>
        <ul>
          <li>
            <strong>🎙️ AI Influencer Avatars (powered by HeyGen):</strong> select a recurring AI
            creator persona for full spokesperson videos. Includes natural lip-syncing, realistic
            voiceover narration, and burned-in captions for 15s–30s UGC-style hooks.
          </li>
          <li>
            <strong>🎬 Cinematic B-Roll &amp; Motion Studio (powered by MiniMax):</strong> generate
            sleek, silent 6s–10s product motion clips and dynamic background scenes. Perfect for
            aesthetic ad cuts, background loops, and high-production product showcases.
          </li>
          <li>
            <strong>🖼️ Fluid Multi-Ratio Ad Studio:</strong> instantly render matching static ad
            sets in 1:1 (feed), 9:16 (story/reel), and 16:9 (desktop) aspect ratios, complete with
            web/app screenshot mockups and promotional overlays.
          </li>
        </ul>

        <h2>4. Build &amp; lock your persona once</h2>
        <p>
          Your persona is the recurring AI creator that fronts your spokesperson campaigns.
          Consistency builds audience trust. Pick a niche (beauty, real estate, home, tech), set the
          vibe (relatable, expert, hype), and pair it with your default avatar and voice parameters.
          Every subsequent avatar video maintains visual and vocal identity across all posts.
        </p>

        <h2>5. Generate, review &amp; post across channels</h2>
        <p>
          Renders typically take about 30–90 seconds per asset, depending on the engine and current
          queue. Review your multi-format output set:
        </p>
        <ul>
          <li>Grab your HeyGen talking-head video short for direct-to-camera pitches.</li>
          <li>Grab your MiniMax silent b-roll clips for sleek visual cuts or background overlays.</li>
          <li>
            Download your matching 1:1, 9:16, and 16:9 Fluid Ad Cards for Meta, Pinterest, and
            Google Display campaigns.
          </li>
        </ul>
        <p>
          Attach your click-tracked affiliate or campaign link from Influencer Echo's Link Manager
          and post. A steady daily posting habit beats one big batch — pick a cadence you can keep.
        </p>

        <h2>6. FTC compliance &amp; disclosures</h2>
        <p>
          FTC guidelines require clear disclosures on paid, commissioned, or affiliate content. Add
          #ad or toggle the platform's "Paid Partnership" setting on every post. Influencer Echo
          appends your tracking tags automatically — keep those intact and append required
          compliance hashtags.
        </p>

        <h2>7. Measure clicks &amp; scale what works</h2>
        <p>
          Every link generated in Influencer Echo is click-tracked, and the click count for each
          link shows on its product page. Check in weekly to see which persona × product × media
          format combinations pull the most clicks, then put more of your output behind the hooks
          that earn attention. Conversions and payouts are reported by your affiliate network, not
          by Influencer Echo.
        </p>


        <h2>8. Tiered studio expansion &amp; referral growth</h2>
        <p>As your volume grows, upgrade through Influencer Echo's flexible plans:</p>
        <ul>
          <li>
            <strong>Starter ($29.95/mo):</strong> 5 HeyGen avatar shorts + 10 MiniMax motion clips +
            30 Fluid Ad Images.
          </li>
          <li>
            <strong>Pro Creator ($49/mo):</strong> 15 HeyGen avatar shorts + 30 MiniMax motion clips
            + 150 Fluid Ad Images.
          </li>
          <li>
            <strong>Agency ($99/mo):</strong> 30 HeyGen avatar shorts + 100 MiniMax motion clips +
            500 Fluid Ad Images + team features.
          </li>
        </ul>
        <p>
          Plus, earn 2 free months for every creator or agency you refer who upgrades to a paid
          plan. Drop your referral link in creator communities to keep your studio running
          cost-free.
        </p>

        <div className="not-prose mt-10 rounded-2xl border border-border bg-surface p-6">
          <p className="font-display text-2xl">Ready to run the playbook?</p>
          <p className="mt-2 text-muted-foreground">
            Pick your pass and turn your first URL into a full campaign kit in under a minute.
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
