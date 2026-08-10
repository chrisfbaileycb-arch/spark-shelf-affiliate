import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "check_credit_balance",
  title: "Check credit balance",
  description: "Check video provider configuration and current monthly video quota usage.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("You must be signed in to check credits.");
    const supabase = supabaseForUser(ctx);

    const { data: sub, error: subErr } = await supabase
      .from("subscriptions")
      .select("status, tier")
      .eq("user_id", ctx.getUserId())
      .maybeSingle();
    if (subErr) throw new ToolError(`Database error: ${subErr.message}`);

    const { data: usage, error: usageErr } = await supabase
      .from("usage_counters")
      .select("videos_used, videos_limit")
      .eq("user_id", ctx.getUserId())
      .maybeSingle();
    if (usageErr) throw new ToolError(`Database error: ${usageErr.message}`);

    return {
      content: [
        { type: "text", text: "Video provider: MiniMax (Hailuo)" },
        {
          type: "text",
          text: `Subscription: ${sub?.status ?? "unknown"} (${sub?.tier ?? "trial"})`,
        },
        {
          type: "text",
          text: `Monthly videos: ${usage?.videos_used ?? 0} / ${usage?.videos_limit ?? 0}`,
        },
      ],
    };
  },
});
