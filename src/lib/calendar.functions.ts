import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface PlatformPlanRow {
  platform: string;
  hook: string;
  script: string;
  caption: string;
  hashtags: string[];
  format_note: string;
  posting_tip: string;
}

export interface CalendarSlot {
  id: string;
  plan_date: string;
  slot_time: string;
  title: string;
  engine: string;
  platforms: string[];
  hook: string;
  script: string;
  video_prompt: string;
  image_prompt: string;
  caption: string;
  hashtags: string[];
  disclosure: string;
  notes: string;
  status: string;
  product_id: string | null;
  campaign_id: string | null;
  post_id: string | null;
  generated_at: string | null;
  model: string | null;
  platform_plans: PlatformPlanRow[];
}

const SELECT =
  "id, plan_date, slot_time, title, engine, platforms, hook, script, video_prompt, image_prompt, caption, hashtags, disclosure, notes, status, product_id, campaign_id, post_id, generated_at, model, platform_plans";

const ISO_DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const ENGINE = z.enum(["avatar", "broll", "image"]);
const PLATFORM = z.enum(["tiktok", "instagram", "youtube", "facebook", "linkedin"]);
const STATUS = z.enum(["planned", "prompted", "generated", "queued", "posted"]);

async function ctx(userId: string) {
  const { assertCustomerZero } = await import("@/lib/customer-zero.server");
  const { resolveOrgIdForUser } = await import("@/lib/integrations/orgs.server");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await assertCustomerZero(userId);
  const orgId = await resolveOrgIdForUser(userId);
  return { orgId, db: supabaseAdmin };
}

function normalize(row: Record<string, unknown>): CalendarSlot {
  return {
    ...(row as unknown as CalendarSlot),
    platforms: Array.isArray(row["platforms"]) ? (row["platforms"] as string[]) : [],
    hashtags: Array.isArray(row["hashtags"]) ? (row["hashtags"] as string[]) : [],
    platform_plans: Array.isArray(row["platform_plans"])
      ? (row["platform_plans"] as PlatformPlanRow[])
      : [],
    slot_time: String(row["slot_time"] ?? "09:00").slice(0, 5),
  };
}

/** Reads only real rows for the signed-in org. Nothing is seeded. */
export const listCalendarSlots = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ start: ISO_DATE, end: ISO_DATE }).parse(d))
  .handler(async ({ data, context }): Promise<CalendarSlot[]> => {
    const { orgId, db } = await ctx(context.userId);
    const { data: rows, error } = await db
      .from("calendar_slots")
      .select(SELECT)
      .eq("org_id", orgId)
      .gte("plan_date", data.start)
      .lte("plan_date", data.end)
      .order("plan_date", { ascending: true })
      .order("slot_time", { ascending: true });
    if (error) throw new Error("Could not load the calendar.");
    return (rows ?? []).map((r) => normalize(r as Record<string, unknown>));
  });

export const getDaySlots = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ date: ISO_DATE }).parse(d))
  .handler(async ({ data, context }): Promise<CalendarSlot[]> => {
    const { orgId, db } = await ctx(context.userId);
    const { data: rows, error } = await db
      .from("calendar_slots")
      .select(SELECT)
      .eq("org_id", orgId)
      .eq("plan_date", data.date)
      .order("slot_time", { ascending: true });
    if (error) throw new Error("Could not load this day.");
    return (rows ?? []).map((r) => normalize(r as Record<string, unknown>));
  });

export const createCalendarSlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        plan_date: ISO_DATE,
        slot_time: z.string().regex(/^\d{2}:\d{2}$/).default("09:00"),
        title: z.string().trim().max(140).default(""),
        engine: ENGINE.default("avatar"),
        platforms: z.array(PLATFORM).max(5).default(["tiktok"]),
        product_id: z.string().uuid().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const { orgId, db } = await ctx(context.userId);
    const { data: row, error } = await db
      .from("calendar_slots")
      .insert({
        org_id: orgId,
        created_by: context.userId,
        plan_date: data.plan_date,
        slot_time: data.slot_time,
        title: data.title,
        engine: data.engine,
        platforms: data.platforms,
        product_id: data.product_id ?? null,
      })
      .select("id")
      .single();
    if (error || !row) throw new Error("Could not add this slot.");
    return { id: row.id };
  });

export const updateCalendarSlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        plan_date: ISO_DATE.optional(),
        slot_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
        title: z.string().trim().max(140).optional(),
        engine: ENGINE.optional(),
        platforms: z.array(PLATFORM).max(5).optional(),
        hook: z.string().max(300).optional(),
        script: z.string().max(4000).optional(),
        video_prompt: z.string().max(4000).optional(),
        image_prompt: z.string().max(4000).optional(),
        caption: z.string().max(2000).optional(),
        hashtags: z.array(z.string().max(60)).max(6).optional(),
        disclosure: z.string().max(300).optional(),
        notes: z.string().max(2000).optional(),
        status: STATUS.optional(),
        product_id: z.string().uuid().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { orgId, db } = await ctx(context.userId);
    const { id, ...patch } = data;
    const { error } = await db
      .from("calendar_slots")
      .update(patch)
      .eq("id", id)
      .eq("org_id", orgId);
    if (error) throw new Error("Could not save this slot.");
    return { ok: true };
  });

export const deleteCalendarSlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { orgId, db } = await ctx(context.userId);
    const { error } = await db.from("calendar_slots").delete().eq("id", data.id).eq("org_id", orgId);
    if (error) throw new Error("Could not remove this slot.");
    return { ok: true };
  });

/** Writes prompt fields for one slot using the product + notes already stored. */
export const generateSlotPrompt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<CalendarSlot> => {
    const { orgId, db } = await ctx(context.userId);
    const { generateDayPrompt, CALENDAR_PROMPT_MODEL } = await import("@/lib/calendar.server");

    const { data: row } = await db
      .from("calendar_slots")
      .select(SELECT)
      .eq("id", data.id)
      .eq("org_id", orgId)
      .maybeSingle();
    if (!row) throw new Error("That calendar slot no longer exists.");

    let product: {
      title: string;
      description: string | null;
      price: string | null;
      source_url: string;
      campaign_mode: string | null;
    } | null = null;
    if (row.product_id) {
      const { data: p } = await db
        .from("products")
        .select("title, description, price, source_url, campaign_mode")
        .eq("id", row.product_id)
        .maybeSingle();
      product = p ?? null;
    }

    const { data: profile } = await db
      .from("profiles")
      .select("influencer_style")
      .eq("id", context.userId)
      .maybeSingle();

    const { campaignMode } = await import("@/lib/campaign-modes");
    const mode = campaignMode(product?.campaign_mode);

    const out = await generateDayPrompt({
      plan_date: row.plan_date,
      engine: row.engine,
      platforms: Array.isArray(row.platforms) ? (row.platforms as string[]) : ["tiktok"],
      title: row.title ?? "",
      notes: row.notes ?? "",
      product_title: product?.title ?? null,
      product_description: product?.description ?? null,
      product_price: product?.price ?? null,
      product_url: product?.source_url ?? null,
      creator_tone: profile?.influencer_style ?? null,
      campaign_mode: mode.id,
      mode_label: mode.label,
      mode_angle: mode.angle,
      affiliate: mode.disclosureRule === "affiliate",
    });


    const { data: saved, error } = await db
      .from("calendar_slots")
      .update({
        hook: out.hook,
        script: out.script,
        video_prompt: out.video_prompt,
        image_prompt: out.image_prompt,
        caption: out.caption,
        hashtags: out.hashtags,
        disclosure: out.disclosure,
        status: row.status === "planned" ? "prompted" : row.status,
        generated_at: new Date().toISOString(),
        model: CALENDAR_PROMPT_MODEL,
      })
      .eq("id", data.id)
      .eq("org_id", orgId)
      .select(SELECT)
      .single();
    if (error || !saved) throw new Error("The prompt was generated but could not be saved.");
    return normalize(saved as Record<string, unknown>);
  });

export const listCalendarProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(
    async ({
      context,
    }): Promise<Array<{ id: string; title: string; campaign_mode: string | null }>> => {
      const { db } = await ctx(context.userId);
      const { data } = await db
        .from("products")
        .select("id, title, campaign_mode")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: false })
        .limit(100);
      return data ?? [];
    },
  );

