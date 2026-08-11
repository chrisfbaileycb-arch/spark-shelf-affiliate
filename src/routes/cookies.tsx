import { createFileRoute } from "@tanstack/react-router";
import { OPERATOR } from "@/lib/brand";
import { PublicFooter } from "@/components/PublicFooter";
import { PublicNav } from "@/components/PublicNav";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { title: "Cookie Policy — Echo Your Influence" },
      {
        name: "description",
        content:
          "The cookies and local storage Echo Your Influence uses, why we use them, and how to control them.",
      },
      { property: "og:title", content: "Echo Your Influence Cookie Policy" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/cookies" },
    ],
    links: [{ rel: "canonical", href: "/cookies" }],
  }),
  component: Cookies,
});

function Cookies() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <article className="prose prose-neutral mx-auto max-w-3xl px-6 py-16">
        <h1 className="font-display text-4xl">Cookie Policy</h1>
        <p className="text-sm text-muted-foreground">Last updated: October 2025</p>

        <p>
          Echo Your Influence (operated by {OPERATOR}) uses a small set of first-party cookies and
          browser storage to keep you signed in and to make the product work. We do{" "}
          <strong>not</strong> use third-party advertising cookies, cross-site tracking pixels, or
          behavioral ad networks.
        </p>

        <h2>What we use</h2>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Type</th>
              <th>Purpose</th>
              <th>Retention</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>sb-*-auth-token</code>
              </td>
              <td>Local storage (strictly necessary)</td>
              <td>Keeps you signed in via Supabase auth.</td>
              <td>Until sign-out or session expiry</td>
            </tr>
            <tr>
              <td>
                <code>influencer-echo_ref</code>
              </td>
              <td>Local storage (functional)</td>
              <td>
                Remembers a referral code from <code>?ref=</code> so we can credit the referrer if
                you upgrade.
              </td>
              <td>30 days</td>
            </tr>
            <tr>
              <td>
                <code>__influencer-echo_error_buffer</code>
              </td>
              <td>Session storage (functional)</td>
              <td>
                Buffers uncaught JavaScript errors in your tab so we can investigate crashes if you
                report them.
              </td>
              <td>Until you close the tab</td>
            </tr>
            <tr>
              <td>Stripe checkout cookies</td>
              <td>Third-party (strictly necessary during checkout)</td>
              <td>Set by Stripe on their embedded checkout to process your payment securely.</td>
              <td>Per Stripe's policy</td>
            </tr>
            <tr>
              <td>Affiliate short-link click cookie</td>
              <td>First-party server log (functional)</td>
              <td>
                When someone clicks your <code>/r/CODE</code> link we log the click server-side for
                your analytics. We do not store a browser cookie for this.
              </td>
              <td>Anonymized after 90 days</td>
            </tr>
          </tbody>
        </table>

        <h2>What we do not use</h2>
        <ul>
          <li>Google Analytics, Meta Pixel, TikTok Pixel, or any third-party analytics tag.</li>
          <li>Retargeting or advertising cookies.</li>
          <li>Cross-site tracking of any kind.</li>
        </ul>

        <h2>How to control cookies</h2>
        <p>
          You can clear cookies and local storage at any time from your browser settings. Clearing
          the auth cookie will sign you out. Clearing the referral cookie will prevent us from
          crediting a referrer if you upgrade later.
        </p>

        <h2>Changes</h2>
        <p>
          If we add analytics or any third-party tag in the future, we will update this page and,
          where required, prompt you for consent before setting non-essential cookies.
        </p>

        <h2>Contact</h2>
        <p>Questions? Email support@echoyourinfluence.app.</p>
      </article>
      <PublicFooter />
    </div>
  );
}
