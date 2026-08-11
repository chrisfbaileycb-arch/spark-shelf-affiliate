/**
 * Server-only Apollo.io client.
 *
 * Truth rules encoded here:
 *  - The key always comes from the org's encrypted integration_credentials row.
 *    There is no global APOLLO_API_KEY fallback for customer operations.
 *  - The plaintext key never leaves this module: not in return values, not in
 *    errors, not in logs. Request headers are never logged.
 *  - Search costs 0 credits and returns no emails. Enrichment can consume
 *    credits and is therefore never called from validation or preview paths.
 *
 * Official endpoints used (current, not legacy):
 *   GET  /api/v1/auth/health
 *   GET  /api/v1/users/api_profile
 *   POST /api/v1/mixed_people/api_search      (NOT /mixed_people/search)
 *   POST /api/v1/people/bulk_match            (credit consuming)
 *   POST /api/v1/contacts                     (run_dedupe=true)
 *   POST /api/v1/emailer_campaigns/search
 *   POST /api/v1/sequences
 *   POST /api/v1/emailer_campaigns/:id/add_contact_ids
 *   GET  /api/v1/email_accounts
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { decryptSecret, sanitizeError } from "@/lib/integrations/crypto.server";

const BASE = "https://api.apollo.io";
const TIMEOUT_MS = 20_000;

export type ApolloErrorCode =
  | "no_key"
  | "unauthorized"
  | "forbidden"
  | "rate_limited"
  | "not_found"
  | "invalid_request"
  | "server_error"
  | "network"
  | "timeout";

export class ApolloError extends Error {
  readonly code: ApolloErrorCode;
  readonly status: number | null;
  readonly retryAfterSeconds: number | null;
  constructor(
    code: ApolloErrorCode,
    message: string,
    status: number | null = null,
    retryAfterSeconds: number | null = null,
  ) {
    super(sanitizeError(new Error(message)));
    this.name = "ApolloError";
    this.code = code;
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export interface RateLimitMeta {
  minuteLeft: number | null;
  hourlyLeft: number | null;
  dailyLeft: number | null;
  retryAfterSeconds: number | null;
}

function readRateLimits(h: Headers): RateLimitMeta {
  const num = (v: string | null) => (v == null || v === "" ? null : Number(v));
  return {
    minuteLeft: num(h.get("x-minute-requests-left")),
    hourlyLeft: num(h.get("x-hourly-requests-left")),
    dailyLeft: num(h.get("x-24-hour-requests-left")),
    retryAfterSeconds: num(h.get("retry-after")),
  };
}

export interface ApolloResponse<T> {
  data: T;
  rateLimit: RateLimitMeta;
}

/** Loads and decrypts the org's Apollo key. Never returned to callers. */
export async function loadApolloKey(orgId: string): Promise<string> {
  const { data } = await supabaseAdmin
    .from("integration_credentials")
    .select("ciphertext")
    .eq("org_id", orgId)
    .eq("category", "outbound")
    .eq("provider", "apollo")
    .maybeSingle();
  if (!data?.ciphertext) {
    throw new ApolloError("no_key", "No Apollo API key is saved for this workspace.");
  }
  try {
    return decryptSecret(data.ciphertext);
  } catch {
    throw new ApolloError(
      "no_key",
      "The stored Apollo key could not be decrypted. Re-enter it in Integrations.",
    );
  }
}

async function apolloRequest<T>(
  apiKey: string,
  method: "GET" | "POST",
  path: string,
  init: { query?: Record<string, string>; body?: unknown } = {},
): Promise<ApolloResponse<T>> {
  const url = new URL(`${BASE}${path}`);
  for (const [k, v] of Object.entries(init.query ?? {})) url.searchParams.set(k, v);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      // Headers are constructed here and never logged anywhere.
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === "AbortError") {
      throw new ApolloError("timeout", "Apollo did not respond in time.");
    }
    throw new ApolloError("network", "Could not reach Apollo.");
  }
  clearTimeout(timer);

  const rateLimit = readRateLimits(res.headers);
  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }
  const providerMessage =
    (parsed as { error?: string; error_message?: string; message?: string } | null)?.error ??
    (parsed as { error_message?: string } | null)?.error_message ??
    (parsed as { message?: string } | null)?.message ??
    "";

  if (res.ok) return { data: parsed as T, rateLimit };

  const safe = sanitizeError(new Error(String(providerMessage).slice(0, 200)));
  if (res.status === 401)
    throw new ApolloError("unauthorized", safe || "Apollo rejected the key.", 401);
  if (res.status === 403)
    throw new ApolloError(
      "forbidden",
      safe ||
        "This Apollo key or plan does not have access to that endpoint (some endpoints need a master key).",
      403,
    );
  if (res.status === 404) throw new ApolloError("not_found", safe || "Not found.", 404);
  if (res.status === 429)
    throw new ApolloError(
      "rate_limited",
      safe || "Apollo rate limit reached.",
      429,
      rateLimit.retryAfterSeconds,
    );
  if (res.status >= 500) throw new ApolloError("server_error", "Apollo is unavailable.", res.status);
  throw new ApolloError("invalid_request", safe || `Apollo request failed.`, res.status);
}

// --- Validation (never consumes enrichment credits) -------------------------

export interface ApolloProfile {
  userId: string | null;
  email: string | null;
  name: string | null;
  teamName: string | null;
  creditsUsed: number | null;
  creditsLimit: number | null;
}

export async function validateApolloKey(apiKey: string): Promise<ApolloProfile> {
  await apolloRequest<{ is_logged_in?: boolean }>(apiKey, "GET", "/api/v1/auth/health");

  const profile = await apolloRequest<Record<string, unknown>>(
    apiKey,
    "GET",
    "/api/v1/users/api_profile",
    { query: { include_credit_usage: "true" } },
  ).catch(async (err: unknown) => {
    // include_credit_usage is not available on every plan — retry plain.
    if (err instanceof ApolloError && (err.code === "invalid_request" || err.code === "forbidden")) {
      return apolloRequest<Record<string, unknown>>(apiKey, "GET", "/api/v1/users/api_profile");
    }
    throw err;
  });

  const raw = (profile.data ?? {}) as Record<string, unknown>;
  const user = (raw["user"] ?? raw) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" && v ? v : null);
  const num = (v: unknown) => (typeof v === "number" ? v : null);
  return {
    userId: str(user["id"]),
    email: str(user["email"]),
    name: str(user["name"]) ?? str(user["first_name"]),
    teamName: str((raw["team"] as Record<string, unknown> | undefined)?.["name"]),
    creditsUsed: num(raw["credits_used"]),
    creditsLimit: num(raw["credit_limit"] ?? raw["credits_limit"]),
  };
}

// --- Capability probe -------------------------------------------------------

export type CapabilityState = "supported" | "permission_denied" | "not_tested" | "error";

export interface CapabilityReport {
  id: string;
  label: string;
  state: CapabilityState;
  detail: string;
}

/** Probes only zero-credit endpoints. Enrichment is reported as not_tested. */
export async function probeApolloCapabilities(apiKey: string): Promise<CapabilityReport[]> {
  const out: CapabilityReport[] = [];

  const probe = async (
    id: string,
    label: string,
    run: () => Promise<unknown>,
    okDetail: string,
  ) => {
    try {
      await run();
      out.push({ id, label, state: "supported", detail: okDetail });
    } catch (err) {
      if (err instanceof ApolloError && (err.code === "forbidden" || err.code === "unauthorized")) {
        out.push({
          id,
          label,
          state: "permission_denied",
          detail: err.message || "This key or plan cannot call that endpoint.",
        });
      } else {
        out.push({
          id,
          label,
          state: "error",
          detail: err instanceof Error ? err.message : "Probe failed.",
        });
      }
    }
  };

  await probe(
    "people_search",
    "People API Search",
    () =>
      apolloRequest(apiKey, "POST", "/api/v1/mixed_people/api_search", {
        body: { page: 1, per_page: 1 },
      }),
    "Search returned a result page. Search costs 0 credits and returns no email or phone.",
  );

  await probe(
    "sequences_search",
    "Search sequences",
    () =>
      apolloRequest(apiKey, "POST", "/api/v1/emailer_campaigns/search", {
        body: { page: 1, per_page: 1 },
      }),
    "Sequences are readable with this key.",
  );

  await probe(
    "email_accounts",
    "List sending email accounts",
    () => apolloRequest(apiKey, "GET", "/api/v1/email_accounts"),
    "At least one mailbox lookup succeeded — needed for send_email_from_email_account_id.",
  );

  out.push({
    id: "people_enrichment",
    label: "People enrichment / bulk enrichment",
    state: "not_tested",
    detail:
      "Not probed: enrichment can consume Apollo credits. It is only run from the explicit, confirmed enrichment action.",
  });
  out.push({
    id: "create_contact",
    label: "Create contact (run_dedupe=true)",
    state: "not_tested",
    detail: "Not probed: creating a contact writes to your Apollo account. Verified during the end-to-end test run.",
  });
  out.push({
    id: "create_sequence",
    label: "Create sequence",
    state: "not_tested",
    detail: "Not probed: creating a sequence writes to your Apollo account. Verified during the end-to-end test run.",
  });
  out.push({
    id: "add_to_sequence",
    label: "Add contacts to sequence",
    state: "not_tested",
    detail: "Requires contact IDs, a sequence ID and a sending email account. Verified during the end-to-end test run.",
  });

  return out;
}

// --- Search -----------------------------------------------------------------

export interface ApolloPerson {
  id: string | null;
  name: string | null;
  title: string | null;
  organization: string | null;
  domain: string | null;
  linkedin_url: string | null;
  location: string | null;
}

export interface PeopleSearchFilters {
  titles?: string[];
  locations?: string[];
  industries?: string[];
  employeeRanges?: string[];
  keywords?: string;
}

export async function searchPeople(
  apiKey: string,
  filters: PeopleSearchFilters,
  page: number,
  perPage: number,
): Promise<{ people: ApolloPerson[]; total: number | null; rateLimit: RateLimitMeta }> {
  const body: Record<string, unknown> = { page, per_page: perPage };
  if (filters.titles?.length) body["person_titles"] = filters.titles;
  if (filters.locations?.length) body["person_locations"] = filters.locations;
  if (filters.industries?.length) body["q_organization_keyword_tags"] = filters.industries;
  if (filters.employeeRanges?.length) body["organization_num_employees_ranges"] = filters.employeeRanges;
  if (filters.keywords) body["q_keywords"] = filters.keywords;

  const res = await apolloRequest<{
    people?: Array<Record<string, unknown>>;
    contacts?: Array<Record<string, unknown>>;
    pagination?: { total_entries?: number };
  }>(apiKey, "POST", "/api/v1/mixed_people/api_search", { body });

  const rows = res.data?.people ?? res.data?.contacts ?? [];
  const str = (v: unknown) => (typeof v === "string" && v ? v : null);
  const people: ApolloPerson[] = rows.map((p) => {
    const org = (p["organization"] ?? {}) as Record<string, unknown>;
    return {
      id: str(p["id"]),
      name: str(p["name"]),
      title: str(p["title"]),
      organization: str(org["name"]) ?? str(p["organization_name"]),
      domain: str(org["primary_domain"]) ?? str(org["website_url"]),
      linkedin_url: str(p["linkedin_url"]),
      location:
        [str(p["city"]), str(p["state"]), str(p["country"])].filter(Boolean).join(", ") || null,
    };
  });

  return {
    people,
    total: res.data?.pagination?.total_entries ?? null,
    rateLimit: res.rateLimit,
  };
}

// --- Credit-consuming / writing operations ----------------------------------

export async function bulkEnrichPeople(
  apiKey: string,
  details: Array<{ id?: string | null; name?: string | null; domain?: string | null }>,
): Promise<Array<{ id: string | null; email: string | null; email_status: string | null }>> {
  const res = await apolloRequest<{ matches?: Array<Record<string, unknown>> }>(
    apiKey,
    "POST",
    "/api/v1/people/bulk_match",
    {
      body: {
        reveal_personal_emails: false,
        details: details.map((d) => ({
          id: d.id ?? undefined,
          name: d.name ?? undefined,
          domain: d.domain ?? undefined,
        })),
      },
    },
  );
  const str = (v: unknown) => (typeof v === "string" && v ? v : null);
  return (res.data?.matches ?? []).map((m) => ({
    id: str(m["id"]),
    email: str(m["email"]),
    email_status: str(m["email_status"]),
  }));
}

export async function createContact(
  apiKey: string,
  input: { first_name?: string; last_name?: string; email: string; title?: string; organization_name?: string },
): Promise<{ contactId: string | null }> {
  const res = await apolloRequest<{ contact?: { id?: string } }>(apiKey, "POST", "/api/v1/contacts", {
    body: { ...input, run_dedupe: true },
  });
  return { contactId: res.data?.contact?.id ?? null };
}

export async function listEmailAccounts(
  apiKey: string,
): Promise<Array<{ id: string; email: string | null }>> {
  const res = await apolloRequest<{ email_accounts?: Array<Record<string, unknown>> }>(
    apiKey,
    "GET",
    "/api/v1/email_accounts",
  );
  return (res.data?.email_accounts ?? [])
    .map((a) => ({
      id: String(a["id"] ?? ""),
      email: typeof a["email"] === "string" ? (a["email"] as string) : null,
    }))
    .filter((a) => a.id);
}

export async function listSequences(
  apiKey: string,
): Promise<Array<{ id: string; name: string | null; active: boolean }>> {
  const res = await apolloRequest<{ emailer_campaigns?: Array<Record<string, unknown>> }>(
    apiKey,
    "POST",
    "/api/v1/emailer_campaigns/search",
    { body: { page: 1, per_page: 25 } },
  );
  return (res.data?.emailer_campaigns ?? []).map((s) => ({
    id: String(s["id"] ?? ""),
    name: typeof s["name"] === "string" ? (s["name"] as string) : null,
    active: s["active"] === true,
  }));
}

export async function createSequence(
  apiKey: string,
  name: string,
): Promise<{ sequenceId: string | null }> {
  const res = await apolloRequest<{ emailer_campaign?: { id?: string }; sequence?: { id?: string } }>(
    apiKey,
    "POST",
    "/api/v1/sequences",
    // Customer Zero: remote sequence is created inactive.
    { body: { name, active: false, permissions: "team_can_use" } },
  );
  return { sequenceId: res.data?.emailer_campaign?.id ?? res.data?.sequence?.id ?? null };
}

export async function addContactsToSequence(
  apiKey: string,
  input: { sequenceId: string; contactIds: string[]; emailAccountId: string },
): Promise<{ added: number }> {
  const res = await apolloRequest<{ contacts?: unknown[] }>(
    apiKey,
    "POST",
    `/api/v1/emailer_campaigns/${encodeURIComponent(input.sequenceId)}/add_contact_ids`,
    {
      body: {
        contact_ids: input.contactIds,
        emailer_campaign_id: input.sequenceId,
        send_email_from_email_account_id: input.emailAccountId,
        // Customer Zero: enrollments land paused, never auto-sending.
        sequence_active_in_other_campaigns: false,
        sequence_no_email: true,
      },
    },
  );
  return { added: Array.isArray(res.data?.contacts) ? res.data!.contacts!.length : input.contactIds.length };
}
