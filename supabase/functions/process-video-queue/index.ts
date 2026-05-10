import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Metodo nao permitido" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const queueSecret = Deno.env.get("QUEUE_TRIGGER_SECRET") || "";

  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return json({ error: "Supabase env not configured" }, 500);
  }

  // ─── AUTH: shared queue secret OR admin JWT ─────────────────
  const providedSecret = req.headers.get("x-queue-secret") || "";
  let authorized = false;
  if (queueSecret && providedSecret && providedSecret === queueSecret) {
    authorized = true;
  } else {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (authHeader.startsWith("Bearer ")) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: u } = await userClient.auth.getUser();
      if (u?.user) {
        const adminCheck = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
        const { data: roleRow } = await adminCheck
          .from("user_roles")
          .select("role")
          .eq("user_id", u.user.id)
          .eq("role", "admin")
          .maybeSingle();
        if (roleRow) authorized = true;
      }
    }
  }
  if (!authorized) return json({ error: "Unauthorized" }, 401);

  const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  let maxJobs = 2;
  try {
    const body = await req.json();
    if (typeof body?.maxJobs === "number" && body.maxJobs > 0) {
      maxJobs = Math.min(5, Math.floor(body.maxJobs));
    }
  } catch {
    // ignore body parsing errors
  }

  const { data: jobs, error } = await adminClient
    .from("video_jobs")
    .select("id, image_url, prompt, status")
    .in("status", ["queued", "pending"])
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(maxJobs);

  if (error) {
    return json({ error: error.message }, 500);
  }

  if (!jobs || jobs.length === 0) {
    return json({ processed: 0, message: "Sem jobs pendentes" });
  }

  const results: Array<{ id: string; status: string }> = [];

  for (const job of jobs) {
    try {
      await adminClient
        .from("video_jobs")
        .update({ status: "processing", progress: 5, error: null })
        .eq("id", job.id);

      const response = await fetch(`${supabaseUrl}/functions/v1/generate-video`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageUrl: job.image_url,
          prompt: job.prompt || "",
          createJob: false,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        await adminClient
          .from("video_jobs")
          .update({ status: "failed", progress: 100, error: text || "Falha no processamento" })
          .eq("id", job.id);
        results.push({ id: job.id, status: "failed" });
        continue;
      }

      const payload = await response.json();
      const videoUrl = payload?.videoUrl || payload?.video_url || null;

      if (!videoUrl) {
        await adminClient
          .from("video_jobs")
          .update({ status: "failed", progress: 100, error: "Video vazio" })
          .eq("id", job.id);
        results.push({ id: job.id, status: "failed" });
        continue;
      }

      await adminClient
        .from("video_jobs")
        .update({ status: "completed", progress: 100, video_url: videoUrl, error: null })
        .eq("id", job.id);
      results.push({ id: job.id, status: "completed" });
    } catch (err) {
      await adminClient
        .from("video_jobs")
        .update({ status: "failed", progress: 100, error: err instanceof Error ? err.message : "Erro" })
        .eq("id", job.id);
      results.push({ id: job.id, status: "failed" });
    }

    await delay(400);
  }

  return json({ processed: results.length, results });
});
