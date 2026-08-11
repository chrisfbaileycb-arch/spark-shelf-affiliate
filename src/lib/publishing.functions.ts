import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type QueueVariant = {
  id: string;
  platform: string;
  state: string;
  caption: string;
  platform_title: string | null;
  permalink: string | null;
  last_error: string | null;
  attempts: number;
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
  liveExecutionEnabled: boolean;
  autopublishEnabled: boolean;
  testPostPassedAt: string | null;
};

/** Reads only real rows. There is no sample or seeded data behind this. */
export const getPublishingQueue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PublishingQueue> => {
    const { resolveOrgIdForUser } = await import("@/lib/integrations/orgs.server");
    const { ayrshareConfigured } = await import("@/lib/social/ayrshare.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const orgId = await resolveOrgIdForUser(context.userId);

    const [postsRes, settingsRes] = await Promise.all([
      supabaseAdmin
        .from("social_posts")
        .select(
          "id, title, state, scheduled_at, timezone, created_at, social_post_variants(id, platform, state, caption, platform_title, permalink, last_error, attempts)",
        )
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(100),
      supabaseAdmin
        .from("org_settings")
        .select("social_dry_run, autopublish_enabled, test_post_passed_at")
        .eq("org_id", orgId)
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

    const dryRun = settingsRes.data?.social_dry_run ?? true;

    return {
      posts,
      liveExecutionEnabled: ayrshareConfigured() && !dryRun,
      autopublishEnabled: settingsRes.data?.autopublish_enabled ?? false,
      testPostPassedAt: settingsRes.data?.test_post_passed_at ?? null,
    };
  });
