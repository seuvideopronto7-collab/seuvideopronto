// Edge Function: metrics-summary (CEO MODE)
// Agrega métricas reais + insights automáticos para o painel executivo.
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

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) return json(401, { error: "Missing token" });

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userRes } = await userClient.auth.getUser(token);
    if (!userRes?.user?.id) return json(401, { error: "Invalid token" });
    const userId = userRes.user.id;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // 1) video_jobs do usuário
    const { data: jobs, error: jobsErr } = await admin
      .from("video_jobs")
      .select("id, status, audio_url, video_url, prompt, created_at, updated_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1000);

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
    const last30 = new Date(Date.now() - 30 * 86400000);
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
      .filter((d) => d > 0 && d < 60 * 30);
    const avg_duration_sec =
      durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0;

    // 2) Cache de voz
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

    // 3) Pipeline V2
    const { data: pjobs } = await admin
      .from("pipeline_jobs")
      .select("id, status")
      .eq("user_id", userId)
      .limit(1000);

    const pipeline_total = pjobs?.length ?? 0;
    const pipeline_concluidos = pjobs?.filter((p) => p.status === "concluido").length ?? 0;
    const pipeline_erro = pjobs?.filter((p) => p.status === "erro").length ?? 0;

    const success_rate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // ========== CEO MODE ==========

    // 📈 Vídeos por dia (últimos 30 dias)
    const byDay: Record<string, { date: string; total: number; completed: number }> = {};
    // Inicializa todos os 30 dias com 0 (gráfico mais bonito)
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      byDay[d] = { date: d, total: 0, completed: 0 };
    }
    allJobs
      .filter((j) => new Date(j.created_at) >= last30)
      .forEach((j) => {
        const d = j.created_at.slice(0, 10);
        if (!byDay[d]) byDay[d] = { date: d, total: 0, completed: 0 };
        byDay[d].total++;
        if (j.status === "completed") byDay[d].completed++;
      });
    const videos_per_day = Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date));

    // 🎤 Provider breakdown (heurística: prompt contém marcador ou audio_url tem padrão)
    const provider_count = { elevenlabs: 0, openai: 0, webspeech: 0, cache: 0 };
    allJobs.forEach((j) => {
      const url = (j.audio_url || "").toLowerCase();
      if (url.includes("voice/cache/")) provider_count.cache++;
      else if (url.includes("elevenlabs") || url.includes("voice/eleven")) provider_count.elevenlabs++;
      else if (url.includes("openai") || url.includes("voice/openai")) provider_count.openai++;
      else if (url) provider_count.webspeech++;
    });

    // ⚠️ Erros por etapa via job_logs (pipeline_jobs do usuário)
    const errors_by_step: Record<string, number> = {};
    try {
      if ((pjobs?.length ?? 0) > 0) {
        const jobIds = pjobs!.map((p) => p.id);
        const { data: logs } = await admin
          .from("job_logs")
          .select("stage, level")
          .in("job_id", jobIds)
          .eq("level", "error")
          .limit(500);
        logs?.forEach((l: any) => {
          errors_by_step[l.stage] = (errors_by_step[l.stage] || 0) + 1;
        });
      }
    } catch (e) {
      console.warn("[metrics] job_logs skipped", (e as Error).message);
    }

    // 🧠 Insights automáticos
    const insights: { level: "info" | "warning" | "danger" | "success"; text: string }[] = [];
    if (total === 0) {
      insights.push({ level: "info", text: "🎬 Bem-vindo! Gere seu primeiro vídeo para ativar o painel CEO." });
    } else {
      if (success_rate < 70 && total >= 3) {
        insights.push({ level: "warning", text: "⚠️ Taxa de sucesso abaixo de 70%. Verifique provedores de voz/render." });
      }
      if (success_rate >= 90 && total >= 5) {
        insights.push({ level: "success", text: "🚀 Sistema saudável! Taxa de sucesso acima de 90%." });
      }
      if (avg_duration_sec > 120) {
        insights.push({ level: "warning", text: "🐢 Tempo médio de geração alto (>2min). Possível gargalo no render." });
      }
      if (failed > completed && total >= 3) {
        insights.push({ level: "danger", text: "🚨 Mais falhas do que sucessos. Sistema instável — investigar urgente." });
      }
      if (cache_files > 200) {
        insights.push({ level: "warning", text: "🧠 Cache acima de 200 arquivos. Considere limpeza automática." });
      }
      if (today_count === 0 && total > 0) {
        insights.push({ level: "info", text: "📉 Nenhum vídeo gerado hoje. Hora de criar conteúdo novo." });
      }
      if (provider_count.cache > 0 && total > 0) {
        const cachePct = Math.round((provider_count.cache / total) * 100);
        if (cachePct >= 30) {
          insights.push({ level: "success", text: `💰 ${cachePct}% das gerações usaram cache — economia ativa!` });
        }
      }
      const totalErrors = Object.values(errors_by_step).reduce((a, b) => a + b, 0);
      if (totalErrors > 0) {
        const worst = Object.entries(errors_by_step).sort((a, b) => b[1] - a[1])[0];
        if (worst) insights.push({ level: "warning", text: `🔧 Etapa "${worst[0]}" concentra ${worst[1]} erro(s). Foque aí.` });
      }
    }

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
      ceo: {
        videos_per_day,
        provider_count,
        errors_by_step,
        insights,
      },
      generated_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error("[metrics] fatal", (e as Error).message);
    return json(500, { error: (e as Error).message });
  }
});
