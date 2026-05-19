import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-pipeline-secret",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PIPELINE_SECRET = Deno.env.get("PIPELINE_SECRET") || SERVICE_KEY;

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const STEP_TIMEOUT_MS = 5 * 60 * 1000;

type JobRow = {
  id: string;
  user_id: string | null;
  status: string;
  image_url: string | null;
  prompt: string | null;
  scenes: any;
  images: any;
  audio_url: string | null;
  video_url: string | null;
  metadata: Record<string, any>;
  updated_at: string;
};

const log = (event: string, payload: Record<string, unknown> = {}) =>
  console.log(`[PIPELINE] ${event}`, JSON.stringify(payload));

async function updateJob(id: string, patch: Record<string, unknown>) {
  const { error } = await admin.from("video_jobs").update(patch).eq("id", id);
  if (error) log("DB_UPDATE_FAILED", { id, error: error.message });
}

/** Fire-and-forget self invoke — não aguarda resposta para evitar stack recursion. */
function chainNext(jobId: string) {
  const url = `${SUPABASE_URL}/functions/v1/pipeline-step`;
  fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_KEY}`,
      "x-pipeline-secret": PIPELINE_SECRET,
    },
    body: JSON.stringify({ jobId, chained: true }),
  }).catch((e) => log("CHAIN_FETCH_FAILED", { jobId, error: String(e) }));
}

async function invokeFn(name: string, body: Record<string, unknown>) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: any = null;
  try { data = JSON.parse(text); } catch { /* raw */ }
  return { ok: res.ok, status: res.status, data, raw: text };
}

// ─── Step implementations ───
async function stepGeneratePrompt(job: JobRow) {
  if (job.prompt && job.prompt.trim().length > 0) return;
  await updateJob(job.id, { prompt: job.prompt || "Vídeo cinematográfico vertical 9:16" });
}

async function stepGenerateScript(job: JobRow) {
  const r = await invokeFn("generate-script-v2", { prompt: job.prompt, jobId: job.id });
  const script = r.data?.script || r.data?.scenes || null;
  if (script) {
    const scenes = Array.isArray(script) ? script : r.data?.scenes || [];
    await updateJob(job.id, { scenes: scenes.length ? scenes : job.scenes || [] });
  }
}

async function stepGenerateImages(job: JobRow) {
  if (job.image_url && (!Array.isArray(job.images) || job.images.length === 0)) {
    await updateJob(job.id, { images: [job.image_url] });
  }
}

async function stepGenerateAudio(job: JobRow) {
  if (job.audio_url) return;
  const r = await invokeFn("generate-voiceover-v2", { jobId: job.id, text: job.prompt });
  const audio = r.data?.audioUrl || r.data?.audio_url || null;
  if (audio) await updateJob(job.id, { audio_url: audio });
}

async function stepRenderVideo(job: JobRow) {
  const r = await invokeFn("video-pipeline", { jobId: job.id, imageUrl: job.image_url, prompt: job.prompt });
  const video = r.data?.videoUrl || r.data?.video_url || null;
  if (video) await updateJob(job.id, { video_url: video });
}

async function stepUpload(job: JobRow) {
  if (!job.video_url) throw new Error("upload sem video_url");
}

// ─── Orchestrator core ─────────────────────────────────────────────
const NEXT: Record<string, string> = {
  pending: "generating_prompt",
  generating_prompt: "script_ready",
  script_ready: "generating_images",
  generating_images: "generating_audio",
  generating_audio: "rendering",
  rendering: "uploading",
  uploading: "completed",
};

const RUNNER: Record<string, (j: JobRow) => Promise<void>> = {
  pending: stepGeneratePrompt,
  generating_prompt: stepGenerateScript,
  script_ready: stepGenerateImages,
  generating_images: stepGenerateAudio,
  generating_audio: stepRenderVideo,
  rendering: stepUpload,
};

const TERMINAL = new Set(["completed", "done", "failed", "error", "fallback_completed"]);

async function processOne(jobId: string) {
  const { data: job, error } = await admin
    .from("video_jobs")
    .select("id,user_id,status,image_url,prompt,scenes,images,audio_url,video_url,metadata,updated_at")
    .eq("id", jobId)
    .maybeSingle();
  if (error || !job) return { ok: false, reason: "JOB_NOT_FOUND" };
  const j = job as JobRow;

  if (TERMINAL.has(j.status)) return { ok: true, reason: "TERMINAL" };

  const meta = j.metadata || {};
  const lockedAt = meta.pipeline_locked_at ? Date.parse(meta.pipeline_locked_at) : 0;
  if (meta.pipeline_lock && Date.now() - lockedAt < STEP_TIMEOUT_MS) {
    log("PIPELINE_STEP_LOCKED", { jobId, status: j.status });
    return { ok: false, reason: "LOCKED" };
  }

  const runner = RUNNER[j.status];
  if (!runner) {
    log("PIPELINE_STEP_UNKNOWN", { jobId, status: j.status });
    await updateJob(jobId, {
      status: "failed",
      error: `unknown_status:${j.status}`,
      metadata: { ...meta, pipeline_lock: false },
    });
    return { ok: false, reason: "UNKNOWN_STATUS" };
  }

  await updateJob(jobId, {
    metadata: {
      ...meta,
      pipeline_lock: true,
      pipeline_locked_at: new Date().toISOString(),
      current_step: j.status,
    },
  });

  log("PIPELINE_STEP_STARTED", { jobId, step: j.status });
  const startedAt = Date.now();

  try {
    await Promise.race([
      runner(j),
      new Promise((_, rej) => setTimeout(() => rej(new Error("pipeline_timeout")), STEP_TIMEOUT_MS)),
    ]);

    const nextStatus = NEXT[j.status] || "completed";
    await updateJob(jobId, {
      status: nextStatus,
      progress: Math.min(100, Math.round(((Object.keys(NEXT).indexOf(j.status) + 1) / Object.keys(NEXT).length) * 100)),
      metadata: { ...meta, pipeline_lock: false, current_step: nextStatus, last_step_ms: Date.now() - startedAt },
    });
    log("PIPELINE_STEP_COMPLETED", { jobId, from: j.status, to: nextStatus, ms: Date.now() - startedAt });

    if (!TERMINAL.has(nextStatus)) chainNext(jobId);
    return { ok: true, next: nextStatus };
  } catch (e: any) {
    const msg = e?.message || "step_failed";
    log(msg === "pipeline_timeout" ? "PIPELINE_TIMEOUT" : "PIPELINE_STEP_FAILED", {
      jobId, step: j.status, error: msg,
    });
    await updateJob(jobId, {
      status: "failed",
      error: msg,
      metadata: { ...meta, pipeline_lock: false, last_error_step: j.status },
    });
    return { ok: false, reason: msg };
  }
}

// ─── Auto recovery ─────────────────────────────────────────────────
async function runAutoRecovery(): Promise<{ recovered: number }> {
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: stuck } = await admin
    .from("video_jobs")
    .select("id,status,updated_at,metadata")
    .lt("updated_at", tenMinAgo)
    .not("status", "in", "(completed,done,failed,error,fallback_completed)")
    .limit(20);

  if (!stuck || stuck.length === 0) return { recovered: 0 };

  for (const j of stuck) {
    log("PIPELINE_AUTO_RECOVERY", { jobId: j.id, status: j.status });
    await updateJob(j.id, {
      metadata: { ...(j.metadata || {}), pipeline_lock: false, recovered_at: new Date().toISOString() },
    });
    chainNext(j.id);
  }
  return { recovered: stuck.length };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const provided = req.headers.get("x-pipeline-secret") || "";
  const bearer = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (provided !== PIPELINE_SECRET && bearer !== SERVICE_KEY) {
    return json({ error: "unauthorized" }, 401);
  }

  let body: any = {};
  try { body = await req.json(); } catch { /* ignore */ }

  if (body?.action === "recover") {
    const r = await runAutoRecovery();
    return json({ ok: true, ...r });
  }

  if (!body?.jobId) return json({ error: "jobId_required" }, 400);
  const r = await processOne(body.jobId);
  return json(r);
});
