/**
 * Customer Zero private-beta lock. Server-enforced — navigation hiding is only
 * cosmetic, every mutation path calls assertCustomerZero().
 *
 * CUSTOMER_ZERO_MODE   "false" disables the lock. Anything else (including
 *                      unset) keeps the lock ON for this stage.
 * CUSTOMER_ZERO_USER_IDS  comma/space separated auth user ids allowed through.
 *                      When unset, the owner of the oldest organization in the
 *                      project is treated as the owner identity.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export function customerZeroEnabled(): boolean {
  const raw = (process.env["CUSTOMER_ZERO_MODE"] ?? "true").trim().toLowerCase();
  return raw !== "false" && raw !== "0" && raw !== "off";
}

function allowlist(): string[] {
  return (process.env["CUSTOMER_ZERO_USER_IDS"] ?? "")
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

export async function isCustomerZero(userId: string): Promise<boolean> {
  const list = allowlist();
  if (list.length > 0) return list.includes(userId);
  return (await projectOwnerId()) === userId;
}

export async function customerZeroState(userId: string) {
  const enabled = customerZeroEnabled();
  const allowed = enabled ? await isCustomerZero(userId) : true;
  return {
    enabled,
    allowed,
    allowlistConfigured: allowlist().length > 0,
    badge: enabled && allowed ? ("Customer Zero — Private Test" as const) : null,
  };
}

export class PrivateBetaError extends Error {
  readonly code = "private_beta";
  constructor() {
    super(
      "Echo Your Influence is in a closed private beta (Customer Zero). This account is not on the allowlist, so campaign and integration actions are disabled.",
    );
    this.name = "PrivateBetaError";
  }
}

/** Call at the top of every campaign/integration mutation handler. */
export async function assertCustomerZero(userId: string): Promise<void> {
  if (!customerZeroEnabled()) return;
  if (!(await isCustomerZero(userId))) throw new PrivateBetaError();
}
