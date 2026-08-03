import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

const HEYGEN_API = "https://api.heygen.com";
const MIN_CREDITS = 30;

interface HeyGenQuota {
  error: unknown;
  data?: { remaining_quota?: number };
}

async function heygen<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const key = (() => {
    const runtime = globalThis as typeof globalThis & {
      process?: { env?: Record<string, string | undefined> };
    };
    return runtime.process?.env?.HEYGEN_API_KEY;
  })();
  if (!key) throw new ToolError("HEYGEN_API_KEY not configured.");
  const res = await fetch(`${HEYGEN_API}${path}`, {
    ...init,
    headers: {
      "X-Api-Key": key,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new ToolError(`HeyGen ${path} ${res.status}: ${text.slice(0, 300)}`);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ToolError(`HeyGen returned non-JSON from ${path}`);
  }
}

export default defineTool({
  name: "check_credit_balance",
  title: "Check credit balance",
  description: "Check remaining HeyGen credits and current monthly video quota usage.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("You must be signed in to check credits.");
    const supabase = supabaseForUser(ctx);

    const quota = await heygen<HeyGenQuota>("/v2/user/remaining_quota");
    const remaining = quota.data?.remaining_quota ?? 0;

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
        { type: "text", text: `HeyGen credits: ${remaining} (low if below ${MIN_CREDITS})` },
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
