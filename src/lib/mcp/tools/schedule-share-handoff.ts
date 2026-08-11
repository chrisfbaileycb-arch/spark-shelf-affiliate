import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { campaignCtx, describeError, json } from "../campaign.server";

const PLATFORMS = ["tiktok", "instagram", "youtube", "linkedin"] as const;

export default defineTool({
  name: "schedule_share_handoff",
  title: "Schedule a Share-Sheet hand-off",
  description:
    "Queue a rendered Campaign Kit for Share-Sheet hand-off on the chosen platforms at a target time. Creates staged variants only — the user still posts from their device.",
  inputSchema: {
    kit_id: z
      .string()
      .uuid()
      .describe("UUID of the Studio campaign kit (campaigns.id) whose rendered assets should be queued."),
    platforms: z
      .array(z.enum(PLATFORMS))
      .min(1)
      .max(4)
      .describe("Target platforms for the hand-off."),
    scheduled_at: z
      .string()
      .datetime()
      .optional()
      .describe("ISO-8601 UTC target posting time. Omit to queue immediately."),
    timezone: z.string().max(60).optional().describe('IANA timezone label, default "UTC".'),
    confirm: z
      .boolean()
      .optional()
      .describe("Required true. Confirms creating queue items in the user's publishing calendar."),
  },
  annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    const { userId } = await campaignCtx(ctx);
    if (!input.confirm) {
      throw new ToolError(
        "Scheduling writes to the user's publishing calendar. Ask the user to confirm, then call again with confirm=true.",
      );
    }
    const { queueCampaign } = await import("@/lib/social/handoff.server");
    try {
      const result = await queueCampaign(userId, {
        campaign_id: input.kit_id,
        platforms: [...input.platforms],
        scheduled_at: input.scheduled_at ?? null,
        timezone: input.timezone ?? "UTC",
      });
      return json(`Queued ${input.platforms.length} hand-off variant(s).`, {
        ...result,
        note: "Queued for hand-off only. Echo Your Influence does not auto-publish; the user posts from the share sheet and confirms afterwards.",
      });
    } catch (err) {
      throw new ToolError(`Could not queue the hand-off: ${describeError(err)}`);
    }
  },
});
