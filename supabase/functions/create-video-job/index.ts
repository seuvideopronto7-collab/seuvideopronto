import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

declare const EdgeRuntime: { waitUntil: (promise: Promise<unknown>) => void };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
const pipelineSecret = Deno.env.get("PIPELINE_SECRET") || supabaseServiceRoleKey;

const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false },
});

const getNextResetDate = () => {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
  return next.toISOString();
};

const resolvePlanConfig = (plan?: string) => {
  const normalized = (plan || "free").toLowerCase();
  if (normalized === "premium") return { plan: "premium", limit: null, priority: 3 };
  if (normalized === "pro") return { plan: "pro", limit: 20, priority: 2 };
  return { plan: "free", limit: 2, priority: 1 };
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Metodo nao permitido" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    if (!supabaseUrl || !supabaseServiceRoleKey || !supabaseAnonKey) {
      return new Response(JSON.stringify({ error: "Supabase env not configured." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });

    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { imageUrl, prompt } = await req.json();
    if (!imageUrl) {
      return new Response(JSON.stringify({ error: "imageUrl requerido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: existingSub, error: subError } = await adminClient
      .from("subscriptions")
      .select("id, plan, videos_limit, videos_used, reset_date, status")
      .eq("user_id", authData.user.id)
      .maybeSingle();

    if (subError) throw subError;

    const planConfig = resolvePlanConfig(existingSub?.plan || "free");
    let subscription = existingSub;

    if (!subscription) {
      const { data: created, error: createSubError } = await adminClient
        .from("subscriptions")
        .insert({
          user_id: authData.user.id,
          plan: planConfig.plan,
          videos_limit: planConfig.limit,
          videos_used: 0,
          reset_date: getNextResetDate(),
          status: "active",
        })
        .select("id, plan, videos_limit, videos_used, reset_date, status")
        .single();
      if (createSubError) throw createSubError;
      subscription = created;
    }

    if (subscription?.reset_date && new Date(subscription.reset_date).getTime() <= Date.now()) {
      const { data: resetSub, error: resetError } = await adminClient
        .from("subscriptions")
        .update({ videos_used: 0, reset_date: getNextResetDate() })
        .eq("user_id", authData.user.id)
        .select("id, plan, videos_limit, videos_used, reset_date, status")
        .single();
      if (resetError) throw resetError;
      subscription = resetSub;
    }

    const resolvedLimit = subscription?.videos_limit ?? planConfig.limit;
    if (resolvedLimit !== null && subscription && subscription.videos_used >= resolvedLimit) {
      return new Response(JSON.stringify({ error: "Limite diário de vídeos atingido." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (subscription) {
      const { error: consumeError } = await adminClient
        .from("subscriptions")
        .update({ videos_used: (subscription.videos_used || 0) + 1 })
        .eq("user_id", authData.user.id);
      if (consumeError) throw consumeError;
    }

    const { data, error } = await adminClient
      .from("video_jobs")
      .insert({
        user_id: authData.user.id,
        status: "pending",
        progress: 0,
        image_url: imageUrl,
        prompt: prompt ?? null,
        video_url: null,
        audio_url: null,
        error: null,
        provider: "native",
        render_mode: "native_pipeline",
        metadata: {
          pipeline_lock: false,
          priority: resolvePlanConfig(subscription?.plan || "free").priority,
          requested_at: new Date().toISOString(),
        },
      })
      .select("id")
      .single();

    if (error) throw error;

    EdgeRuntime.waitUntil(fetch(`${supabaseUrl}/functions/v1/pipeline-step`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseServiceRoleKey}`,
        "x-pipeline-secret": pipelineSecret,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ jobId: data.id, source: "create-video-job" }),
    }));

    return new Response(JSON.stringify({ id: data.id, status: "pending", accepted: true }), {
      status: 202,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
