import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { campaignCtx, json } from "../campaign.server";

export default defineTool({
  name: "list_publishing_queue",
  title: "List publishing queue",
  description:
    "List Share-Sheet hand-off items: scheduled posts and their per-platform variants with real state (staged, caption copied, handed off, posted, skipped).",
  inputSchema: {
    limit: z.coerce.number().int().min(1).max(100).optional().describe("Maximum posts to return (default 25)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    const { orgId, db } = await campaignCtx(ctx);
    const { data } = await db
      .from("social_posts")
      .select(
        "id, title, state, scheduled_at, timezone, created_at, social_post_variants(id, platform, state, caption, media_url, ready_at, caption_copied_at, handed_off_at, posted_at, external_post_url, skipped_at, last_share_error)",
      )
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(limit ?? 25);

    const posts = (data ?? []).map((p) => ({
      ...p,
      variants: (p.social_post_variants ?? []).map((v) => ({
        ...v,
        status: v.posted_at
          ? "Posted (user confirmed)"
          : v.skipped_at
            ? "Skipped"
            : v.handed_off_at
              ? "Handed off — awaiting confirmation"
              : v.ready_at
                ? "Due"
                : "Staged",
      })),
    }));

    return json(`Found ${posts.length} queued post(s).`, {
      posts,
      note: "Echo Your Influence hands content to the device share sheet. 'Handed off' never means published; only a user confirmation marks a post as posted.",
    });
  },
});
