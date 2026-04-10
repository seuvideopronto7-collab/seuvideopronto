import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLAN_MAP: Record<string, { plan: string; limit: number | null }> = {
  prod_UJBDGmPDOnLWTN: { plan: "start", limit: 10 },
  prod_UJBGF9LClWjDMH: { plan: "pro", limit: 50 },
  prod_UJBH0RzegE8HW1: { plan: "premium", limit: null },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData.user?.email) throw new Error("Unauthorized");

    const user = userData.user;
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) {
      // No Stripe customer — ensure free plan in DB
      await syncPlanToDb(supabaseAdmin, user.id, "free", 2);
      return respond({ subscribed: false, plan: "free", videos_limit: 2 });
    }

    const customerId = customers.data[0].id;
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      await syncPlanToDb(supabaseAdmin, user.id, "free", 2);
      return respond({ subscribed: false, plan: "free", videos_limit: 2 });
    }

    const sub = subscriptions.data[0];
    const productId = sub.items.data[0].price.product as string;
    const mapped = PLAN_MAP[productId] || { plan: "free", limit: 2 };
    const endDate = new Date(sub.current_period_end * 1000).toISOString();

    await syncPlanToDb(supabaseAdmin, user.id, mapped.plan, mapped.limit);

    return respond({
      subscribed: true,
      plan: mapped.plan,
      videos_limit: mapped.limit,
      subscription_end: endDate,
      product_id: productId,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

function respond(data: Record<string, unknown>) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}

async function syncPlanToDb(
  admin: ReturnType<typeof createClient>,
  userId: string,
  plan: string,
  limit: number | null,
) {
  const { data: existing } = await admin
    .from("subscriptions")
    .select("id, plan")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    if (existing.plan !== plan) {
      await admin
        .from("subscriptions")
        .update({ plan, videos_limit: limit })
        .eq("user_id", userId);
    }
  } else {
    await admin.from("subscriptions").insert({
      user_id: userId,
      plan,
      videos_limit: limit,
      videos_used: 0,
      status: "active",
    });
  }
}
