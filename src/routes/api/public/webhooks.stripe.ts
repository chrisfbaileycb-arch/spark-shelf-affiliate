import { createFileRoute } from "@tanstack/react-router";
import type Stripe from "stripe";
import { createStripeClient, getWebhookSecret, type StripeEnv } from "@/lib/stripe.server";

function tierFromLookupKey(key: string | null | undefined): "starter" | "pro" | null {
  if (key === "starter_monthly") return "starter";
  if (key === "pro_monthly") return "pro";
  return null;
}

export const Route = createFileRoute("/api/public/webhooks/stripe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const envParam = url.searchParams.get("env");
        const env: StripeEnv = envParam === "live" ? "live" : "sandbox";

        const signature = request.headers.get("stripe-signature");
        if (!signature) return new Response("Missing signature", { status: 400 });

        const body = await request.text();
        const stripe = createStripeClient(env);
        const secret = getWebhookSecret(env);

        let event: Stripe.Event;
        try {
          event = await stripe.webhooks.constructEventAsync(body, signature, secret);
        } catch (err) {
          return new Response(`Invalid signature: ${(err as Error).message}`, { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        try {
          if (event.type === "checkout.session.completed" || event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
            let sub: Stripe.Subscription | null = null;
            let userId: string | undefined;

            if (event.type === "checkout.session.completed") {
              const session = event.data.object as Stripe.Checkout.Session;
              userId = session.metadata?.userId;
              if (session.subscription) {
                const id = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
                sub = await stripe.subscriptions.retrieve(id);
              }
            } else {
              sub = event.data.object as Stripe.Subscription;
              userId = sub.metadata?.userId;
            }

            if (sub && userId) {
              const item = sub.items.data[0];
              const tier = tierFromLookupKey(item?.price?.lookup_key) ?? "starter";
              const periodEnd = item?.current_period_end ? new Date(item.current_period_end * 1000).toISOString() : null;
              await supabaseAdmin.from("subscriptions").update({
                tier,
                status: sub.status,
                stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
                stripe_subscription_id: sub.id,
                current_period_end: periodEnd,
                updated_at: new Date().toISOString(),
              }).eq("user_id", userId);
            }
          } else if (event.type === "customer.subscription.deleted") {
            const sub = event.data.object as Stripe.Subscription;
            const userId = sub.metadata?.userId;
            if (userId) {
              await supabaseAdmin.from("subscriptions").update({
                status: "canceled",
                updated_at: new Date().toISOString(),
              }).eq("user_id", userId);
            }
          }
        } catch (err) {
          console.error("[stripe webhook] handler error", err);
          return new Response(`Handler error: ${(err as Error).message}`, { status: 500 });
        }

        return new Response("ok");
      },
    },
  },
});
