import { createFileRoute } from "@tanstack/react-router";
import { PublicFooter } from "@/components/PublicFooter";
import { PublicNav } from "@/components/PublicNav";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — ReelRipper" },
      {
        name: "description",
        content:
          "How ReelRipper collects, uses, and protects your data. Operated by Signal F Holdings LLC.",
      },
      { property: "og:title", content: "ReelRipper Privacy Policy" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/privacy" },
    ],
    links: [{ rel: "canonical", href: "/privacy" }],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <article className="prose prose-neutral mx-auto max-w-3xl px-6 py-16">
        <h1 className="font-display text-4xl">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground">Last updated: October 2025</p>

        <p>
          This page describes the personal information ReelRipper ("we", operated by Signal F
          Holdings LLC) collects, why we collect it, and the choices you have. This policy is
          maintained by the app owner and describes current practices.
        </p>

        <h2>1. Information we collect</h2>
        <ul>
          <li>
            <strong>Account data</strong>: email, password hash, display name.
          </li>
          <li>
            <strong>Product & video data</strong>: URLs you submit, scraped product metadata,
            scripts, generated videos, personas, and affiliate program IDs.
          </li>
          <li>
            <strong>Billing data</strong>: payment is processed by Stripe; we store only your Stripe
            customer ID and subscription status, not card numbers.
          </li>
          <li>
            <strong>Usage data</strong>: click events on your affiliate short-links, video
            generation counts, and standard server logs (IP, user agent) for security and abuse
            prevention.
          </li>
        </ul>

        <h2>2. How we use it</h2>
        <p>
          To provide and improve the Service, run the video generation pipeline, enforce plan
          limits, prevent abuse, process payments, and communicate essential service updates.
        </p>

        <h2>3. Third-party processors</h2>
        <p>
          We share the minimum data required with: <strong>Supabase</strong> (database, auth,
          storage), <strong>Stripe</strong> (billing), <strong>HeyGen</strong> and{" "}
          <strong>ElevenLabs</strong> (video and voice generation),{" "}
          <strong>Google Gemini via Lovable AI Gateway</strong> (script generation), and{" "}
          <strong>Firecrawl</strong> (URL scraping). Each processes data under their own terms.
        </p>

        <h2>4. Retention</h2>
        <p>
          We retain your account and generated content until you delete your account. Server logs
          are retained for up to 90 days. Click events on affiliate links are retained for analytics
          and fraud prevention.
        </p>

        <h2>5. Your rights</h2>
        <p>
          You can access, export, or delete your data at any time by emailing
          support@reelripper.app. If you are in the EEA, UK, or California, you have additional
          rights under GDPR/CCPA including the right to object, restrict processing, and lodge a
          complaint with your local regulator.
        </p>

        <h2>6. Cookies</h2>
        <p>
          See our <a href="/cookies">Cookie Policy</a> for the exact list of cookies and browser
          storage we use. We do not use third-party advertising or cross-site tracking cookies.
        </p>

        <h2>7. Security</h2>
        <p>
          Data is encrypted in transit (HTTPS) and at rest by our infrastructure providers.
          Row-level security policies enforce that users can only access their own records. No
          system is perfectly secure — report suspected vulnerabilities to security@reelripper.app.
        </p>

        <h2>8. Children</h2>
        <p>The Service is not directed to anyone under 18.</p>

        <h2>9. Changes</h2>
        <p>
          We will update the "Last updated" date above and, for material changes, notify you by
          email.
        </p>

        <h2>10. Contact</h2>
        <p>Signal F Holdings LLC, Wyoming, USA. Email support@reelripper.app.</p>
      </article>
      <PublicFooter />
    </div>
  );
}
