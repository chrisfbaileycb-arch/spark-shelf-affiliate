import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";
import { PLAN_LIMITS, TIER_LABEL, tierFromLookupKey, type TierId } from "@/lib/plans";


type CheckoutResult = { clientSecret: string } | { error: string };

async function resolveOrCreateCustomer(
  stripe: ReturnType<typeof createStripeClient>,
  opts: { email?: string; userId?: string },
): Promise<string> {
  if (opts.userId && !/^[a-zA-Z0-9_-]+$/.test(opts.userId)) throw new Error("Invalid userId");
  if (opts.userId) {
    const found = await stripe.customers.search({
      query: `metadata['userId']:'${opts.userId}'`,
      limit: 1,
    });
    if (found.data.length) return found.data[0].id;
  }
  if (opts.email) {
    const existing = await stripe.customers.list({ email: opts.email, limit: 1 });
    if (existing.data.length) {
      const c = existing.data[0];
      if (opts.userId && c.metadata?.userId !== opts.userId) {
        await stripe.customers.update(c.id, { metadata: { ...c.metadata, userId: opts.userId } });
      }
      return c.id;
    }
  }
  const created = await stripe.customers.create({
    ...(opts.email && { email: opts.email }),
    ...(opts.userId && { metadata: { userId: opts.userId } }),
  });
  return created.id;
}

export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      priceId: string;
      returnUrl: string;
      environment: StripeEnv;
    }) => {
      if (!/^[a-zA-Z0-9_-]+$/.test(d.priceId)) throw new Error("Invalid priceId");
      return d;
    },
  )
  .handler(async ({ data, context }): Promise<CheckoutResult> => {
    try {
      // Identity always comes from the verified session, never the client payload.
      const userId = context.userId;
      const customerEmail =
        typeof context.claims?.["email"] === "string"
          ? (context.claims["email"] as string)
          : undefined;

      const stripe = createStripeClient(data.environment);
      const prices = await stripe.prices.list({ lookup_keys: [data.priceId] });
      if (!prices.data.length) throw new Error("Price not found");
      const stripePrice = prices.data[0];

      const customerId = await resolveOrCreateCustomer(stripe, {
        ...(customerEmail && { email: customerEmail }),
        userId,
      });

      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: stripePrice.id, quantity: 1 }],
        mode: "subscription",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer: customerId,
        automatic_tax: { enabled: true },
        metadata: { userId },
        subscription_data: { metadata: { userId } },
      });

      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });


export const createPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { returnUrl: string; environment: StripeEnv }) => d)
  .handler(async ({ data, context }): Promise<{ url: string } | { error: string }> => {
    try {
      const stripe = createStripeClient(data.environment);
      const { data: sub } = await context.supabase
        .from("subscriptions")
        .select("stripe_customer_id")
        .eq("user_id", context.userId)
        .maybeSingle();
      if (!sub?.stripe_customer_id) throw new Error("No Stripe customer yet. Subscribe first.");
      const portal = await stripe.billingPortal.sessions.create({
        customer: sub.stripe_customer_id,
        return_url: data.returnUrl,
      });
      return { url: portal.url };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

export const getMySubscription = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const pstart = new Date();
    pstart.setUTCDate(1);
    pstart.setUTCHours(0, 0, 0, 0);
    const pstartStr = pstart.toISOString().slice(0, 10);

    const [{ data: sub }, { data: usage }] = await Promise.all([
      supabase.from("subscriptions").select("*").eq("user_id", userId).maybeSingle(),
      supabase
        .from("usage_counters")
        .select("*")
        .eq("user_id", userId)
        .eq("period_start", pstartStr)
        .maybeSingle(),
    ]);

    const { isOwnerOverride, OWNER_TIER_LABEL } = await import("@/lib/owner-override.server");
    const owner = await isOwnerOverride(userId);

    const tier = (sub?.tier ?? (owner ? "agency" : "trial")) as TierId;
    const limits = PLAN_LIMITS[tier] ?? PLAN_LIMITS.trial;
    const used = usage?.videos_used ?? 0;
    const imagesUsed = usage?.images_used ?? 0;

    return {
      subscription: sub,
      tier,
      tierLabel: owner ? OWNER_TIER_LABEL : (TIER_LABEL[tier] ?? "No plan"),
      status: sub?.status ?? (owner ? "active" : "trialing"),
      ownerOverride: owner,
      used,
      cap: owner ? Number.MAX_SAFE_INTEGER : limits.videos,
      imagesUsed,
      imagesCap: owner ? Number.MAX_SAFE_INTEGER : limits.images,
    };
  });


export const syncSubscriptionFromStripe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { sessionId: string; environment: StripeEnv }) =>
    z
      .object({
        sessionId: z.string().min(1),
        environment: z.enum(["sandbox", "live"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    try {
      const stripe = createStripeClient(data.environment);
      const session = await stripe.checkout.sessions.retrieve(data.sessionId, {
        expand: ["subscription"],
      });
      if (session.metadata?.userId && session.metadata.userId !== context.userId) {
        throw new Error("Session does not belong to current user");
      }
      const sub = session.subscription;
      if (!sub || typeof sub === "string") return { ok: false };

      const item = sub.items.data[0];
      const priceLookup = item?.price?.lookup_key ?? null;
      const tier = tierFromLookupKey(priceLookup) ?? "starter";

      const periodEnd = item?.current_period_end
        ? new Date(item.current_period_end * 1000).toISOString()
        : null;

      const status: "active" | "canceled" | "past_due" | "trialing" =
        sub.status === "active" ||
        sub.status === "trialing" ||
        sub.status === "past_due" ||
        sub.status === "canceled"
          ? sub.status
          : "past_due";

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin
        .from("subscriptions")
        .update({
          tier,
          status,
          stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
          stripe_subscription_id: sub.id,
          current_period_end: periodEnd,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", context.userId);

      return { ok: true, tier };
    } catch (error) {
      return { ok: false, error: getStripeErrorMessage(error) };
    }
  });
