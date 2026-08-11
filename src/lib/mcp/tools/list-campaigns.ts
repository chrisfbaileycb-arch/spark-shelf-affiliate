import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { campaignCtx, json } from "../campaign.server";

export default defineTool({
  name: "list_campaigns",
  title: "List campaigns",
  description:
    "List the signed-in user's unified campaigns (product brief → strategy → content → outbound → publishing), newest activity first.",
  inputSchema: {
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .describe("Maximum campaigns to return (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    const { orgId, db } = await campaignCtx(ctx);
    const { data } = await db
      .from("campaign_workflows")
      .select("id, name, status, current_step, campaign_id, product_id, created_at, updated_at")
      .eq("org_id", orgId)
      .order("updated_at", { ascending: false })
      .limit(limit ?? 50);
    const steps = [
      "Product brief",
      "Strategy",
      "Content pack",
      "Outbound",
      "Publishing",
      "Analytics",
    ];
    const rows = (data ?? []).map((w) => ({
      ...w,
      step_label: steps[(w.current_step ?? 1) - 1] ?? "Unknown",
    }));
    return json(`Found ${rows.length} campaign(s).`, rows);
  },
});
