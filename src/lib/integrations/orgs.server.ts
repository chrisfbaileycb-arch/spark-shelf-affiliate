// Server-only org resolution. Uses the service-role client after the caller's
// identity has already been verified by requireSupabaseAuth.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/** Returns the caller's personal/primary organization id, provisioning if needed. */
export async function resolveOrgIdForUser(userId: string, displayName?: string): Promise<string> {
  const { data: membership } = await supabaseAdmin
    .from("organization_members")
    .select("org_id, role, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (membership?.org_id) return membership.org_id;

  const { data, error } = await supabaseAdmin.rpc("provision_personal_org", {
    _user_id: userId,
    _name: displayName ? `${displayName}'s workspace` : "My workspace",
  });
  if (error) throw new Error("Could not resolve your workspace.");
  return data as unknown as string;
}

/** Hard ownership check — every service-role write goes through this first. */
export async function assertOrgMember(orgId: string, userId: string): Promise<void> {
  const { data } = await supabaseAdmin
    .from("organization_members")
    .select("id")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) throw new Error("Not authorized for this workspace.");
}
