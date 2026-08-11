/**
 * Manager / owner override.
 *
 * Lets the operator (and any explicitly listed manager accounts) use the full
 * product without an active paid subscription. Server-only: the browser can
 * never claim this — it is derived from the verified auth user id.
 *
 * OWNER_USER_IDS   comma/space separated auth user ids that are comped.
 *                  When unset, the owner of the oldest organization in the
 *                  project is treated as the operator identity.
 * OWNER_OVERRIDE_MODE  "false" disables the override entirely.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const OWNER_TIER_LABEL = "Owner — comped access";

function overrideEnabled(): boolean {
  const raw = (process.env["OWNER_OVERRIDE_MODE"] ?? "true").trim().toLowerCase();
  return raw !== "false" && raw !== "0" && raw !== "off";
}

function allowlist(): string[] {
  return (process.env["OWNER_USER_IDS"] ?? "")
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

let cachedOwnerId: string | null | undefined;

async function projectOwnerId(): Promise<string | null> {
  if (cachedOwnerId !== undefined) return cachedOwnerId;
  const { data } = await supabaseAdmin
    .from("organizations")
    .select("owner_id, created_at")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  cachedOwnerId = data?.owner_id ?? null;
  return cachedOwnerId;
}

/** True when this account bypasses plan + quota gating. */
export async function isOwnerOverride(userId: string): Promise<boolean> {
  if (!overrideEnabled()) return false;
  const list = allowlist();
  if (list.length > 0) return list.includes(userId);
  return (await projectOwnerId()) === userId;
}

type QuotaResult = { ok: boolean; reason?: string; used?: number; limit?: number } | null;

/**
 * Consumes a metered allowance unless the caller is a comped owner/manager.
 * Returns `{ result, bypassed }` — skip the matching release call when bypassed.
 */
export async function consumeQuotaUnlessOwner(
  userId: string,
  rpc: "consume_video_quota" | "consume_broll_quota" | "consume_image_quota",
  args: Record<string, unknown>,
): Promise<{ result: QuotaResult; bypassed: boolean }> {
  if (await isOwnerOverride(userId)) {
    return { result: { ok: true }, bypassed: true };
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabaseAdmin.rpc as any)(rpc, args);
  if (error) throw new Error((error as { message: string }).message);
  return { result: data as QuotaResult, bypassed: false };
}
