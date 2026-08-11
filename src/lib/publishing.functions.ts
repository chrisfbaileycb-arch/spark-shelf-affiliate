import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type QueueVariant = {
  id: string;
  platform: string;
  state: string;
  caption: string;
  platform_title: string | null;
  media_url: string | null;
  permalink: string | null;
  last_error: string | null;
  attempts: number;
  caption_copied_at: string | null;
  handed_off_at: string | null;
  posted_at: string | null;
  external_post_url: string | null;
  confirmation_method: string | null;
  skipped_at: string | null;
  last_share_error: string | null;
};

export type QueuePost = {
  id: string;
  title: string;
  state: string;
  scheduled_at: string | null;
  timezone: string;
  created_at: string;
  variants: QueueVariant[];
};

export type PublishingQueue = {
  posts: QueuePost[];
  /** Direct-to-platform publishing via an aggregator. Optional, not required. */
  directPublishAvailable: boolean;
  /** True background push (browser closed) requires VAPID + server delivery. */
  backgroundPushConfigured: boolean;
  notificationPreferences: { due_reminders_enabled: boolean; lead_minutes: number };
};

const PLATFORMS = ["tiktok", "instagram", "youtube", "linkedin"] as const;

/** Reads only real rows. There is no sample or seeded data behind this. */
export const getPublishingQueue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PublishingQueue> => {
    const { resolveOrgIdForUser } = await import("@/lib/integrations/orgs.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const orgId = await resolveOrgIdForUser(context.userId);

    const [postsRes, prefRes] = await Promise.all([
      supabaseAdmin
        .from("social_posts")
        .select(
          "id, title, state, scheduled_at, timezone, created_at, social_post_variants(id, platform, state, caption, platform_title, media_url, permalink, last_error, attempts, caption_copied_at, handed_off_at, posted_at, external_post_url, confirmation_method, skipped_at, last_share_error)",
        )
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(100),
      supabaseAdmin
        .from("notification_preferences")
        .select("due_reminders_enabled, lead_minutes")
        .eq("user_id", context.userId)
        .maybeSingle(),
    ]);

    const posts: QueuePost[] = (postsRes.data ?? []).map((p) => ({
      id: p.id,
      title: p.title,
      state: p.state,
      scheduled_at: p.scheduled_at,
      timezone: p.timezone,
      created_at: p.created_at,
      variants: (p.social_post_variants ?? []) as QueueVariant[],
    }));

    return {
      posts,
      directPublishAvailable: false,
      backgroundPushConfigured: Boolean(process.env["WEB_PUSH_VAPID_PUBLIC_KEY"]),
      notificationPreferences: {
        due_reminders_enabled: prefRes.data?.due_reminders_enabled ?? false,
        lead_minutes: prefRes.data?.lead_minutes ?? 10,
      },
    };
  });

/** Creates a post plus one variant per platform from an existing campaign. */
export const queueCampaignForPublishing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        campaign_id: z.string().uuid(),
        platforms: z.array(z.enum(PLATFORMS)).min(1),
        scheduled_at: z.string().datetime().nullable().optional(),
        timezone: z.string().default("UTC"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { queueCampaign } = await import("@/lib/social/handoff.server");
    return queueCampaign(context.userId, data);
  });

const variantInput = z.object({ variant_id: z.string().uuid() });

export const recordCaptionCopied = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => variantInput.parse(d))
  .handler(async ({ data, context }) => {
    const { patchVariant } = await import("@/lib/social/handoff.server");
    return patchVariant(context.userId, data.variant_id, {
      fields: { caption_copied_at: new Date().toISOString() },
      eventType: "caption_copied",
    });
  });

/** Only called after navigator.share() RESOLVES. Never means "published". */
export const recordHandoff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => variantInput.parse(d))
  .handler(async ({ data, context }) => {
    const { patchVariant } = await import("@/lib/social/handoff.server");
    return patchVariant(context.userId, data.variant_id, {
      fields: { handed_off_at: new Date().toISOString(), last_share_error: null },
      eventType: "handed_off",
    });
  });

export const recordShareFailure = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    variantInput.extend({ reason: z.string().max(300) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { patchVariant } = await import("@/lib/social/handoff.server");
    return patchVariant(context.userId, data.variant_id, {
      fields: { last_share_error: data.reason },
      eventType: "share_failed",
      payload: { reason: data.reason },
    });
  });

/** Explicit human confirmation. The only path to "Posted". */
export const markVariantPosted = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    variantInput
      .extend({ external_post_url: z.string().url().nullable().optional() })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { patchVariant } = await import("@/lib/social/handoff.server");
    return patchVariant(context.userId, data.variant_id, {
      fields: {
        posted_at: new Date().toISOString(),
        posted_by: context.userId,
        external_post_url: data.external_post_url ?? null,
        confirmation_method: "manual",
        skipped_at: null,
        state: "published",
      },
      eventType: "manually_confirmed_posted",
      toState: "published",
    });
  });

export const undoPostConfirmation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => variantInput.parse(d))
  .handler(async ({ data, context }) => {
    const { patchVariant } = await import("@/lib/social/handoff.server");
    return patchVariant(context.userId, data.variant_id, {
      fields: {
        posted_at: null,
        posted_by: null,
        external_post_url: null,
        confirmation_method: null,
        state: "scheduled",
      },
      eventType: "post_confirmation_undone",
      toState: "scheduled",
    });
  });

export const markVariantSkipped = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => variantInput.parse(d))
  .handler(async ({ data, context }) => {
    const { patchVariant } = await import("@/lib/social/handoff.server");
    return patchVariant(context.userId, data.variant_id, {
      fields: { skipped_at: new Date().toISOString(), state: "canceled" },
      eventType: "skipped",
      toState: "canceled",
    });
  });

export const setNotificationPreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        due_reminders_enabled: z.boolean(),
        lead_minutes: z.number().int().min(0).max(240).default(10),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("notification_preferences").upsert(
      {
        user_id: context.userId,
        due_reminders_enabled: data.due_reminders_enabled,
        lead_minutes: data.lead_minutes,
      },
      { onConflict: "user_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
