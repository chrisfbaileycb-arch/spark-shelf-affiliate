# Build Plan: Persona Generator + SaaS Monetization

## 1. Persona generator (core feature)

**New table `personas`**: `id, user_id, name, bio, gender, age_range, vibe, niche, voice_tone, heygen_avatar_id, elevenlabs_voice_id, is_default, created_at`. RLS scoped to `auth.uid()`.

**New page `/personas`**: list cards + "Create persona" button. Each card shows name, avatar thumb, vibe/niche badges, "Set default" / "Edit" / "Delete".

**Persona creator wizard** (single page, 6 fields):
- Gender (F / M / Non-binary)
- Age range (18-24, 25-32, 33-42, 43-55)
- Vibe (Energetic Gen-Z, Polished Pro, Chill Friend, Bold Authority, Warm Mentor)
- Niche (Beauty, Fitness, Tech, Finance, Lifestyle, Food, Fashion, Parenting)
- Voice tone (Bubbly, Calm, Confident, Sultry, Authoritative)
- Name (autosuggest from AI or type)

**Server fn `generatePersona`**: Lovable AI (`google/gemini-3-flash-preview`) takes traits → returns `{name, bio, catchphrases[], speech_quirks}`. Code maps traits → best HeyGen avatar + ElevenLabs voice from a curated lookup table. Saves to `personas`.

**On signup**: auto-create one starter persona ("Maya — 25F lifestyle, energetic") so users can generate immediately without setup. They can edit/delete/replace later.

## 2. Video generator integration

- `/videos/new` flow: persona selector dropdown ("Generate as → [Maya ✨ | Jake 💪 | + New persona]"), defaults to user's `is_default` persona.
- Script generator system prompt injects `persona.bio + catchphrases + speech_quirks` → scripts sound like *that* persona.
- `videos.persona_id` FK added; `voice_id` and `heygen_avatar_id` pulled from the selected persona at render time.

## 3. SaaS billing (Stripe via Lovable payments)

**Two tiers:**
- **Starter — $29.95/mo** → 15 videos/mo
- **Pro — $59.95/mo** → 30 videos/mo

**Free trial:** 3 videos on signup, no card required. Paywall on the 4th.

**New tables:**
- `subscriptions` (user_id, stripe_customer_id, stripe_subscription_id, tier, status, current_period_end)
- `usage_counters` (user_id, period_start, videos_used) — reset monthly

**Quota enforcement:** `generateVideo` server fn checks `videos_used < tier_limit` before HeyGen call; increments on success. If exceeded → throw "Upgrade required" with link to `/billing`.

**New pages:**
- `/pricing` (public) — 2 tier cards + "Start free" CTA
- `/billing` (authenticated) — current plan, usage bar (X / 15 this month), "Upgrade" / "Manage" buttons → Stripe Checkout & Customer Portal

**Stripe webhooks** at `/api/public/webhooks/stripe`: handle `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted` → sync `subscriptions` table.

## 4. Commercial API key swap (later, by you)

Today the app uses your personal HeyGen + ElevenLabs keys. When you're ready to sell:
1. Create separate commercial HeyGen + ElevenLabs accounts
2. Update `HEYGEN_API_KEY` and `ELEVENLABS_API_KEY` secrets in project settings
3. No code change needed — same env var names

## Build order (this turn)

1. `personas` table + RLS + auto-create-on-signup trigger update
2. Persona generator server fn (Lovable AI)
3. `/personas` page (list + create + edit + delete)
4. Wire persona selector into video generator + script prompt
5. `subscriptions` + `usage_counters` tables
6. Enable Lovable Stripe payments → create 2 products
7. `/pricing` + `/billing` pages
8. Quota check in `generateVideo` + 3-video trial logic
9. Stripe webhook for subscription sync

## Technical notes

- HeyGen avatar lookup: hardcoded map of ~12 avatars (3 per gender × 4 age ranges) selected from HeyGen's public avatar library
- ElevenLabs voice lookup: hardcoded map of 5 tones × 2 genders = 10 voices
- Lovable Stripe payments handles Stripe account claiming later — no setup needed now
- Free trial = `subscriptions.tier = 'trial'`, limit 3 lifetime videos (not monthly)

Approve and I'll build it all in one pass.
