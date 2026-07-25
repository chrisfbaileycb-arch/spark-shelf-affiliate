import { createFileRoute } from "@tanstack/react-router";
import { PublicFooter } from "@/components/PublicFooter";
import { PublicNav } from "@/components/PublicNav";

export const Route = createFileRoute("/affiliate-disclosure")({
  head: () => ({
    meta: [
      { title: "Affiliate Disclosure — ReelRipper" },
      { name: "description", content: "How ReelRipper and its users participate in affiliate marketing programs, and how commissions are earned and disclosed." },
      { property: "og:title", content: "ReelRipper Affiliate Disclosure" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/affiliate-disclosure" },
    ],
    links: [{ rel: "canonical", href: "/affiliate-disclosure" }],
  }),
  component: Disclosure,
});

function Disclosure() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <article className="prose prose-neutral mx-auto max-w-3xl px-6 py-16">
        <h1 className="font-display text-4xl">Affiliate Disclosure</h1>
        <p className="text-sm text-muted-foreground">Last updated: October 2025</p>

        <p>ReelRipper is a tool that helps creators produce affiliate marketing videos. This page explains both how <strong>we</strong> use affiliate relationships and what <strong>you</strong> as a ReelRipper user are responsible for when publishing videos generated with our service.</p>

        <h2>1. ReelRipper's own affiliate relationships</h2>
        <p>Signal F Holdings LLC (the operator of ReelRipper) may earn referral or affiliate compensation from third-party services we recommend inside the product or on this site — for example, Stripe, HeyGen, ElevenLabs, or affiliate networks. This never changes the price you pay, and we only recommend tools we actually use to build ReelRipper.</p>

        <h2>2. Your responsibility as a ReelRipper user</h2>
        <p>When you use ReelRipper to generate a video for a product you promote via an affiliate network (Amazon Associates, TikTok Shop, ShareASale, Impact, CJ, etc.), <strong>you are the advertiser</strong>. You are legally required to:</p>
        <ul>
          <li><strong>Disclose the material connection</strong> in a way viewers can't miss. In the U.S., the FTC's Endorsement Guides require a clear disclosure such as <code>#ad</code>, <code>#sponsored</code>, or "paid partnership" placed <em>before</em> viewers have to expand the caption or scroll.</li>
          <li><strong>Use each platform's built-in disclosure tools</strong> when they exist — TikTok's "Paid partnership" toggle, Instagram's branded content tag, YouTube's "Includes paid promotion" checkbox.</li>
          <li><strong>Disclose the use of AI</strong> where required. TikTok, Meta, and YouTube each require creators to label AI-generated or AI-modified content that depicts realistic-looking people or scenes. ReelRipper videos meet that bar — always toggle the platform's AI content label on.</li>
          <li><strong>Comply with each affiliate network's terms</strong> — Amazon Associates specifically requires the disclosure to appear on the platform where the link is shared, not only on the destination page.</li>
          <li><strong>Not make earnings claims or product claims you can't substantiate.</strong> Do not imply that generated influencer personas are real users of the product.</li>
        </ul>

        <h2>3. Suggested disclosure copy</h2>
        <p>For TikTok, Reels, and Shorts captions we recommend appending, in addition to the platform's paid-partnership toggle:</p>
        <blockquote>
          <p>#ad — commissioned link. Created with an AI creator.</p>
        </blockquote>

        <h2>4. AI-generated persona notice</h2>
        <p>The creators who appear in ReelRipper videos are AI avatars, not real endorsers. You may not present them as real customers or real professionals (doctors, dentists, lawyers, financial advisors, etc.) making claims about a product.</p>

        <h2>5. Prohibited product categories</h2>
        <p>You may not use ReelRipper to promote products in categories where AI-generated endorsements pose disproportionate consumer harm, including prescription drugs, medical devices making health claims, unregistered financial or investment products, weapons, or content targeted at minors.</p>

        <h2>6. Questions</h2>
        <p>Email support@reelripper.app.</p>
      </article>
      <PublicFooter />
    </div>
  );
}
