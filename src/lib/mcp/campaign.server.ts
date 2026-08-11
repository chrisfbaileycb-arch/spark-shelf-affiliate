/**
 * Shared server-side context for the campaign-spine MCP tools.
 *
 * Tenant isolation: the org is resolved from the verified OAuth user id, never
 * from tool input. The Customer Zero private-beta lock is enforced here too, so
 * an agent cannot reach campaign data a signed-in browser session could not.
 *
 * Import-safe: no env reads or I/O at module scope.
 */
import { ToolError } from "@lovable.dev/mcp-js";
import type { ToolContext } from "@lovable.dev/mcp-js";

export async function campaignCtx(ctx: ToolContext) {
  if (!ctx.isAuthenticated()) {
    throw new ToolError("You must be signed in to Influencer Echo to use this tool.");
  }
  const userId = ctx.getUserId();
  if (!userId) throw new ToolError("No user id on the verified token.");

  const { assertCustomerZero } = await import("@/lib/customer-zero.server");
  const { resolveOrgIdForUser } = await import("@/lib/integrations/orgs.server");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  try {
    await assertCustomerZero(userId);
  } catch {
    throw new ToolError(
      "Campaign tools are in a private Customer Zero beta and this account is not on the allowlist.",
    );
  }

  const orgId = await resolveOrgIdForUser(userId);
  return { userId, orgId, db: supabaseAdmin };
}

/** Loads a workflow the caller's org owns, or throws a clean tool error. */
export async function requireWorkflow(
  db: Awaited<ReturnType<typeof campaignCtx>>["db"],
  orgId: string,
  workflowId: string,
) {
  const { data } = await db
    .from("campaign_workflows")
    .select("id, name, status, current_step, campaign_id, product_id, created_at, updated_at")
    .eq("id", workflowId)
    .eq("org_id", orgId)
    .maybeSingle();
  if (!data) throw new ToolError("Campaign not found for this account.");
  return data;
}

export function json(label: string, payload: unknown) {
  return {
    content: [
      { type: "text" as const, text: label },
      { type: "text" as const, text: JSON.stringify(payload, null, 2) },
    ],
  };
}

export function describeError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
