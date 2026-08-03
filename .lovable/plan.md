# Referral program — "2 months free per signup"

Every user gets a personal referral link. When somebody signs up through that link AND becomes a paying subscriber (Starter or Pro), the referrer gets **2 months of their current plan credited free** — applied automatically to their next Stripe invoice.

## How it works (user POV)

1. On `/billing`, every user sees a **"Refer & earn"** card with their unique link (`yoursite.com/auth?ref=ABC123`) and a counter: _"3 friends converted · $179.70 credited"_.
2. They share it. New signup hits `/auth?ref=ABC123` → code is stored, attached to their profile on signup.
3. When that referred user upgrades to Starter or Pro for the first time, the referrer's Stripe customer balance is credited with `2 × monthly_price` (negative balance = credit Stripe auto-applies to the next invoice).
4. One conversion per referred user, ever. No double-dipping if they cancel and resubscribe.

## Schema changes (one migration)

- `profiles.referral_code text unique` — short 8-char code, auto-generated on signup
- `profiles.referred_by uuid references profiles(id)` — who referred this user
- New table `referral_conversions (id, referrer_id, referred_user_id unique, credited_cents, credited_at)` — ledger preventing double-credit + powering the dashboard counter
- `handle_new_user()` trigger updated to:
  - Generate a unique referral_code
  - Read `raw_user_meta_data->>'referred_by_code'` and link `referred_by` if it matches a real code

## Code changes

- **`/auth` route** — read `?ref=` from URL, stash in localStorage, pass as `options.data.referred_by_code` on signUp.
- **`src/lib/referrals.functions.ts`** — `getMyReferralStats()` returns code, conversion count, total credited.
- **`/billing` page** — new "Refer & earn" card with copyable link + stats.
- **`/api/public/webhooks/stripe.ts`** — on `customer.subscription.created` with status `active`/`trialing` and tier `starter`/`pro`: check if user has `referred_by` AND no existing conversion row → credit referrer via `stripe.customers.createBalanceTransaction({ amount: -2 × monthly_price, currency: 'usd' })` → insert conversion ledger row.

## Edge cases handled

- Self-referral blocked (referred_by ≠ self).
- Only first-ever paid conversion per referred user counts.
- Credit is in the referrer's currency at their current plan rate, so Pro referrers earn more ($119.90) than Starter ($59.90) — natural upgrade incentive.
- If referrer has no Stripe customer yet (still on trial), credit waits: webhook stores conversion row with `credited_cents=0, credited_at=null`, and a follow-up applies when they first subscribe. _(Phase 2 — for v1 we just credit if they already have a customer, otherwise skip and log.)_

Ready to build?
