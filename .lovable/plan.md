# Influencer Echo — Autonomous Go-To-Market Engine ("Outbound")

Goal: Influencer Echo keeps everything it has today (brand, public pages, auth, billing, affiliate discovery, product ingestion, campaign kits, images, personas, 15–30s video) and gains one new pillar: an autonomous outbound engine that turns a product brief into strategy, content packs, sourced leads, qualified contacts, per-lead sequences, and weekly reporting — running on a server-side schedule.

One important architecture note up front: this project is TanStack Start, and its backend runtime is TanStack server routes and server functions, not Supabase Edge Functions. The plan uses server routes under `src/routes/api/public/jobs/*` driven by `pg_cron` + `pg_net`. That is the same "scheduled server-side execution with service-role access" contract you asked for; only the hosting primitive differs. Everything below assumes that.

---

## A. Gap analysis

What already exists and gets reused (no rebuild):
- Product ingestion via Firecrawl + Lovable AI (`campaigns.server.ts`, `products.functions.ts`) — becomes the product-brief intake source.
- Campaign kit orchestration (`campaigns.functions.ts`: start → images → video → kit drawer) — becomes the content/video script pack.
- Ad copy generation, multi-ratio image engine, persona system, UTM builder.
- Auth, `_authenticated` layout + sidebar nav, Stripe checkout/webhook, subscriptions, `usage_counters`, `plan_limits()` quota RPCs, referral ledger.
- Tenant isolation pattern: every table is `user_id`-scoped with `ALL USING auth.uid() = user_id`.

What does not exist yet:
- No organization/tenant concept beyond a single user id. Outbound is naturally org-scoped (shared inbox, shared lead pool).
- No integration credential store at all. No encryption helper, no Apollo connection.
- No lead / contact / company model, no suppression list, no sequence or step model, no send log.
- No job queue, no scheduler, no `pg_cron`/`pg_net` usage anywhere, no run/attempt observability tables.
- No strategy or positioning artifact — copy is generated ad hoc per campaign, never persisted as a reusable brief.
- No analytics rollups; `link_clicks` is the only event table and it is affiliate-only.
- Billing has one axis (platform tiers). No weekly $50 platform-fee line, and no separation of platform fee from client-owned Apollo consumption in checkout or reporting.
- No deployment-level concept and none of the required disclosure copy.

Explicitly not carried over from the prototype: browser-side Apollo calls, and its stub modules for db/ai/http/auth/payments/scheduling.

---

## B. Information architecture

New top-level nav item in `_authenticated.tsx`: **Outbound** (icon `Send`), sitting after Studio. Everything lives under it so the app reads as one product with a new pillar, not a second app.

```text
/outbound                      Command center: active deployments, pipeline health,
                               last run status, this week's numbers
/outbound/briefs               Product briefs (from an ingested product or manual)
/outbound/briefs/$id           Brief + AI strategy & positioning + content/script pack
/outbound/campaigns/new        Campaign Setup wizard (brief → ICP → deployment level)
/outbound/campaigns/$id        Campaign detail: leads, sequences, sends, timeline
/outbound/leads                Lead & contact pool, qualification scores, suppression
/outbound/reports              Weekly analytics/reporting
/settings/integrations         Apollo API key entry + connection health (onboarding step 1)
```

Reuse, not duplication:
- A brief is created from an existing `products` row (URL ingest already does the scraping) or typed manually.
- The content/script pack renders through the existing Campaign Kit drawer components; outbound adds email/DM copy tabs alongside the existing image/video tabs.
- `OnboardingChecklist.tsx` gains "Connect Apollo" and "Create your first brief" items.

Deployment Level cards (Campaign Setup, step 3) carry the two required disclosures verbatim:

> Requires an active Apollo.io plan with API access. Sourcing data credits and sending mailbox deliverability run through your connected Apollo account.

> The platform fee ($50/wk) covers AI lead qualification, copy strategy, sequence orchestration, and automated pipeline monitoring. Raw data consumption and mailbox sending are handled by your Apollo account.

The first string renders as a prerequisite line on Level 1 (and inherits to higher levels); the second renders in the pricing block of every level card and again on the checkout summary and the weekly report footer, so platform fee and client-owned Apollo cost are never conflated.

---

## C. Database design

All new tables in `public`, each with `CREATE TABLE → GRANT → ENABLE RLS → POLICY` in the same migration.

Tenancy: introduce `organizations` + `organization_members` so outbound data can be shared, with a `handle_new_user()` addition that creates a personal org for every user. A security-definer `public.is_org_member(_org uuid, _user uuid)` (and `is_org_admin`) backs every policy — no recursive policy reads.

| Table | Key columns | RLS |
|---|---|---|
| `organizations` | `name`, `owner_id`, `created_at` | members read; admin update |
| `organization_members` | `org_id`, `user_id`, `role` (`owner\|admin\|member`) | members read own org rows |
| `integration_credentials` | `org_id`, `provider` (`apollo`), `ciphertext`, `key_version`, `last_verified_at`, `status`, `scope_notes`; unique `(org_id, provider)` | **no anon/authenticated grants at all** — service_role only |
| `integration_status` | view/table exposing `org_id`, `provider`, `status`, `last_verified_at`, masked hint (`••••1234`) | members read |
| `product_briefs` | `org_id`, `product_id` (nullable), `title`, `source_url`, `offer`, `audience`, `proof_points jsonb`, `constraints` | org member ALL |
| `gtm_strategies` | `brief_id`, `positioning`, `icp jsonb`, `messaging_pillars jsonb`, `objections jsonb`, `model`, `generated_at` | org member ALL |
| `content_packs` | `brief_id`, `kind` (`video_script\|email\|dm\|ad`), `variants jsonb`, `campaign_id` (link to existing kits) | org member ALL |
| `outbound_campaigns` | `org_id`, `brief_id`, `strategy_id`, `deployment_level` (1–3), `status`, `weekly_lead_target`, `daily_send_cap`, `timezone`, `started_at`, `paused_reason` | org member ALL |
| `icp_filters` | `campaign_id`, `apollo_query jsonb`, `titles[]`, `industries[]`, `headcount`, `geos[]` | org member ALL |
| `companies` | `org_id`, `apollo_org_id` unique per org, `name`, `domain`, `industry`, `size` | org member ALL |
| `leads` | `org_id`, `campaign_id`, `company_id`, `apollo_contact_id`, `email` (nullable), `first_name`, `last_name`, `title`, `linkedin_url`, `source`, `qualification_score int`, `qualification_reason`, `status` (`sourced\|qualified\|rejected\|enrolled\|replied\|converted\|bounced`), `dedupe_key` | org member ALL |
| `suppressions` | `org_id`, `email_hash`, `domain`, `reason` (`unsubscribe\|bounce\|manual\|competitor`), `created_at` | org member read; service writes |
| `sequences` | `campaign_id`, `name`, `status`, `apollo_sequence_id` | org member ALL |
| `sequence_steps` | `sequence_id`, `step_number`, `delay_days`, `channel`, `subject`, `body`, `personalization_slots jsonb` | org member ALL |
| `lead_sequence_enrollments` | `lead_id`, `sequence_id`, `status`, `current_step`, `enrolled_at`, `apollo_enrollment_id`; unique `(lead_id, sequence_id)` | org member ALL |
| `outbound_events` | `org_id`, `lead_id`, `type` (`sent\|open\|click\|reply\|bounce\|unsubscribe\|meeting`), `occurred_at`, `payload jsonb`, `external_id` unique | org member read; service writes |
| `weekly_reports` | `org_id`, `campaign_id`, `week_start`, `metrics jsonb`, `narrative`, `generated_at`; unique `(campaign_id, week_start)` | org member read |
| `job_queue` | `id`, `org_id`, `campaign_id`, `kind` (`source_leads\|qualify_leads\|build_sequence\|enroll_contacts\|sync_events\|weekly_report`), `run_key` unique, `payload jsonb`, `status` (`queued\|running\|succeeded\|failed\|dead`), `attempts`, `max_attempts`, `next_run_at`, `locked_at`, `locked_by`, `last_error` | **service_role only**; members read a sanitized `job_status` view |
| `job_runs` | `job_id`, `started_at`, `finished_at`, `outcome`, `items_processed`, `apollo_credits_note`, `error` | service writes; members read via view |
| `apollo_usage_log` | `org_id`, `endpoint`, `requested_at`, `status`, `rate_headers jsonb` | service only |

Uniqueness that enforces the "no duplicates, no double-sends" requirement:
- `leads`: unique `(org_id, dedupe_key)` where `dedupe_key = lower(email)` or `apollo_contact_id` fallback.
- `lead_sequence_enrollments`: unique `(lead_id, sequence_id)`.
- `job_queue.run_key`: e.g. `source_leads:<campaign_id>:2026-W32` — a re-fired cron for the same window is a no-op insert.
- `outbound_events.external_id` unique — replayed Apollo pages cannot double-count.

Enrollment is additionally gated by a trigger that rejects insert when the lead's email hash is in `suppressions`.

Quota/billing: add `outbound_subscriptions` (`org_id`, `stripe_subscription_id`, `weekly_fee_cents = 5000`, `deployment_level`, `status`) so the $50/wk platform fee is a distinct Stripe price and a distinct line in reporting, separate from the existing monthly creative tiers and from Apollo consumption (which the platform never bills).

---

## D. Scheduled execution and job flow

Endpoints (TanStack server routes, `POST`, all under `src/routes/api/public/jobs/`, all authenticated with the Supabase anon key in the `apikey` header per the cron pattern, then re-validated server side):

| Route | Cron | Job |
|---|---|---|
| `/api/public/jobs/tick` | `*/5 * * * *` | Claim up to N due `job_queue` rows and dispatch |
| `/api/public/jobs/plan` | `0 6 * * 1` | For every active campaign, enqueue the week's `source_leads` + `weekly_report` jobs with deterministic `run_key`s |
| `/api/public/jobs/sync` | `0 * * * *` | Enqueue `sync_events` per active campaign |

Worker pipeline per campaign, each stage its own queue row so failures retry in isolation:

```text
source_leads   Apollo mixed_people/search via ICP filters, paged, org-scoped
      ↓        upsert companies + leads on dedupe_key
qualify_leads  Lovable AI scores each lead against strategy/ICP → score + reason
      ↓        below threshold → status rejected (never enrolled)
build_sequence Content pack + strategy → per-lead personalized steps
      ↓        created/updated in Apollo, apollo_sequence_id stored
enroll_contacts filter suppressions, respect daily_send_cap and level cap,
      ↓        enroll in batches, unique constraint blocks re-enrollment
sync_events    pull replies/opens/bounces/unsubs → outbound_events (external_id)
      ↓        bounce/unsub writes a suppression row
weekly_report  rollup metrics + AI narrative → weekly_reports
```

Reliability rules baked into the worker:
- Claim with `UPDATE ... SET status='running', locked_at=now(), locked_by=$worker WHERE status='queued' AND next_run_at<=now() ... FOR UPDATE SKIP LOCKED` — no double workers.
- Retry with exponential backoff on `next_run_at`; `attempts >= max_attempts` → `dead` and surfaced in the UI.
- Stale lock reaper: `running` older than 15 min returns to `queued`.
- Apollo 429 → honor `Retry-After`, requeue, never tight-loop; 401/403 → mark the integration `needs_attention`, pause the campaign, notify in-app, and stop retrying.
- Every Apollo call logged to `apollo_usage_log` with rate headers (status + endpoint only, never the key).
- All writes idempotent via the unique keys in section C.

Observability: `/outbound` shows last run per job kind, next scheduled run, failure count, dead-letter list with a manual "requeue" action (which just inserts a fresh queue row).

---

## E. Credential storage and retrieval

Flow: onboarding step at `/settings/integrations` → user pastes their Apollo API key → a `createServerFn` (auth-required) validates it with a cheap Apollo call, encrypts it, and upserts `integration_credentials` for the org. The plaintext key exists only inside that one server handler and inside the worker at call time.

Encryption: AES-256-GCM in a server-only helper (`src/lib/crypto.server.ts`), using `createCipheriv`/`createDecipheriv` from `node:crypto`, storing `iv | authTag | ciphertext` base64 in a single opaque column. The key comes from a secret named `INTEGRATION_ENCRYPTION_KEY` (32 random bytes, base64) — this is a random value the platform issues, so it is generated and stored automatically; you never have to invent or paste it. This means the ciphertext is unreadable even to anyone reading the database directly.

Retrieval: only the worker touches it. `getApolloKey(orgId)` lives in a `.server.ts` module, is called inside a job handler after (1) the cron caller is validated, (2) the job row is claimed, and (3) the job's `org_id` is confirmed to own the campaign. Never returned from any server function, never in a loader, never in a response body.

Non-exposure guarantees:
- `integration_credentials` has zero grants to `anon`/`authenticated` — even a leaked JWT cannot select it.
- The UI reads only `integration_status` (status, last verified, masked last-4).
- Error paths wrap Apollo failures in a sanitized message; the raw request (which carries the key header) is never logged or reported to error tracking.
- All Apollo calls are server-side; nothing Apollo-related ever enters a client bundle or `import.meta.env`.

If the Apollo connector is preferred later, the same retrieval seam swaps to the gateway with no schema change — but the requirement is "client enters their own key", so BYO-key is the design.

---

## F. Phased plan with acceptance tests

**Phase 1 — Tenancy + credentials**
Organizations, membership, `is_org_member`, personal-org backfill, `integration_credentials`, crypto helper, `/settings/integrations` UI, onboarding checklist item.
Accept: key saved once; DB column is ciphertext; a signed-in browser query for `integration_credentials` returns permission denied; status card shows "Connected · verified <ts>"; a deliberately bad key shows a clear failure and never persists.

**Phase 2 — Brief → strategy → content pack**
`product_briefs`, `gtm_strategies`, `content_packs`; server fns to generate each via Lovable AI; brief detail UI reusing Campaign Kit drawer patterns; briefs can be seeded from an existing ingested product.
Accept: ingest a URL → brief created → strategy with ICP + pillars persisted → email/DM/script variants render and are editable.

**Phase 3 — Campaign Setup + deployment levels + billing separation**
`outbound_campaigns`, `icp_filters`, level cards with both disclosure strings verbatim, `outbound_subscriptions` and the $50/wk Stripe price, checkout summary with the fee/Apollo-cost split.
Accept: both strings appear character-for-character on the cards; checkout shows the platform fee alone; a campaign cannot activate without a verified Apollo connection.

**Phase 4 — Job queue + scheduler skeleton**
`job_queue`, `job_runs`, `/jobs/tick` + `/jobs/plan`, `pg_cron`/`pg_net` wiring, dead-letter UI.
Accept: a no-op job runs on schedule; firing the same `run_key` twice creates one row; a forced failure retries with backoff and lands in dead-letter after max attempts; a killed run is reclaimed by the reaper.

**Phase 5 — Sourcing + qualification**
`companies`, `leads`, `suppressions`, `source_leads` + `qualify_leads` handlers, lead pool UI.
Accept: a scheduled run sources leads into the pool with no duplicates across two consecutive runs; every lead has a score and reason; rejected leads never advance; 429 backs off rather than hammering.

**Phase 6 — Sequences + enrollment**
`sequences`, `sequence_steps`, `lead_sequence_enrollments`, `build_sequence` + `enroll_contacts`, daily cap enforcement, suppression trigger.
Accept: personalized steps generated per lead; enrolling twice is rejected by the unique constraint; a suppressed address is never enrolled; daily cap respected across runs.

**Phase 7 — Event sync + weekly reporting**
`outbound_events`, `sync_events`, `weekly_reports`, `/outbound/reports`, pipeline monitoring on `/outbound`.
Accept: replies/bounces/unsubs land as events; bounce/unsub auto-suppresses; replaying the same page adds no duplicate events; the weekly report shows platform fee and Apollo-owned consumption as separate lines.

**Phase 8 — End-to-end verification**
A full unattended week simulated with a compressed schedule against a real Apollo account.
Accept: source → qualify → sequence → enroll → sync → report completes with zero manual intervention. Until this passes, no UI copy or marketing claims full automation — the UI says "scheduled" and shows run status instead.

---

## G. Blocked on external configuration or details

1. **Apollo plan + API access** on your account, and confirmation of which endpoints your key tier permits — people search and sequence/enrollment endpoints are commonly gated to master keys, and a 403 there changes Phase 6's design (we may have to generate sequences in-app and hand off, rather than create them in Apollo).
2. **Sending mailbox**: whether Apollo-connected mailboxes do the sending (assumed) or a separate ESP is involved.
3. **Deployment Level definitions** — I have the disclosure copy but not the level ladder itself (leads/week, sequence steps, channels, price per level beyond the $50/wk platform fee).
4. **Stripe price** for the weekly platform fee — needs creating when you're ready; the plan spec's it without creating it.
5. **Org model confirmation**: is outbound per-user or genuinely per-organization with invited members? I've designed for org; it collapses cleanly to one-user orgs if you prefer.
6. **Publishing** — `pg_cron` needs a stable published URL to call; scheduling can't be verified end-to-end until the app is published.
7. **Edge Functions vs server routes** — flagged above; confirm you're fine with TanStack server routes as the execution surface, since Edge Functions aren't the runtime for this stack.
