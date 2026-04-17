// Edge Function: metrics-summary
// Agrega métricas reais para o dashboard de performance.
// POST only. Valida JWT do usuário e devolve agregados.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Validar JWT
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) return json(401, { error: "Missing token" });

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userRes } = await userClient.auth.getUser(token);
    if (!userRes?.user?.id) return json(401, { error: "Invalid token" });
    const userId = userRes.user.id;

    // Service role para agregações sem viés de RLS (filtramos por user_id)
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // 1) video_jobs do usuário
    const { data: jobs, error: jobsErr } = await admin
      .from("video_jobs")
      .select("id, status, audio_url, video_url, created_at, updated_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(500);

    if (jobsErr) console.error("[metrics] jobs error", jobsErr.message);

    const allJobs = jobs ?? [];
    const total = allJobs.length;
    const completed = allJobs.filter((j) => j.status === "completed").length;
    const failed = allJobs.filter((j) => j.status === "error" || j.status === "failed").length;
    const processing = allJobs.filter((j) =>
      ["pending", "processing", "started", "generating_script", "generating_voice", "generating_video"].includes(j.status)
    ).length;

    const today = new Date().toISOString().slice(0, 10);
    const last7 = new Date(Date.now() - 7 * 86400000);
    const today_count = allJobs.filter((j) => j.created_at?.startsWith(today)).length;
    const last7_count = allJobs.filter((j) => new Date(j.created_at) >= last7).length;

    // Tempo médio (created_at -> updated_at) para concluídos
    const completedJobs = allJobs.filter((j) => j.status === "completed" && j.updated_at);
    const durations = completedJobs
      .map((j) => {
        const c = new Date(j.created_at).getTime();
        const u = new Date(j.updated_at!).getTime();
        return Math.max(0, (u - c) / 1000);
      })
      .filter((d) => d > 0 && d < 60 * 30); // ignora outliers > 30min
    const avg_duration_sec =
      durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0;

    // 2) Cache de voz — listar bucket audio/voice/cache
    let cache_files = 0;
    let cache_size_kb = 0;
    try {
      const { data: cacheList } = await admin.storage
        .from("audio")
        .list("voice/cache", { limit: 1000 });
      if (cacheList) {
        cache_files = cacheList.length;
        cache_size_kb = Math.round(
          cacheList.reduce((s, f: any) => s + (f?.metadata?.size ?? 0), 0) / 1024
        );
      }
    } catch (e) {
      console.warn("[metrics] cache list skipped", (e as Error).message);
    }

    // 3) Pipeline jobs (V2) por status
    const { data: pjobs } = await admin
      .from("pipeline_jobs")
      .select("status, current_stage, progress")
      .eq("user_id", userId)
      .limit(500);

    const pipeline_total = pjobs?.length ?? 0;
    const pipeline_concluidos = pjobs?.filter((p) => p.status === "concluido").length ?? 0;
    const pipeline_erro = pjobs?.filter((p) => p.status === "erro").length ?? 0;

    const success_rate =
      total > 0 ? Math.round((completed / total) * 100) : 0;

    return json(200, {
      ok: true,
      user_id: userId,
      videos: {
        total,
        completed,
        failed,
        processing,
        today: today_count,
        last_7_days: last7_count,
        success_rate,
        avg_duration_sec,
      },
      voice_cache: {
        files: cache_files,
        size_kb: cache_size_kb,
        size_mb: Math.round((cache_size_kb / 1024) * 10) / 10,
      },
      pipeline_v2: {
        total: pipeline_total,
        concluidos: pipeline_concluidos,
        erro: pipeline_erro,
      },
      generated_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error("[metrics] fatal", (e as Error).message);
    return json(500, { error: (e as Error).message });
  }
});
