/**
 * Ayrshare adapter — multi-user SaaS sub-profile model.
 *
 * Architecture (per Ayrshare's official multi-user design):
 *  - The platform owner's Business/Launch API key is server-only (AYRSHARE_API_KEY).
 *  - Each Influencer Echo organization maps to one Ayrshare user sub-profile.
 *  - The sub-profile's Profile Key is a credential: encrypted at rest, never
 *    returned to the browser.
 *  - Social linking uses a short-lived JWT linking URL generated server-side for
 *    that specific sub-profile; the customer authorizes their own accounts via
 *    the hosted page's OAuth. We never collect platform passwords or API keys.
 *
 * Phase 1 is REST-only and staged: without AYRSHARE_API_KEY every network method
 * returns a typed configuration blocker. An Action/MCP agent-directed path can be
 * layered behind this same interface later without touching the domain model.
 */
import {
  validateVariant,
  type AdapterResult,
  type ConnectedAccount,
  type PostVariantInput,
  type PublishState,
  type SocialAdapter,
} from "./adapter";
import type { SocialPlatformId } from "@/lib/integrations/providers";
import { sanitizeError } from "@/lib/integrations/crypto.server";

const API_BASE = "https://api.ayrshare.com/api";

export const AYRSHARE_BLOCKER = "AYRSHARE_API_KEY";

export function ayrshareConfigured(): boolean {
  return Boolean(process.env["AYRSHARE_API_KEY"]);
}

function blocked<T>(): AdapterResult<T> {
  return {
    ok: false,
    blocker: AYRSHARE_BLOCKER,
    message:
      "Live social execution is not configured. Add the Ayrshare Business/Launch API key in Project Settings → Secrets to activate it.",
  };
}

async function call<T>(
  path: string,
  init: { method: string; body?: unknown; profileRef?: string },
): Promise<AdapterResult<T>> {
  const businessKey = process.env["AYRSHARE_API_KEY"];
  if (!businessKey) return blocked<T>();

  const headers: Record<string, string> = {
    Authorization: `Bearer ${businessKey}`,
    "Content-Type": "application/json",
  };
  // Sub-profile scoping: the profile key selects which customer we act as.
  if (init.profileRef) headers["Profile-Key"] = init.profileRef;

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: init.method,
      headers,
      ...(init.body ? { body: JSON.stringify(init.body) } : {}),
    });
    const text = await res.text();
    if (!res.ok) {
      // Never surface the provider body verbatim — it can echo request headers.
      return {
        ok: false,
        blocker: "PROVIDER_ERROR",
        message: sanitizeError(new Error(`Provider request failed (${res.status}). ${text}`)),
      };
    }
    return { ok: true, data: (text ? JSON.parse(text) : {}) as T };
  } catch (err) {
    return { ok: false, blocker: "PROVIDER_ERROR", message: sanitizeError(err) };
  }
}

export const ayrshareAdapter: SocialAdapter = {
  id: "ayrshare",

  async ensureProfile(orgId) {
    if (!ayrshareConfigured()) return blocked();
    const title = `Influencer Echo ${orgId.slice(0, 8)}`;
    const res = await call<{ profileKey?: string; refId?: string }>("/profiles/profile", {
      method: "POST",
      body: { title },
    });
    if (!res.ok) return res;
    const profileRef = res.data.profileKey;
    if (!profileRef) {
      return {
        ok: false,
        blocker: "PROVIDER_ERROR",
        message: "Provider did not return a profile key.",
      };
    }
    return { ok: true, data: { profileRef, title } };
  },

  async linkingUrl(profileRef, platforms) {
    if (!ayrshareConfigured()) return blocked();
    // Ayrshare generates a short-lived JWT-backed hosted linking URL per profile.
    const res = await call<{ url?: string; token?: string; expiresIn?: number }>("/profiles/generateJWT", {
      method: "POST",
      body: { profileKey: profileRef, ...(platforms.length ? { allowedSocial: platforms } : {}) },
    });
    if (!res.ok) return res;
    if (!res.data.url) {
      return {
        ok: false,
        blocker: "PROVIDER_ERROR",
        message: "Provider did not return a linking URL.",
      };
    }
    const ttl = (res.data.expiresIn ?? 300) * 1000;
    return {
      ok: true,
      data: { url: res.data.url, expiresAt: new Date(Date.now() + ttl).toISOString() },
    };
  },

  async listAccounts(profileRef) {
    if (!ayrshareConfigured()) return blocked();
    const res = await call<{ activeSocialAccounts?: string[]; displayNames?: Array<Record<string, unknown>> }>(
      "/user",
      { method: "GET", profileRef },
    );
    if (!res.ok) return res;
    const rows = res.data.displayNames ?? [];
    const accounts: ConnectedAccount[] = rows.map((row) => ({
      platform: String(row["platform"] ?? "") as SocialPlatformId,
      externalAccountId: String(row["id"] ?? row["userId"] ?? row["platform"] ?? ""),
      handle: (row["username"] as string) ?? null,
      displayName: (row["displayName"] as string) ?? null,
      avatarUrl: (row["userImage"] as string) ?? null,
      status: "connected",
      scopes: [],
    }));
    return { ok: true, data: accounts };
  },

  validate(variant: PostVariantInput) {
    return validateVariant(variant);
  },

  async publish(profileRef, variant, idempotencyKey) {
    if (!ayrshareConfigured()) return blocked();
    const issues = validateVariant(variant);
    if (issues.length) {
      return {
        ok: false,
        blocker: "VALIDATION",
        message: issues.map((i) => `${i.field}: ${i.message}`).join(" "),
      };
    }
    const res = await call<{ id?: string; status?: string }>("/post", {
      method: "POST",
      profileRef,
      body: {
        post: variant.caption,
        platforms: [variant.platform],
        ...(variant.mediaUrl ? { mediaUrls: [variant.mediaUrl] } : {}),
        idempotencyKey,
      },
    });
    if (!res.ok) return res;
    const externalId = res.data.id;
    if (!externalId) {
      return { ok: false, blocker: "PROVIDER_ERROR", message: "Provider returned no post id." };
    }
    const state: PublishState = res.data.status === "success" ? "published" : "publishing";
    return { ok: true, data: { externalId, state, raw: res.data } };
  },

  async status(profileRef, externalId) {
    if (!ayrshareConfigured()) return blocked();
    const res = await call<{ status?: string }>(`/history/${encodeURIComponent(externalId)}`, {
      method: "GET",
      profileRef,
    });
    if (!res.ok) return res;
    const state: PublishState =
      res.data.status === "success" ? "published" : res.data.status === "error" ? "failed" : "publishing";
    return { ok: true, data: { state, raw: res.data } };
  },

  async analytics(profileRef, externalId) {
    if (!ayrshareConfigured()) return blocked();
    const res = await call<Record<string, unknown>>("/analytics/post", {
      method: "POST",
      profileRef,
      body: { id: externalId },
    });
    if (!res.ok) return res;
    // Raw payload is preserved verbatim; normalization never claims metrics are
    // equivalent across networks — missing values stay null.
    return { ok: true, data: { raw: res.data, normalized: {} } };
  },

  async unlink(profileRef, externalAccountId) {
    if (!ayrshareConfigured()) return blocked();
    const res = await call<unknown>("/profiles/social", {
      method: "DELETE",
      profileRef,
      body: { platform: externalAccountId },
    });
    if (!res.ok) return res;
    return { ok: true, data: { ok: true } };
  },
};
