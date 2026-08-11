# Influencer Echo — Two Execution Engines (Outbound + Social Publishing)

Goal: Influencer Echo keeps everything it has today (brand, public pages, auth, billing, affiliate discovery, product ingestion, campaign kits, images, personas, 15–30s video) and gains **two coordinated execution engines** on top of the same creative core:

1. **Outbound (Apollo)** — brief → strategy → content pack → sourced leads → qualification → sequences → pipeline → weekly reporting. Detailed in sections A–G below.
2. **Social Publishing** — scripts → content calendar → approval → scheduled publishing → status/retry monitoring → cross-platform analytics. Detailed in section H.

They are separate engines with separate job kinds, credentials, quotas, and failure surfaces. They share one shell: one tenancy/org model, one job queue infrastructure, one creative library (products, campaign kits, images, videos, personas, UTM links), and one reporting frame. A customer may buy either or both.

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

---

# H. Second execution engine — Social Publishing

Everything in A–G stays as written. This section adds the second engine. Nothing here changes the Apollo design; the two share tenancy (`organizations`), the job queue infrastructure, and the reporting shell, and nothing else.

## H1. Gap analysis (social)

Reused as-is: generated videos (`videos`), ad images (`ad_images`), captions/hashtags, scripts and content packs, personas, campaign kits (`campaigns`), UTM builder (`src/lib/utm.ts`), plan/quota machinery, `_authenticated` shell.

Missing: any concept of a connected social account; any publish action at all (today the product ends at "download your kit"); a calendar; an approval state machine; per-platform variants of one asset; scheduled dispatch; external post IDs; platform analytics ingestion; platform-specific validation (duration, aspect ratio, caption length, privacy rules).

## H2. Provider strategy and adapter interface

First implementation targets a unified social API provider (Ayrshare is the working assumption). The domain model must not encode that choice.

- The platform owner holds **one business credential** server-side (`SOCIAL_PROVIDER_API_KEY` secret). It is never sent to the browser, never logged, never returned from a server function.
- Each org gets a **provider profile identifier** (Ayrshare "profile key" or equivalent), stored encrypted with the same AES-256-GCM helper and `INTEGRATION_ENCRYPTION_KEY` described in section E. Profile keys are credentials; they follow the exact same non-exposure rules as the Apollo key.
- Customers connect TikTok / YouTube / Instagram by being sent to the **provider's hosted linking page** via a short-lived, server-generated URL. They complete OAuth with the platform directly. They never paste a platform API key, and the app never sees platform tokens.

Adapter seam (`src/lib/social/adapter.ts`, implemented by `src/lib/social/ayrshare.server.ts`, later `tiktok.server.ts` / `youtube.server.ts` / `meta.server.ts`):

```ts
interface SocialAdapter {
  id: "ayrshare" | "tiktok" | "youtube" | "meta";
  ensureProfile(orgId): Promise<{ profileRef: string }>;
  linkUrl(profileRef, platforms): Promise<{ url: string; expiresAt: string }>;
  listAccounts(profileRef): Promise<ConnectedAccount[]>;      // platform, handle, status, scopes, expiry
  validate(variant: PostVariant): ValidationIssue[];           // pure, no network
  publish(profileRef, variant, idempotencyKey): Promise<{ externalId: string; state: PublishState; raw: unknown }>;
  getStatus(profileRef, externalId): Promise<{ state: PublishState; raw: unknown }>;
  fetchAnalytics(profileRef, externalId): Promise<{ metrics: RawMetrics; raw: unknown }>;
  unlink(profileRef, accountId): Promise<void>;
}
```

Every adapter returns both a normalized shape and the untouched `raw` payload. Normalization never invents equivalence: TikTok "video views", YouTube "views", and Instagram "plays" are stored raw and surfaced side by side with their platform label; the unified view shows a clearly-labeled "reach (platform-defined)" row rather than a fake single number.

## H3. Information architecture (social)

Second top-level nav item: **Publishing** (icon `CalendarClock`), alongside Outbound.

```text
/publishing                       Calendar (month/week) + upcoming queue + failures
/publishing/queue                 List view: drafts, awaiting approval, scheduled, published, failed
/publishing/posts/$id             Post detail: master content, per-platform variants, timeline, raw responses
/publishing/compose               Create post from an existing campaign kit / video / image set
/publishing/analytics             Cross-platform report, per-platform raw metrics + normalized view
/settings/social                  Social Connections: connect accounts, account health, test post, autopublish toggle
```

Onboarding gains a **Social Connections** step next to the Apollo step. `OnboardingChecklist.tsx` items: "Connect a social account" → "Send a test post" → "(optional) Enable autopublish".

Compose reuses the Campaign Kit drawer: pick a kit, and the master post is prefilled with the kit's video, images, caption, hashtags, and UTM link. One master, three variants:

| Variant | Source asset | Per-variant fields |
|---|---|---|
| TikTok video | 9:16 video | caption (+disclosure), privacy level, comment/duet/stitch flags, direct-post vs draft-upload |
| Instagram Reel | 9:16 video | caption, cover/thumbnail frame, share-to-feed, collaborator |
| YouTube Short | 9:16 video ≤60s | title, description, privacy (public/unlisted/private), category, thumbnail (if eligible) |

FTC affiliate disclosure and AI-content labeling stay on by default in every variant caption, editable but not silently removable — same rule the caption engine already follows.

## H4. State machine

```text
draft ──submit──▶ awaiting_approval ──approve──▶ scheduled ──due──▶ publishing
  ▲                      │                           │                 │
  └──── reject ──────────┘                    cancel │        ┌────────┴────────┐
                                                     ▼        ▼                 ▼
                                                 canceled  published         failed
                                                                              │
                                                                     retry (backoff, capped)
                                                                              ▼
                                                                          publishing
```

Rules:
- Approval is required by default. `autopublish_enabled` may be turned on per org **only after** at least one connected account and one `published` test post exist; the UI keeps the toggle disabled until both are true.
- State transitions are recorded in `post_events` with actor (user id or `system`), so an approval trail exists.
- `publishing` is entered only by the worker holding the queue lock.

## H5. Database additions (social)

Same migration discipline: CREATE TABLE → GRANT → ENABLE RLS → POLICY, org-scoped via `is_org_member`.

| Table | Key columns | RLS |
|---|---|---|
| `social_provider_profiles` | `org_id` unique, `adapter` , `profile_ref_ciphertext`, `status`, `created_at` | **service_role only** |
| `social_accounts` | `org_id`, `platform` (`tiktok\|instagram\|youtube`), `external_account_id`, `handle`, `display_name`, `avatar_url`, `status` (`connected\|expired\|revoked\|error`), `scopes jsonb`, `last_checked_at`; unique `(org_id, platform, external_account_id)` | org member read; service writes |
| `social_posts` | `org_id`, `campaign_id`, `video_id`, `title`, `master_caption`, `state`, `scheduled_at`, `timezone`, `approved_by`, `approved_at`, `created_by` | org member ALL |
| `social_post_variants` | `post_id`, `platform`, `account_id`, `caption`, `platform_title`, `privacy`, `thumbnail_url`, `options jsonb`, `state`, `external_post_id`, `permalink`, `idempotency_key` unique, `last_error`, `attempts` | org member ALL |
| `social_post_events` | `variant_id`, `type` (`state_change\|provider_callback\|error`), `actor`, `occurred_at`, `payload jsonb` | org member read; service writes |
| `social_metrics` | `variant_id`, `collected_at`, `platform`, `raw jsonb`, `views int`, `likes int`, `comments int`, `shares int`, `saves int`, `metric_definitions jsonb`; unique `(variant_id, collected_at)` | org member read; service writes |
| `social_reports` | `org_id`, `week_start`, `metrics jsonb`, `narrative`; unique `(org_id, week_start)` | org member read |
| `social_settings` | `org_id`, `autopublish_enabled bool default false`, `test_post_passed_at`, `default_privacy`, `daily_post_cap` | org member read; admin update |

Idempotency and duplicate-send safety:
- `social_post_variants.idempotency_key` = `sha256(variant_id + scheduled_at)`, unique, and passed to the adapter as the provider idempotency key. A retried or double-fired job cannot create a second post.
- `external_post_id` unique per `(platform, external_post_id)` — a duplicate provider callback is a no-op upsert.
- `social_metrics` unique on `(variant_id, collected_at)` bucketed to the hour, so replayed analytics pulls do not double-count.

## H6. Endpoints, jobs, and webhooks

New job kinds in the **existing** `job_queue` (`kind` enum extended): `publish_variant`, `poll_publish_status`, `refresh_accounts`, `sync_social_metrics`, `social_weekly_report`.

| Route | Trigger | Purpose |
|---|---|---|
| `/api/public/jobs/tick` | existing `*/5 * * * *` | Also claims social jobs; one worker, two engines |
| `/api/public/jobs/publish-due` | `*/5 * * * *` | Enqueue `publish_variant` for variants whose `scheduled_at <= now()` and state `scheduled` |
| `/api/public/jobs/social-sync` | `0 */3 * * *` | Enqueue `sync_social_metrics` + `refresh_accounts` |
| `/api/public/webhooks/social` | provider push | Verify signature → upsert variant state, `external_post_id`, and a `post_events` row |

Server functions (auth-required, org-scoped): create/update post + variants, submit for approval, approve/reject, schedule/cancel, request link URL, list account health, send test post, toggle autopublish.

Worker behavior for `publish_variant`:
1. Claim with `FOR UPDATE SKIP LOCKED`; set variant `publishing`.
2. Re-run `adapter.validate()` — a variant that fails validation goes to `failed` with a readable reason, never to the provider.
3. Check account status is `connected` and daily post cap not exceeded.
4. Call `adapter.publish()` with the stored idempotency key.
5. Store `external_post_id` + `raw`; state `published` or, if the provider reports async processing, enqueue `poll_publish_status` with backoff.
6. Failures: exponential backoff, capped attempts, then `failed` + dead-letter row + in-app notification. Auth failures (`expired`/`revoked`) mark the account unhealthy, pause that org's scheduled posts, and stop retrying.

Rate limits and platform constraints are respected per platform, not globally: per-account daily caps, provider 429 `Retry-After`, and known platform limits (e.g. YouTube's daily upload quota) tracked in `social_settings` and surfaced on the account-health screen.

## H7. Billing separation

Social publishing is its own line: `social_subscriptions` (org, Stripe subscription, tier, connected-account count). The provider's own plan cost (Ayrshare business/multi-user) is a platform cost, not a client passthrough — unlike Apollo, where the client owns the data/sending cost. Reporting keeps three clearly separated buckets: Influencer Echo platform fees, client-owned Apollo consumption, and social publishing subscription. No screen ever merges them.

## H8. Phased plan with acceptance tests (social)

Phases run **after** Outbound Phase 1 (tenancy + crypto), which they depend on, and can otherwise interleave.

**S1 — Provider profile + connections.** `social_provider_profiles`, `social_accounts`, adapter interface + Ayrshare implementation of `ensureProfile`/`linkUrl`/`listAccounts`, `/settings/social`.
Accept: a user connects a TikTok account through the provider's hosted page and never sees a key; profile ref is ciphertext in the DB and unreadable via any client query; account health shows handle + status; the browser bundle contains no provider credential.

**S2 — Compose, variants, validation.** `social_posts`, `social_post_variants`, compose UI seeded from a campaign kit, pure per-platform validators.
Accept: one master produces TikTok/Reel/Short variants with independent captions/titles/privacy; oversize or over-length content is blocked with a specific reason before any network call; disclosure text present by default.

**S3 — Approval + calendar.** State machine, `social_post_events`, calendar and queue views.
Accept: draft → awaiting_approval → scheduled works with an audit trail; rejection returns to draft with a comment; autopublish toggle stays disabled until a connected account and a passed test post exist.

**S4 — Scheduled publishing + retry.** `publish_variant`, `publish-due`, `poll_publish_status`, dead-letter UI.
Accept: a scheduled post publishes unattended; firing the job twice creates exactly one platform post (idempotency key proves it); a forced provider error retries with backoff and lands in dead-letter; a revoked account pauses rather than loops.

**S5 — Webhooks + status truth.** `/api/public/webhooks/social` with signature verification.
Accept: a replayed callback changes nothing; state in the app matches the platform for published, processing, and rejected posts.

**S6 — Analytics.** `social_metrics`, `sync_social_metrics`, `/publishing/analytics`, `social_reports`.
Accept: raw platform payloads stored verbatim; normalized view labels each metric's platform definition; repeated syncs do not double-count; the report separates platform fee, Apollo cost, and social subscription.

**S7 — End-to-end verification.** A full unattended cycle: compose from a kit → approve → schedule → publish to all three platforms → webhook confirm → metrics sync → weekly report. Until this passes, the UI and marketing say "scheduled publishing" and show run status — never "fully automated".

## H9. External blockers and review requirements (social)

1. **Provider account and plan** — Ayrshare (or chosen aggregator) business/multi-user plan is required for per-customer profiles; single-profile plans cannot serve multiple customers. Needs purchase and the business API key added as a secret.
2. **Platform review and eligibility, even through an aggregator**: TikTok Content Posting API apps are unaudited by default (posts may be restricted to private/draft until audited); Instagram content publishing requires the user's account to be a **professional** account linked to a Facebook Page and supports Reels/images with its own rate limits; YouTube uploads consume Data API quota and unverified projects have upload restrictions. Each user still completes their own OAuth. Confirm which of these the aggregator's plan covers versus what we must apply for.
3. **Direct-adapter fallback scope** — if the aggregator's coverage or pricing fails, the adapter seam allows direct TikTok/Google/Meta adapters, but that means three separate app reviews and token-refresh maintenance. Decision needed before S1 if it changes the provider choice.
4. **Webhook availability** — confirm the provider signs webhooks and which events it emits; if it does not, S5 collapses into polling only (design already supports both).
5. **Autopublish policy** — confirm you want opt-in autopublish at all, and whether it should be per-org or per-campaign.
6. **Publishing tier pricing** — the social subscription price/limits are not defined yet; the plan spec's the separation but not the numbers.
7. **Publish required** — provider webhooks and cron both need the stable published URL, same as Outbound.
