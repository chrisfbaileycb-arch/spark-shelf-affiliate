import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_affiliate_programs",
  title: "List affiliate programs",
  description: "List the signed-in user's saved affiliate programs and tracking IDs.",
  inputSchema: {
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .describe("Maximum programs to return (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated())
      throw new ToolError("You must be signed in to list affiliate programs.");
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("affiliate_programs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit ?? 50);
    if (error) throw new ToolError(`Database error: ${error.message}`);
    return {
      content: [
        { type: "text", text: `Found ${data?.length ?? 0} affiliate program(s).` },
        { type: "text", text: JSON.stringify(data ?? [], null, 2) },
      ],
    };
  },
});
