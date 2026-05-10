// Stripe webhook → libera plano automaticamente
import Stripe from "https://esm.sh/stripe@18.5.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, stripe-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");

  // Hard requirement: never process without the verification secret configured
  if (!webhookSecret || !stripeSecret) {
    console.error("[stripe-webhook] missing secret(s); refusing to process");
    return json({ error: "server_misconfigured" }, 500);
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return json({ error: "missing_signature" }, 401);
  }

  const body = await req.text();
  const stripe = new Stripe(stripeSecret, {
    apiVersion: "2025-08-27.basil",
    httpClient: Stripe.createFetchHttpClient(),
  });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
  } catch (err) {
    console.error("[stripe-webhook] signature verification failed");
    return json({ error: "invalid_signature" }, 400);
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id;
      const plan = (session.metadata?.plan ?? "start") as "start" | "pro" | "premium";

      if (userId) {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        );

        const limitMap: Record<string, number | null> = {
          start: 10,
          pro: 50,
          premium: null,
        };

        await supabase.from("subscriptions").upsert(
          {
            user_id: userId,
            plan,
            status: "active",
            videos_used: 0,
            videos_limit: limitMap[plan] ?? 10,
            reset_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          },
          { onConflict: "user_id" },
        );
      }
    }

    return json({ received: true }, 200);
  } catch (e) {
    console.error("[stripe-webhook] handler error");
    return json({ error: "handler_error" }, 500);
  }
});
