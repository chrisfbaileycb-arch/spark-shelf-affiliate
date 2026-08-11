import { Link } from "@tanstack/react-router";
import { OPERATOR, SUPPORT_EMAIL } from "@/lib/brand";
import { BrandMark } from "@/components/BrandMark";

/**
 * PublicFooter — bright Fyxer-inspired redesign.
 * Sleek soft-glass footer with brand column, link columns, social icons,
 * and the affiliate-disclosure banner (carried over from the original).
 * Uses OPERATOR + SUPPORT_EMAIL from @/lib/brand so it stays in sync.
 */
export function PublicFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-6xl px-6 py-12">
        {/* Affiliate disclosure (kept verbatim from the original PublicFooter) */}
        <p className="mb-8 rounded-xl glass px-4 py-3 text-xs text-muted-foreground">
          <strong className="text-foreground">Disclosure:</strong> Echo Your Influence produces
          AI-generated videos featuring synthetic avatars — not real endorsers. When you publish an
          Echo Your Influence video that promotes a product for commission, you must disclose the paid
          relationship (e.g. <code>#ad</code>) and toggle each platform&apos;s AI-content label. See
          our{" "}
          <Link to="/affiliate-disclosure" className="underline hover:text-primary">
            Affiliate Disclosure
          </Link>
          .
        </p>

        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          {/* Brand column */}
          <div className="max-w-xs">
            <Link to="/" className="flex items-center gap-2.5" aria-label="Echo Your Influence home">
              <BrandMark />
              <span className="font-display text-lg uppercase tracking-tight text-foreground">
                Echo Your Influence
              </span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              All we do is marketing for you. Plan it, create it, schedule it, and post it — from
              one workspace.
            </p>


            {/* Social icons */}
            <div className="mt-5 flex items-center gap-3" aria-label="Follow us">
              <a
                href="#"
                aria-label="TikTok"
                className="grid h-9 w-9 place-items-center rounded-full glass text-foreground/70 transition hover:text-primary"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 3.37-4.42v-3.5a6.5 6.5 0 0 0-1 .06A6.34 6.34 0 0 0 5 20.3a6.34 6.34 0 0 0 10.86-4.43V8.69a8.16 8.16 0 0 0 4.77 1.52V6.69h-1.04Z" />
                </svg>
              </a>
              <a
                href="#"
                aria-label="Instagram"
                className="grid h-9 w-9 place-items-center rounded-full glass text-foreground/70 transition hover:text-primary"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="2" y="2" width="20" height="20" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <path d="M17.5 6.5h.01" />
                </svg>
              </a>
              <a
                href="#"
                aria-label="YouTube"
                className="grid h-9 w-9 place-items-center rounded-full glass text-foreground/70 transition hover:text-primary"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33Z" />
                  <path d="m9.75 15.02 5.75-3.27-5.75-3.27v6.54Z" fill="currentColor" />
                </svg>
              </a>
              <a
                href="#"
                aria-label="X"
                className="grid h-9 w-9 place-items-center rounded-full glass text-foreground/70 transition hover:text-primary"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644Z" />
                </svg>
              </a>
              <a
                href="#"
                aria-label="LinkedIn"
                className="grid h-9 w-9 place-items-center rounded-full glass text-foreground/70 transition hover:text-primary"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6Z" />
                  <rect x="2" y="9" width="4" height="12" />
                  <circle cx="4" cy="4" r="2" />
                </svg>
              </a>
            </div>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Product
              </p>
              <ul className="mt-4 space-y-2 text-sm">
                <li>
                  <Link to="/how-it-works" className="text-foreground/80 transition hover:text-primary">
                    How it works
                  </Link>
                </li>
                <li>
                  <Link to="/industries" className="text-foreground/80 transition hover:text-primary">
                    Industries
                  </Link>
                </li>
                <li>
                  <Link to="/pricing" className="text-foreground/80 transition hover:text-primary">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link to="/auth" className="text-foreground/80 transition hover:text-primary">
                    Get started
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Resources
              </p>
              <ul className="mt-4 space-y-2 text-sm">
                <li>
                  <Link to="/guides" className="text-foreground/80 transition hover:text-primary">
                    Guides
                  </Link>
                </li>
                <li>
                  <Link
                    to="/affiliate-disclosure"
                    className="text-foreground/80 transition hover:text-primary"
                  >
                    Affiliate disclosure
                  </Link>
                </li>
                <li>
                  <Link to="/refunds" className="text-foreground/80 transition hover:text-primary">
                    Refunds
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Legal
              </p>
              <ul className="mt-4 space-y-2 text-sm">
                <li>
                  <Link to="/terms" className="text-foreground/80 transition hover:text-primary">
                    Terms
                  </Link>
                </li>
                <li>
                  <Link to="/privacy" className="text-foreground/80 transition hover:text-primary">
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link to="/cookies" className="text-foreground/80 transition hover:text-primary">
                    Cookies
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom bar — uses OPERATOR + SUPPORT_EMAIL so it stays in sync with src/lib/brand.ts */}
        <div className="mt-10 flex flex-col gap-3 border-t border-border pt-6 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} {OPERATOR}. All rights reserved.
          </p>
          <p>
            Support:{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-foreground/80 hover:text-primary">
              {SUPPORT_EMAIL}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
