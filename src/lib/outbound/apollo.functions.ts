import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Apollo server functions. Every one of these:
 *  - enforces the Customer Zero allowlist,
 *  - loads the org's own encrypted key (no global APOLLO_API_KEY),
 *  - returns sanitized messages only.
 */

/** Steps that must all pass before Apollo may ever be described as Working. */
export const REQUIRED_TEST_STEPS = [
  "key_validated",
  "search_succeeded",
  "lead_persisted",
  "qualified",
  "enrichment_approved_and_succeeded",
  "contact_deduped_or_created",
  "sequence_created_or_selected",
  "enrollment_succeeded",
  "event_sync_verified",
] as const;
export type TestStep = (typeof REQUIRED_TEST_STEPS)[number];

async function ctx(userId: string) {
  const { assertCustomerZero } = await import("@/lib/customer-zero.server");
  const { resolveOrgIdForUser } = await import("@/lib/integrations/orgs.server");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await assertCustomerZero(userId);
  const orgId = await resolveOrgIdForUser(userId);
  return { orgId, db: supabaseAdmin };
}

async function recordStep(orgId: string, step: TestStep, status: "passed" | "failed", detail: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin
    .from("integration_test_runs")
    .insert({ org_id: orgId, provider: "apollo", step, status, detail: detail.slice(0, 500) });
}

function describe(err: unknown): string {
  return err instanceof Error ? err.message : "Unexpected error.";
}

// --- Validation -------------------------------------------------------------

export const validateApolloCredential = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { orgId, db } = await ctx(context.userId);
    const apollo = await import("@/lib/outbound/apollo.server");

    let key: string;
    try {
      key = await apollo.loadApolloKey(orgId);
    } catch (err) {
      return { ok: false as const, blocker: "missing_key", message: describe(err) };
    }

    try {
      const profile = await apollo.validateApolloKey(key);
      await db
        .from("integration_credentials")
        .update({
          status: "connected",
          last_validated_at: new Date().toISOString(),
          last_error: null,
          // Redacted metadata only — no key material, no raw provider payload.
          metadata: {
            apollo_user_id: profile.userId,
            apollo_email: profile.email,
            team: profile.teamName,
            credits_used: profile.creditsUsed,
            credits_limit: profile.creditsLimit,
          },
        })
        .eq("org_id", orgId)
        .eq("category", "outbound")
        .eq("provider", "apollo");
      await recordStep(orgId, "key_validated", "passed", "auth/health + users/api_profile succeeded.");
      return { ok: true as const, profile };
    } catch (err) {
      const message = describe(err);
      await db
        .from("integration_credentials")
        .update({ status: "error", last_error: message, last_validated_at: null })
        .eq("org_id", orgId)
        .eq("category", "outbound")
        .eq("provider", "apollo");
      await recordStep(orgId, "key_validated", "failed", message);
      return { ok: false as const, blocker: "invalid_key", message };
    }
  });

export const probeApolloCapabilities = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { orgId } = await ctx(context.userId);
    const apollo = await import("@/lib/outbound/apollo.server");
    try {
      const key = await apollo.loadApolloKey(orgId);
      return { ok: true as const, capabilities: await apollo.probeApolloCapabilities(key) };
    } catch (err) {
      return { ok: false as const, message: describe(err), capabilities: [] };
    }
  });

/** Apollo status. "working" is derived from the test-run table only. */
export const getApolloStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { orgId, db } = await ctx(context.userId);
    const [{ data: cred }, { data: runs }] = await Promise.all([
      db
        .from("integration_credentials")
        .select("status, masked_hint, last_validated_at, last_error, metadata")
        .eq("org_id", orgId)
        .eq("category", "outbound")
        .eq("provider", "apollo")
        .maybeSingle(),
      db
        .from("integration_test_runs")
        .select("step, status, detail, created_at")
        .eq("org_id", orgId)
        .eq("provider", "apollo")
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

    const latest = new Map<string, { status: string; detail: string | null; created_at: string }>();
    for (const r of runs ?? []) if (!latest.has(r.step)) latest.set(r.step, r);

    const steps = REQUIRED_TEST_STEPS.map((s) => ({
      step: s,
      status: latest.get(s)?.status ?? "not_run",
      detail: latest.get(s)?.detail ?? null,
      at: latest.get(s)?.created_at ?? null,
    }));
    const working = steps.every((s) => s.status === "passed");
    const connected = Boolean(cred?.last_validated_at) && cred?.status === "connected";

    return {
      truthStatus: working ? ("working" as const) : connected ? ("connected" as const) : cred ? ("staged" as const) : ("not_connected" as const),
      maskedHint: cred?.masked_hint ?? null,
      lastValidatedAt: cred?.last_validated_at ?? null,
      lastError: cred?.last_error ?? null,
      metadata: (cred?.metadata ?? {}) as Record<string, string | number | null>,
      steps,
    };
  });

// --- Search + persistence ---------------------------------------------------

const FiltersSchema = z.object({
  titles: z.array(z.string().max(80)).max(10).default([]),
  locations: z.array(z.string().max(80)).max(10).default([]),
  industries: z.array(z.string().max(80)).max(10).default([]),
  employeeRanges: z.array(z.string().max(20)).max(6).default([]),
  keywords: z.string().max(200).default(""),
});

export const saveOutboundFilters = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ workflow_id: z.string().uuid(), filters: FiltersSchema }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { orgId, db } = await ctx(context.userId);
    const { error } = await db
      .from("outbound_campaigns")
      .update({ icp_filters: data.filters })
      .eq("workflow_id", data.workflow_id)
      .eq("org_id", orgId);
    if (error) throw new Error("Could not save the filters.");
    return { ok: true as const };
  });

/** Zero-credit preview. Nothing is persisted, no emails are returned by Apollo. */
export const previewApolloSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ filters: FiltersSchema }).parse(d))
  .handler(async ({ data, context }) => {
    const { orgId } = await ctx(context.userId);
    const apollo = await import("@/lib/outbound/apollo.server");
    try {
      const key = await apollo.loadApolloKey(orgId);
      const res = await apollo.searchPeople(key, data.filters, 1, 10);
      return {
        ok: true as const,
        people: res.people,
        total: res.total,
        rateLimit: res.rateLimit,
        disclosure:
          "People API Search costs 0 Apollo credits and never returns email or phone. Emails only appear after you explicitly approve enrichment, which can consume credits.",
      };
    } catch (err) {
      return { ok: false as const, message: describe(err), people: [], total: null };
    }
  });

/** Persists search results as leads. Repeat searches update, never duplicate. */
export const sourceLeads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        workflow_id: z.string().uuid(),
        filters: FiltersSchema,
        pages: z.number().int().min(1).max(2).default(1),
        perPage: z.number().int().min(1).max(25).default(10),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { orgId, db } = await ctx(context.userId);
    const apollo = await import("@/lib/outbound/apollo.server");

    const { data: oc } = await db
      .from("outbound_campaigns")
      .select("id")
      .eq("workflow_id", data.workflow_id)
      .eq("org_id", orgId)
      .maybeSingle();
    if (!oc) throw new Error("Outbound campaign not found.");

    let key: string;
    try {
      key = await apollo.loadApolloKey(orgId);
    } catch (err) {
      return { ok: false as const, message: describe(err), inserted: 0, seen: 0 };
    }

    let seen = 0;
    const rows: Array<Record<string, unknown>> = [];
    try {
      for (let page = 1; page <= data.pages; page++) {
        const res = await apollo.searchPeople(key, data.filters, page, data.perPage);
        seen += res.people.length;
        for (const p of res.people) {
          const dedupe =
            p.id ??
            [p.name, p.domain].filter(Boolean).join("|").toLowerCase() ??
            crypto.randomUUID();
          rows.push({
            org_id: orgId,
            outbound_campaign_id: oc.id,
            provider: "apollo",
            provider_person_id: p.id,
            dedupe_key: dedupe,
            full_name: p.name,
            title: p.title,
            company: p.organization,
            company_domain: p.domain,
            linkedin_url: p.linkedin_url,
            location: p.location,
            raw: { source: "mixed_people/api_search" },
          });
        }
        if (res.people.length < data.perPage) break;
      }
    } catch (err) {
      await recordStep(orgId, "search_succeeded", "failed", describe(err));
      return { ok: false as const, message: describe(err), inserted: 0, seen };
    }

    const before = (
      await db.from("leads").select("id", { count: "exact", head: true }).eq("outbound_campaign_id", oc.id)
    ).count;

    if (rows.length) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await db.from("leads").upsert(rows as any, {
        onConflict: "outbound_campaign_id,dedupe_key",
        ignoreDuplicates: true,
      });
      if (error) return { ok: false as const, message: "Could not persist leads.", inserted: 0, seen };
    }

    const after = (
      await db.from("leads").select("id", { count: "exact", head: true }).eq("outbound_campaign_id", oc.id)
    ).count;
    const inserted = (after ?? 0) - (before ?? 0);

    await db
      .from("outbound_campaigns")
      .update({ last_searched_at: new Date().toISOString(), status: "sourcing" })
      .eq("id", oc.id);
    await recordStep(orgId, "search_succeeded", "passed", `Search returned ${seen} people.`);
    if ((after ?? 0) > 0) await recordStep(orgId, "lead_persisted", "passed", `${after} leads stored.`);

    return {
      ok: true as const,
      seen,
      inserted,
      total: after ?? 0,
      note: "Search results carry no email addresses. Enrichment is a separate, confirmed step.",
    };
  });

export const qualifyLeads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ workflow_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { orgId, db } = await ctx(context.userId);
    const { qualifyLeadsWithAi, STRATEGY_MODEL } = await import("@/lib/workflows.server");

    const [{ data: strategy }, { data: oc }] = await Promise.all([
      db.from("gtm_strategies").select("icp, positioning").eq("workflow_id", data.workflow_id).maybeSingle(),
      db.from("outbound_campaigns").select("id, qualification_threshold").eq("workflow_id", data.workflow_id).maybeSingle(),
    ]);
    if (!strategy) throw new Error("Generate and approve the strategy first.");
    if (!oc) throw new Error("Outbound campaign not found.");

    const { data: leads } = await db
      .from("leads")
      .select("id, full_name, title, company, company_domain, location")
      .eq("outbound_campaign_id", oc.id)
      .is("qualified_at", null)
      .limit(50);
    if (!leads?.length) return { ok: true as const, scored: 0, note: "No unscored leads." };

    const results = await qualifyLeadsWithAi(
      (strategy.icp ?? {}) as Record<string, string | string[]>,
      strategy.positioning,
      leads,
    );
    const now = new Date().toISOString();
    for (const r of results) {
      await db
        .from("leads")
        .update({
          qualification_score: r.score,
          qualification_reason: r.reason,
          qualification_model: STRATEGY_MODEL,
          qualified_at: now,
          status: r.score >= oc.qualification_threshold ? "qualified" : "rejected",
        })
        .eq("id", r.id)
        .eq("outbound_campaign_id", oc.id);
    }
    if (results.length) await recordStep(orgId, "qualified", "passed", `${results.length} leads scored.`);
    return { ok: true as const, scored: results.length, threshold: oc.qualification_threshold };
  });

/** Credit-consuming. Requires explicit confirmation from the UI. */
export const enrichLeads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        workflow_id: z.string().uuid(),
        leadIds: z.array(z.string().uuid()).min(1).max(25),
        confirmCreditUse: z.literal(true),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { orgId, db } = await ctx(context.userId);
    const apollo = await import("@/lib/outbound/apollo.server");

    const { data: oc } = await db
      .from("outbound_campaigns")
      .select("id")
      .eq("workflow_id", data.workflow_id)
      .eq("org_id", orgId)
      .maybeSingle();
    if (!oc) throw new Error("Outbound campaign not found.");

    const { data: leads } = await db
      .from("leads")
      .select("id, provider_person_id, full_name, company_domain, status")
      .eq("outbound_campaign_id", oc.id)
      .in("id", data.leadIds);
    const eligible = (leads ?? []).filter((l) => l.status !== "rejected");
    if (!eligible.length)
      return { ok: false as const, message: "All selected leads were rejected by qualification.", enriched: 0 };

    try {
      const key = await apollo.loadApolloKey(orgId);
      const matches = await apollo.bulkEnrichPeople(
        key,
        eligible.map((l) => ({ id: l.provider_person_id, name: l.full_name, domain: l.company_domain })),
      );
      let enriched = 0;
      for (let i = 0; i < eligible.length; i++) {
        const m = matches[i];
        if (!m?.email) continue;
        enriched++;
        await db
          .from("leads")
          .update({ email: m.email, email_status: m.email_status, enriched_at: new Date().toISOString() })
          .eq("id", eligible[i]!.id);
      }
      await recordStep(
        orgId,
        "enrichment_approved_and_succeeded",
        enriched > 0 ? "passed" : "failed",
        `${enriched}/${eligible.length} enriched after explicit confirmation.`,
      );
      return { ok: true as const, enriched, attempted: eligible.length };
    } catch (err) {
      const message = describe(err);
      await recordStep(orgId, "enrichment_approved_and_succeeded", "failed", message);
      return { ok: false as const, message, enriched: 0 };
    }
  });

// --- Sequences, contacts, enrollment ---------------------------------------

export const saveSequenceDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        workflow_id: z.string().uuid(),
        name: z.string().trim().min(2).max(120),
        steps: z
          .array(
            z.object({
              step_number: z.number().int().min(1).max(10),
              subject: z.string().max(200),
              body: z.string().max(5000),
              delay_days: z.number().int().min(0).max(60),
            }),
          )
          .min(1)
          .max(10),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { orgId, db } = await ctx(context.userId);
    const { data: oc } = await db
      .from("outbound_campaigns")
      .select("id")
      .eq("workflow_id", data.workflow_id)
      .eq("org_id", orgId)
      .maybeSingle();
    if (!oc) throw new Error("Outbound campaign not found.");

    const { data: existing } = await db
      .from("sequences")
      .select("id")
      .eq("outbound_campaign_id", oc.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    let sequenceId = existing?.id ?? null;
    if (!sequenceId) {
      const { data: created, error } = await db
        .from("sequences")
        .insert({ org_id: orgId, outbound_campaign_id: oc.id, name: data.name, active: false })
        .select("id")
        .single();
      if (error || !created) throw new Error("Could not save the sequence.");
      sequenceId = created.id;
    } else {
      await db.from("sequences").update({ name: data.name }).eq("id", sequenceId);
    }

    for (const s of data.steps) {
      await db.from("sequence_steps").upsert(
        {
          sequence_id: sequenceId,
          org_id: orgId,
          step_number: s.step_number,
          subject: s.subject,
          body: s.body,
          delay_days: s.delay_days,
        },
        { onConflict: "sequence_id,step_number" },
      );
    }
    return { ok: true as const, sequenceId };
  });

export const generateSequenceCopy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ workflow_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { orgId, db } = await ctx(context.userId);
    const { generateSequenceDraft } = await import("@/lib/workflows.server");
    const [{ data: brief }, { data: strategy }] = await Promise.all([
      db.from("product_briefs").select("*").eq("workflow_id", data.workflow_id).eq("org_id", orgId).maybeSingle(),
      db.from("gtm_strategies").select("*").eq("workflow_id", data.workflow_id).eq("org_id", orgId).maybeSingle(),
    ]);
    if (!brief || !strategy) throw new Error("Complete the brief and strategy first.");
    return generateSequenceDraft(
      {
        icp: (strategy.icp ?? {}) as Record<string, string | string[]>,
        positioning: strategy.positioning,
        angles: (strategy.angles as string[]) ?? [],
        pillars: (strategy.pillars as string[]) ?? [],
        objections: (strategy.objections as string[]) ?? [],
        cta: strategy.cta,
      },
      {
        offer: brief.offer,
        audience: brief.audience,
        proof_points: (brief.proof_points as string[]) ?? [],
        constraints: brief.constraints,
      },
    );
  });

export const listApolloSendingOptions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { orgId } = await ctx(context.userId);
    const apollo = await import("@/lib/outbound/apollo.server");
    try {
      const key = await apollo.loadApolloKey(orgId);
      const [accounts, sequences] = await Promise.all([
        apollo.listEmailAccounts(key).catch(() => []),
        apollo.listSequences(key).catch(() => []),
      ]);
      return { ok: true as const, accounts, sequences };
    } catch (err) {
      return { ok: false as const, message: describe(err), accounts: [], sequences: [] };
    }
  });

/** Pushes the locally-saved sequence to Apollo, inactive by default. */
export const pushSequenceToApollo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        workflow_id: z.string().uuid(),
        sequence_id: z.string().uuid(),
        existing_provider_sequence_id: z.string().max(64).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { orgId, db } = await ctx(context.userId);
    const apollo = await import("@/lib/outbound/apollo.server");

    const { data: seq } = await db
      .from("sequences")
      .select("id, name, provider_sequence_id")
      .eq("id", data.sequence_id)
      .eq("org_id", orgId)
      .maybeSingle();
    if (!seq) throw new Error("Sequence not found.");
    if (seq.provider_sequence_id)
      return { ok: true as const, providerSequenceId: seq.provider_sequence_id, reused: true };

    try {
      const key = await apollo.loadApolloKey(orgId);
      const providerSequenceId =
        data.existing_provider_sequence_id ?? (await apollo.createSequence(key, seq.name)).sequenceId;
      if (!providerSequenceId) throw new Error("Apollo did not return a sequence id.");
      await db.from("sequences").update({ provider_sequence_id: providerSequenceId }).eq("id", seq.id);
      await db
        .from("outbound_campaigns")
        .update({ provider_sequence_id: providerSequenceId })
        .eq("workflow_id", data.workflow_id)
        .eq("org_id", orgId);
      await recordStep(orgId, "sequence_created_or_selected", "passed", "Sequence available in Apollo (inactive).");
      return { ok: true as const, providerSequenceId, reused: Boolean(data.existing_provider_sequence_id) };
    } catch (err) {
      const message = describe(err);
      await recordStep(orgId, "sequence_created_or_selected", "failed", message);
      return { ok: false as const, message };
    }
  });

/**
 * Creates Apollo contacts (run_dedupe=true) then adds them to the sequence.
 * Enrollments are recorded paused; nothing is sent without a final confirm.
 */
export const enrollLeads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        workflow_id: z.string().uuid(),
        sequence_id: z.string().uuid(),
        leadIds: z.array(z.string().uuid()).min(1).max(25),
        email_account_id: z.string().min(1).max(64),
        confirmEnroll: z.literal(true),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { orgId, db } = await ctx(context.userId);
    const apollo = await import("@/lib/outbound/apollo.server");

    const { data: seq } = await db
      .from("sequences")
      .select("id, provider_sequence_id")
      .eq("id", data.sequence_id)
      .eq("org_id", orgId)
      .maybeSingle();
    if (!seq?.provider_sequence_id)
      return { ok: false as const, message: "Push the sequence to Apollo before enrolling." };

    const { data: leads } = await db
      .from("leads")
      .select("id, full_name, email, email_status, provider_contact_id, status, company")
      .in("id", data.leadIds)
      .eq("org_id", orgId);

    const sendable = (leads ?? []).filter(
      (l) =>
        l.email &&
        l.status !== "rejected" &&
        l.status !== "unsubscribed" &&
        l.status !== "bounced" &&
        l.status !== "suppressed",
    );
    if (!sendable.length)
      return {
        ok: false as const,
        message: "No eligible leads: they need a verified email and must not be rejected, bounced or unsubscribed.",
      };

    let key: string;
    try {
      key = await apollo.loadApolloKey(orgId);
    } catch (err) {
      return { ok: false as const, message: describe(err) };
    }

    const contactIds: string[] = [];
    for (const lead of sendable) {
      if (lead.provider_contact_id) {
        contactIds.push(lead.provider_contact_id);
        continue;
      }
      const [first, ...rest] = (lead.full_name ?? "").split(" ");
      try {
        const { contactId } = await apollo.createContact(key, {
          first_name: first || undefined,
          last_name: rest.join(" ") || undefined,
          email: lead.email!,
          organization_name: lead.company ?? undefined,
        });
        if (contactId) {
          contactIds.push(contactId);
          await db.from("leads").update({ provider_contact_id: contactId }).eq("id", lead.id);
        }
      } catch (err) {
        await recordStep(orgId, "contact_deduped_or_created", "failed", describe(err));
        return { ok: false as const, message: describe(err) };
      }
    }
    if (!contactIds.length) return { ok: false as const, message: "Apollo returned no contact ids." };
    await recordStep(orgId, "contact_deduped_or_created", "passed", `${contactIds.length} contacts ready (run_dedupe=true).`);

    try {
      await apollo.addContactsToSequence(key, {
        sequenceId: seq.provider_sequence_id,
        contactIds,
        emailAccountId: data.email_account_id,
      });
    } catch (err) {
      await recordStep(orgId, "enrollment_succeeded", "failed", describe(err));
      return { ok: false as const, message: describe(err) };
    }

    for (const lead of sendable) {
      const idempotency_key = `${seq.id}:${lead.id}`;
      await db.from("enrollments").upsert(
        {
          org_id: orgId,
          lead_id: lead.id,
          sequence_id: seq.id,
          idempotency_key,
          // Customer Zero: never auto-active.
          status: "paused",
        },
        { onConflict: "org_id,idempotency_key", ignoreDuplicates: true },
      );
      await db.from("leads").update({ status: "enrolled" }).eq("id", lead.id);
    }
    await db
      .from("outbound_campaigns")
      .update({ email_account_id: data.email_account_id, status: "enrolled" })
      .eq("workflow_id", data.workflow_id)
      .eq("org_id", orgId);
    await recordStep(orgId, "enrollment_succeeded", "passed", `${contactIds.length} contacts added to the sequence (paused).`);

    return {
      ok: true as const,
      enrolled: sendable.length,
      note: "Enrollments are paused for review. Nothing is sent until sending is explicitly resumed in Apollo.",
    };
  });

export const setSendingPaused = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ workflow_id: z.string().uuid(), paused: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { orgId, db } = await ctx(context.userId);
    await db
      .from("outbound_campaigns")
      .update({ sending_paused: data.paused })
      .eq("workflow_id", data.workflow_id)
      .eq("org_id", orgId);
    return { ok: true as const, paused: data.paused };
  });
