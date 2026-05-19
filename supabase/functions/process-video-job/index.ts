import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

declare const EdgeRuntime: { waitUntil: (promise: Promise<unknown>) => void };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
const pipelineSecret = Deno.env.get("PIPELINE_SECRET") || supabaseServiceRoleKey;

const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, { auth: { persistSession: false } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Metodo nao permitido" }, 405);

  try {
    if (!supabaseUrl || !supabaseServiceRoleKey || !supabaseAnonKey) {
      return json({ error: "Supabase env not configured." }, 500);
    }

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });

    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData?.user) return json({ error: "Unauthorized" }, 401);

    const { jobId, imageUrl, prompt } = await req.json();
    if (!jobId) return json({ error: "jobId obrigatorio" }, 400);

    const { data: job, error: jobError } = await adminClient
      .from("video_jobs")
      .select("id,user_id,metadata")
      .eq("id", jobId)
      .maybeSingle();

    if (jobError || !job?.id) return json({ error: "Job nao encontrado" }, 404);

    if (job.user_id !== authData.user.id) {
      const { data: isAdmin } = await adminClient.rpc("has_role", { _user_id: authData.user.id, _role: "admin" });
      if (!isAdmin) return json({ error: "Forbidden" }, 403);
    }

    await adminClient.from("video_jobs").update({
      status: "pending",
      progress: 0,
      image_url: imageUrl || undefined,
      prompt: prompt ?? undefined,
      video_url: null,
      error: null,
      provider: "native",
      render_mode: "native_pipeline",
      metadata: {
        ...((job.metadata as Record<string, unknown>) || {}),
        pipeline_lock: false,
        requested_by: "process-video-job",
        requested_at: new Date().toISOString(),
      },
    }).eq("id", jobId);

    EdgeRuntime.waitUntil(fetch(`${supabaseUrl}/functions/v1/pipeline-step`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseServiceRoleKey}`,
        "x-pipeline-secret": pipelineSecret,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ jobId, source: "process-video-job" }),
    }));

    return json({ ok: true, accepted: true, id: jobId, status: "pending" }, 202);
  } catch (e) {
    console.error("Error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
