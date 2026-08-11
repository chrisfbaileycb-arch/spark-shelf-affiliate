import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { campaignCtx, describeError, json, requireWorkflow } from "../campaign.server";

export default defineTool({
  name: "search_apollo_leads",
  title: "Search Apollo leads",
  description:
    "Search Apollo People (0 Apollo credits, never returns emails) using the account's stored Apollo key. Preview-only by default. Set save=true AND confirm=true to persist the results as leads on the campaign.",
  inputSchema: {
    campaign_id: z.string().uuid().describe("UUID of the campaign workflow."),
    titles: z.array(z.string().max(120)).max(20).optional().describe("Job titles to match."),
    locations: z.array(z.string().max(120)).max(20).optional().describe("Person locations."),
    industries: z.array(z.string().max(120)).max(20).optional().describe("Industry keywords."),
    employee_ranges: z
      .array(z.string().max(30))
      .max(10)
      .optional()
      .describe('Company size ranges, e.g. "11,50".'),
    keywords: z.string().max(300).optional().describe("Free-text keywords."),
    per_page: z.coerce.number().int().min(1).max(25).optional().describe("Results per page (default 10)."),
    save: z.boolean().optional().describe("Persist results as leads instead of previewing."),
    confirm: z
      .boolean()
      .optional()
      .describe("Required true alongside save=true. Confirms a write against the user's Apollo account data."),
  },
  annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: true },
  handler: async (input, ctx) => {
    const { orgId, db } = await campaignCtx(ctx);
    await requireWorkflow(db, orgId, input.campaign_id);

    const filters = {
      titles: input.titles,
      locations: input.locations,
      industries: input.industries,
      employeeRanges: input.employee_ranges,
      keywords: input.keywords,
    };
    const perPage = input.per_page ?? 10;
    const apollo = await import("@/lib/outbound/apollo.server");

    let key: string;
    try {
      key = await apollo.loadApolloKey(orgId);
    } catch (err) {
      throw new ToolError(
        `Apollo is not connected for this account: ${describeError(err)} Add and validate an Apollo key in Settings → Integrations first.`,
      );
    }

    if (!input.save) {
      const res = await apollo.searchPeople(key, filters, 1, perPage);
      return json(`Preview: ${res.people.length} of ${res.total ?? "unknown"} match(es). Nothing saved.`, {
        people: res.people,
        total: res.total,
        disclosure:
          "People Search costs 0 Apollo credits and returns no email or phone. Enrichment is a separate, explicitly confirmed step in the app.",
      });
    }

    if (!input.confirm) {
      throw new ToolError(
        "Saving leads writes to the campaign and calls Apollo on the user's account. Ask the user to confirm, then call again with save=true and confirm=true.",
      );
    }

    const { data: oc } = await db
      .from("outbound_campaigns")
      .select("id")
      .eq("workflow_id", input.campaign_id)
      .eq("org_id", orgId)
      .maybeSingle();
    if (!oc) throw new ToolError("Outbound campaign not found for this campaign.");

    const res = await apollo.searchPeople(key, filters, 1, perPage);
    const rows = res.people.map((p) => ({
      org_id: orgId,
      outbound_campaign_id: oc.id,
      provider: "apollo",
      provider_person_id: p.id,
      dedupe_key: p.id ?? [p.name, p.domain].filter(Boolean).join("|").toLowerCase(),
      full_name: p.name,
      title: p.title,
      company: p.organization,
      company_domain: p.domain,
      linkedin_url: p.linkedin_url,
      location: p.location,
      raw: { source: "mixed_people/api_search", via: "mcp" },
    }));

    if (rows.length) {
      const { error } = await db
        .from("leads")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .upsert(rows as any, {
          onConflict: "outbound_campaign_id,dedupe_key",
          ignoreDuplicates: true,
        });
      if (error) throw new ToolError(`Could not persist leads: ${error.message}`);
    }

    await db
      .from("outbound_campaigns")
      .update({ last_searched_at: new Date().toISOString(), status: "sourcing" })
      .eq("id", oc.id);

    return json(`Saved ${rows.length} lead record(s) to the campaign.`, {
      seen: res.people.length,
      total: res.total,
      note: "Leads carry no email addresses. Enrichment must be confirmed inside the app.",
    });
  },
});
