
# AI Affiliate Video Generator

## What it does

1. You paste a product URL (Amazon, TikTok Shop, AliExpress, any store) or pick from a trending feed.
2. The app scrapes title, price, images, description.
3. AI writes a 15s hook-driven script in influencer style.
4. AI generates a 25yo female "influencer" avatar image + product B-roll frames.
5. ElevenLabs generates the voiceover (female voice, e.g. "Jessica").
6. Server renders a vertical 1080x1920 MP4 (15s) with: influencer footage, product cuts, animated captions, music bed.
7. Affiliate Link Manager — you store your affiliate IDs per program (Amazon Associates, TikTok Shop, Impact, ShareASale, AliExpress, etc.); app builds the tagged link and a QR code, tracks clicks.
8. Export: download MP4 + caption + hashtags + affiliate link, ready to upload to TikTok / Reels / Shorts.

## Stack

- **Lovable Cloud** (DB + storage + auth) — for products, generated videos, affiliate programs, link clicks.
- **Lovable AI** (`google/gemini-3-flash-preview`) — script, hashtags, affiliate-program suggestions from product URL/domain.
- **Lovable AI image gen** (`google/gemini-3.1-flash-image-preview`) — generate the AI influencer avatar frames + B-roll cutaways using product images.
- **Firecrawl connector** — scrape any product URL.
- **ElevenLabs connector** — voiceover (`eleven_turbo_v2_5`, voice: Jessica `cgSgspJ2msm6clMCkdW9` by default, user can switch).
- **Server-side ffmpeg** (already in sandbox at runtime) — stitch frames + voice + captions into final MP4. Stored in Cloud Storage; user gets a signed download URL.

## Pages

- `/` — Landing (what it does + sign in)
- `/dashboard` — Stats: videos generated, clicks, top products
- `/products/new` — Paste URL → scrape preview → "Generate Video" CTA
- `/products` — Library of ingested products
- `/videos/$id` — Video player, captions, hashtags, copy affiliate link, download MP4, regenerate
- `/affiliate-programs` — CRUD your affiliate IDs (program name, network, tracking ID, link template)
- `/trending` — Curated trending TikTok Shop / Amazon Movers & Shakers feed (scraped via Firecrawl, cached daily)

## What you'll need to set up

- **Affiliate accounts**: I cannot auto-enroll you. You apply to Amazon Associates, TikTok Shop Creator, Impact, ShareASale, etc. yourself. The app suggests likely programs per product domain and stores your IDs.
- **Connectors I'll prompt you to link**: ElevenLabs, Firecrawl.
- **Posting**: MVP outputs an MP4 you upload manually. Auto-posting to TikTok requires their Content Posting API + app review; I can add a TikTok connector flow in a follow-up.

## Honest caveats

- "Replicate a specific influencer's video" = not built. The app makes a *new* AI-influencer-style video for the same product. Copying a real person's likeness/voice is IP/ToS risk; I won't do that.
- The AI influencer is a generated avatar (consistent across your videos via a seed image you pick), not a deepfake of a real person.
- AI-generated video of a talking person is still rough at 15s; the MVP uses a polished slideshow of avatar shots + product B-roll + dynamic captions + voiceover (the dominant "faceless creator" TikTok style). I can upgrade to true talking-head later via a paid video-gen API (HeyGen / Replicate Wan) if you want.

## Build order this session

1. Enable Lovable Cloud → DB schema (products, videos, affiliate_programs, clicks, profiles, user_roles).
2. Link Firecrawl + ElevenLabs connectors.
3. Design system + shell (dashboard, nav, auth).
4. Product ingest flow (URL → Firecrawl → preview → save).
5. Affiliate Link Manager + click-tracking redirect route.
6. Script + voiceover + image generation pipeline.
7. Server-side MP4 renderer (ffmpeg) → Cloud Storage.
8. Video detail page (player + download + copy caption/hashtags/link).
9. Trending feed (Amazon Movers & Shakers + TikTok Shop scrape, cached).

Total: this is too large for one turn. I'll ship items 1–6 this turn (the working core loop end-to-end, but with a simpler "image-sequence + voiceover" video render in step 6). Items 7–9 polish/render upgrade + trending feed in the next turn.

Approve and I'll start.
