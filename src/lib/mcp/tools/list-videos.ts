import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_videos",
  title: "List videos",
  description: "List the signed-in user's generated AI videos, newest first.",
  inputSchema: {
    limit: z.coerce.number().int().min(1).max(100).optional().describe("Maximum videos to return (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("You must be signed in to list videos.");
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("videos")
      .select("id, hook, status, thumbnail_url, created_at, product_id, generation_cost, products(title, source_domain)")
      .order("created_at", { ascending: false })
      .limit(limit ?? 50);
    if (error) throw new ToolError(`Database error: ${error.message}`);
    return {
      content: [
        { type: "text", text: `Found ${data?.length ?? 0} video(s).` },
        { type: "text", text: JSON.stringify(data ?? [], null, 2) },
      ],
    };
  },
});
