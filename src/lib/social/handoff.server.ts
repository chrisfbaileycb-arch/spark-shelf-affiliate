// Server-only share-sheet hand-off helpers. Service role, after the caller's
// identity has been verified by requireSupabaseAuth.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { resolveOrgIdForUser } from "@/lib/integrations/orgs.server";

type PostState =
  | "draft"
  | "awaiting_approval"
  | "scheduled"
  | "publishing"
  | "published"
  | "failed"
  | "canceled";

/** Loads a variant and hard-checks that it belongs to the caller's workspace. */
async function loadOwnedVariant(userId: string, variantId: string) {
  const { data, error } = await supabaseAdmin
    .from("social_post_variants")
    .select("id, org_id, post_id, state")
    .eq("id", variantId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("That post variant no longer exists.");

  const { data: member } = await supabaseAdmin
    .from("organization_members")
    .select("id")
    .eq("org_id", data.org_id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!member) throw new Error("Not authorized for this workspace.");
  return data;
}

export async function patchVariant(
  userId: string,
  variantId: string,
  opts: {
    fields: Record<string, unknown>;
    eventType: string;
    toState?: PostState;
    payload?: Record<string, unknown>;
  },
) {
  const variant = await loadOwnedVariant(userId, variantId);

  const { error } = await supabaseAdmin
    .from("social_post_variants")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update(opts.fields as any)
    .eq("id", variantId);
  if (error) throw new Error(error.message);

  await supabaseAdmin.from("social_post_events").insert({
    org_id: variant.org_id,
    post_id: variant.post_id,
    variant_id: variantId,
    type: opts.eventType,
    actor: userId,
    from_state: variant.state,
    to_state: opts.toState ?? variant.state,
    payload: opts.payload ?? {},
  });

  return { ok: true as const };
}

const PLATFORM_CAPTION_MAX: Record<string, number> = {
  tiktok: 2200,
  instagram: 2200,
  youtube: 5000,
  linkedin: 3000,
};

export async function queueCampaign(
  userId: string,
  input: {
    campaign_id: string;
    platforms: string[];
    scheduled_at?: string | null;
    timezone: string;
  },
) {
  const orgId = await resolveOrgIdForUser(userId);

  const { data: campaign, error: ce } = await supabaseAdmin
    .from("campaigns")
    .select("id, name, user_id, headline, primary_text, video_id, videos(video_url, thumbnail_url)")
    .eq("id", input.campaign_id)
    .maybeSingle();
  if (ce) throw new Error(ce.message);
  if (!campaign || campaign.user_id !== userId) throw new Error("Campaign not found.");

  const mediaUrl = (campaign.videos as { video_url: string | null } | null)?.video_url ?? null;
  const thumbnailUrl =
    (campaign.videos as { thumbnail_url: string | null } | null)?.thumbnail_url ?? null;
  const masterCaption = [campaign.headline, campaign.primary_text]
    .filter(Boolean)
    .join("\n\n")
    .trim();

  const state: PostState = input.scheduled_at ? "scheduled" : "draft";

  const { data: post, error: pe } = await supabaseAdmin
    .from("social_posts")
    .insert({
      org_id: orgId,
      created_by: userId,
      campaign_id: campaign.id,
      video_id: campaign.video_id,
      title: campaign.name,
      master_caption: masterCaption,
      state,
      scheduled_at: input.scheduled_at ?? null,
      timezone: input.timezone,
    })
    .select("id")
    .single();
  if (pe || !post) throw new Error(pe?.message ?? "Could not create the post.");

  const rows = input.platforms.map((platform) => ({
    post_id: post.id,
    org_id: orgId,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    platform: platform as any,
    caption: masterCaption.slice(0, PLATFORM_CAPTION_MAX[platform] ?? 2200),
    platform_title: platform === "youtube" ? campaign.name.slice(0, 100) : null,
    privacy: "public",
    media_url: mediaUrl,
    thumbnail_url: thumbnailUrl,
    state,
    idempotency_key: `${post.id}:${platform}`,
    ready_at: mediaUrl && masterCaption ? new Date().toISOString() : null,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: ve } = await supabaseAdmin.from("social_post_variants").insert(rows as any);
  if (ve) throw new Error(ve.message);

  await supabaseAdmin.from("social_post_events").insert({
    org_id: orgId,
    post_id: post.id,
    type: "queued_for_handoff",
    actor: userId,
    to_state: state,
    payload: { platforms: input.platforms, scheduled_at: input.scheduled_at ?? null },
  });

  if (input.scheduled_at) {
    await supabaseAdmin.from("job_queue").insert({
      org_id: orgId,
      engine: "social",
      kind: "handoff_due_reminder",
      run_key: `handoff:${post.id}`,
      payload: { post_id: post.id, platforms: input.platforms },
      next_run_at: input.scheduled_at,
    });
  }

  return { post_id: post.id, variants: rows.length };
}

/** Resolves the media URL for a variant the caller owns. Used by the proxy. */
export async function resolveVariantMedia(userId: string, variantId: string) {
  const { data, error } = await supabaseAdmin
    .from("social_post_variants")
    .select("id, org_id, media_url")
    .eq("id", variantId)
    .maybeSingle();
  if (error || !data?.media_url) return null;

  const { data: member } = await supabaseAdmin
    .from("organization_members")
    .select("id")
    .eq("org_id", data.org_id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!member) return null;
  return data.media_url;
}
