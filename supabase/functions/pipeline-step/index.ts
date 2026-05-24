import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

declare const EdgeRuntime: { waitUntil: (promise: Promise<unknown>) => void };

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-pipeline-secret",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const PIPELINE_SECRET = Deno.env.get("PIPELINE_SECRET") || SERVICE_KEY;

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const authClientFor = (authorization: string) => createClient(SUPABASE_URL, ANON_KEY, {
  auth: { persistSession: false },
  global: { headers: { Authorization: authorization } },
});

const STEP_TIMEOUT_MS = 5 * 60 * 1000;
const STUCK_TIMEOUT_MS = 5 * 60 * 1000;

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

type Caller = { service: boolean; userId?: string };

const log = (event: string, payload: Record<string, unknown> = {}) =>
  console.log(`[PIPELINE] ${event}`, JSON.stringify(payload));

const FALLBACK_COLUMNS = [
  "user_id",
  "status",
  "progress",
  "image_url",
  "prompt",
  "video_url",
  "audio_url",
  "error",
  "metadata",
  "provider",
  "render_mode",
  "scenes",
  "images",
  "updated_at",
];
let cachedColumns: string[] | null = null;

async function getJobColumns(): Promise<string[]> {
  if (cachedColumns) return cachedColumns;
  try {
    const { data, error } = await admin.from("video_jobs").select("*").limit(1);
    if (error) throw error;
    if (data && data.length > 0) {
      cachedColumns = Object.keys(data[0]);
      return cachedColumns;
    }
    console.warn("PIPELINE_SCHEMA_EMPTY_TABLE_FALLBACK");
    cachedColumns = FALLBACK_COLUMNS;
    return cachedColumns;
  } catch (e) {
    log("PIPELINE_SCHEMA_FALLBACK", { error: String(e) });
    cachedColumns = FALLBACK_COLUMNS;
    return cachedColumns;
  }
}

function filterPatch(patch: Record<string, unknown>, cols: string[]): Record<string, unknown> {
  const allowed = new Set(cols);
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(patch)) if (allowed.has(k)) out[k] = patch[k];
  return out;
}

async function updateJob(id: string, patch: Record<string, unknown>) {
  const cols = await getJobColumns();
  const safe = filterPatch(patch, cols);
  if (Object.keys(safe).length === 0) return;
  const { error } = await admin.from("video_jobs").update(safe).eq("id", id);
  if (error) log("DB_UPDATE_FAILED", { id, error: error.message, keys: Object.keys(safe) });
}


async function logRenderEvent(jobId: string, event: string, payload: Record<string, unknown> = {}) {
  log(event, { jobId, ...payload });
  try {
    await admin.from("video_render_logs").insert({
      job_id: jobId,
      provider: "native_pipeline",
      status: event,
      erro: typeof payload.error === "string" ? payload.error : null,
      metadata: payload,
    });
  } catch {
    /* best-effort */
  }
}

function chainNext(jobId: string) {
  const task = fetch(`${SUPABASE_URL}/functions/v1/pipeline-step`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_KEY}`,
      "x-pipeline-secret": PIPELINE_SECRET,
    },
    body: JSON.stringify({ jobId, chained: true }),
  }).catch((e) => log("CHAIN_FETCH_FAILED", { jobId, error: String(e) }));
  EdgeRuntime.waitUntil(task);
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

async function assertJobAccess(job: JobRow, caller: Caller) {
  if (caller.service) return true;
  if (!caller.userId || !job.user_id) return false;
  if (job.user_id === caller.userId) return true;
  const { data: isAdmin } = await admin.rpc("has_role", { _user_id: caller.userId, _role: "admin" });
  return Boolean(isAdmin);
}

function normalizeImages(job: JobRow): string[] {
  const images = Array.isArray(job.images) ? job.images.filter(Boolean) : [];
  if (images.length > 0) return images;
  return job.image_url ? [job.image_url] : [];
}

function fallbackScenes(job: JobRow) {
  const prompt = job.prompt || "Vídeo cinematográfico vertical 9:16";
  return [
    { texto: prompt.slice(0, 90), visual: "abertura cinematográfica", emocao: "curiosidade", prompt_imagem: prompt },
    { texto: "Transforme atenção em ação com uma mensagem clara.", visual: "produto em destaque", emocao: "desejo", prompt_imagem: prompt },
    { texto: "Comece agora e publique seu próximo vídeo.", visual: "call to action premium", emocao: "urgência", prompt_imagem: prompt },
  ];
}

async function stepPrepare(job: JobRow) {
  await updateJob(job.id, {
    prompt: job.prompt || "Vídeo cinematográfico vertical 9:16",
    provider: "native",
    render_mode: "native_pipeline",
  });
}

async function stepGenerateScript(job: JobRow) {
  let scenes = Array.isArray(job.scenes) && job.scenes.length > 0 ? job.scenes : null;
  if (!scenes) {
    try {
      const r = await invokeFn("generate-script-v2", { prompt: job.prompt, jobId: job.id });
      const script = r.data?.script || r.data?.scenes || null;
      scenes = Array.isArray(script) ? script : Array.isArray(r.data?.scenes) ? r.data.scenes : null;
    } catch (error) {
      await logRenderEvent(job.id, "VIDEO_PIPELINE_RECOVERED", { step: "script", error: String(error) });
    }
  }
  await updateJob(job.id, { scenes: scenes?.length ? scenes : fallbackScenes(job) });
}

async function stepGenerateAudio(job: JobRow) {
  if (job.audio_url) return;
  try {
    const r = await invokeFn("generate-voiceover-v2", { jobId: job.id, text: job.prompt });
    const audio = r.data?.audioUrl || r.data?.audio_url || null;
    if (audio) await updateJob(job.id, { audio_url: audio });
  } catch (error) {
    await logRenderEvent(job.id, "VIDEO_PIPELINE_RECOVERED", { step: "audio", error: String(error), fallback: "silent_audio" });
  }
}

function isValidVideoUrl(url: string | null | undefined, imageUrl?: string | null): { ok: boolean; reason?: string } {
  if (!url || typeof url !== "string") return { ok: false, reason: "empty_url" };
  const t = url.trim();
  if (t.length === 0) return { ok: false, reason: "empty_url" };
  if (imageUrl && t === imageUrl) return { ok: false, reason: "image_url_used_as_video" };
  if (/\.(png|jpe?g|webp|gif|bmp|svg|avif)(\?|#|$)/i.test(t)) return { ok: false, reason: "image_extension_blocked" };
  if (t.startsWith("blob:") || t.startsWith("data:image")) return { ok: false, reason: "invalid_blob" };
  let path = t;
  try { path = new URL(t).pathname; } catch { /* noop */ }
  if (!/\.(mp4|webm|mov|m4v)$/i.test(path)) return { ok: false, reason: "not_video_extension" };
  return { ok: true };
}

async function stepRenderVideo(job: JobRow) {
  await logRenderEvent(job.id, "VIDEO_RENDER_STARTED", { render_mode: "native_pipeline" });
  const imageList = normalizeImages(job);
  if (imageList.length === 0) throw new Error("image_url_required");

  const r = await invokeFn("video-pipeline", {
    jobId: job.id,
    imageUrl: imageList[0],
    prompt: job.prompt,
    script: job.prompt,
    scenes: Array.isArray(job.scenes) ? job.scenes : fallbackScenes(job),
  });
  const video = r.data?.videoUrl || r.data?.video_url || null;
  if (r.ok && video && String(video).trim().length > 0) {
    const check = isValidVideoUrl(String(video), job.image_url);
    if (!check.ok) {
      await logRenderEvent(job.id, "PIPELINE_FAKE_VIDEO_BLOCKED", { videoUrl: video, reason: check.reason, stage: "shotstack_response" });
      // segue para fallback browser
    } else {
      await updateJob(job.id, { video_url: video, provider: "shotstack", render_mode: "native_pipeline" });
      await logRenderEvent(job.id, "VIDEO_RENDER_COMPLETED", { provider: "video-pipeline", videoUrl: video });
      return;
    }
  }

  await logRenderEvent(job.id, "VIDEO_PIPELINE_RECOVERED", {
    reason: r.ok ? "empty_or_invalid_video_output" : `video_pipeline_${r.status}`,
    fallback_chain: ["browser_renderer", "ffmpeg.wasm", "canvas_capture"],
  });
  const meta = job.metadata || {};
  await updateJob(job.id, {
    status: "fallback_processing",
    progress: 72,
    error: null,
    provider: "browser",
    render_mode: "native_pipeline",
    metadata: {
      ...meta,
      pipeline_lock: false,
      needs_browser_render: true,
      browser_render_requested_at: new Date().toISOString(),
      fallback_chain: ["browser_renderer", "ffmpeg.wasm", "canvas_capture"],
    },
  });
  throw new Error("browser_render_required");
}

async function stepUpload(job: JobRow) {
  if (!job.video_url || String(job.video_url).trim().length === 0) {
    await logRenderEvent(job.id, "VIDEO_EMPTY_OUTPUT", { step: "upload" });
    throw new Error("empty_video_output");
  }
  await logRenderEvent(job.id, "VIDEO_UPLOAD_COMPLETED", { videoUrl: job.video_url });
}

const NEXT: Record<string, string> = {
  queued: "generating_script",
  pending: "generating_script",
  processing: "generating_script",
  generating_prompt: "generating_script",
  generating_script: "generating_audio",
  script_ready: "generating_audio",
  generating_audio: "rendering",
  generating_voice: "rendering",
  rendering: "uploading",
  uploading: "completed",
};

const RUNNER: Record<string, (j: JobRow) => Promise<void>> = {
  queued: stepPrepare,
  pending: stepPrepare,
  processing: stepPrepare,
  generating_prompt: stepGenerateScript,
  generating_script: stepGenerateScript,
  script_ready: stepGenerateAudio,
  generating_audio: stepGenerateAudio,
  generating_voice: stepRenderVideo,
  rendering: stepRenderVideo,
  uploading: stepUpload,
};

const TERMINAL = new Set(["completed", "done", "failed", "error", "fallback_completed"]);

async function processOne(jobId: string, caller: Caller) {
  const { data: job, error } = await admin
    .from("video_jobs")
    .select("id,user_id,status,image_url,prompt,scenes,images,audio_url,video_url,metadata,updated_at")
    .eq("id", jobId)
    .maybeSingle();
  if (error || !job) return { ok: false, reason: "JOB_NOT_FOUND" };
  const j = job as JobRow;

  if (!(await assertJobAccess(j, caller))) return { ok: false, reason: "FORBIDDEN" };
  if (TERMINAL.has(j.status)) return { ok: true, reason: "TERMINAL" };
  if (j.status === "fallback_processing" && (j.metadata || {}).needs_browser_render) {
    return { ok: true, reason: "BROWSER_RENDER_PENDING" };
  }

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
      status: "error",
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

  await logRenderEvent(jobId, "PIPELINE_STEP_STARTED", { step: j.status });
  const startedAt = Date.now();

  try {
    await Promise.race([
      runner(j),
      new Promise((_, rej) => setTimeout(() => rej(new Error("pipeline_timeout")), STEP_TIMEOUT_MS)),
    ]);

    const nextStatus = NEXT[j.status] || "completed";
    const isCompleting = nextStatus === "completed";
    const { data: latest } = await admin.from("video_jobs").select("video_url,metadata,status").eq("id", jobId).maybeSingle();
    if (isCompleting) {
      const check = isValidVideoUrl(latest?.video_url || null, j.image_url);
      if (!check.ok) {
        await logRenderEvent(jobId, "PIPELINE_INVALID_VIDEO_URL", { step: j.status, videoUrl: latest?.video_url, reason: check.reason });
        await updateJob(jobId, {
          status: "failed",
          progress: 100,
          video_url: null,
          error: check.reason === "image_url_used_as_video" ? "fake_video_blocked" : (check.reason || "empty_video_output"),
          metadata: { ...(latest?.metadata || meta), pipeline_lock: false, last_error_step: j.status },
        });
        return { ok: false, reason: check.reason || "empty_video_output" };
      }
    }

    if (latest?.status === "fallback_processing") {
      return { ok: true, reason: "BROWSER_RENDER_REQUIRED" };
    }

    await updateJob(jobId, {
      status: nextStatus,
      progress: isCompleting ? 100 : Math.min(95, Math.round(((Object.keys(NEXT).indexOf(j.status) + 1) / Object.keys(NEXT).length) * 100)),
      metadata: { ...(latest?.metadata || meta), pipeline_lock: false, current_step: nextStatus, last_step_ms: Date.now() - startedAt },
    });
    await logRenderEvent(jobId, "PIPELINE_STEP_COMPLETED", { from: j.status, to: nextStatus, ms: Date.now() - startedAt });

    if (isCompleting) await logRenderEvent(jobId, "VIDEO_PIPELINE_STARTED", { completed: true });
    if (!TERMINAL.has(nextStatus)) chainNext(jobId);
    return { ok: true, next: nextStatus };
  } catch (e: any) {
    const msg = e?.message || "step_failed";
    if (msg === "browser_render_required") {
      await logRenderEvent(jobId, "PIPELINE_STEP_COMPLETED", { from: j.status, to: "fallback_processing" });
      return { ok: true, next: "fallback_processing" };
    }
    await logRenderEvent(jobId, msg === "pipeline_timeout" ? "PIPELINE_TIMEOUT" : "VIDEO_PIPELINE_FAILED", {
      step: j.status, error: msg,
    });
    await updateJob(jobId, {
      status: "error",
      progress: 100,
      video_url: null,
      error: msg === "Video vazio" ? "empty_video_output" : msg,
      metadata: { ...meta, pipeline_lock: false, last_error_step: j.status },
    });
    return { ok: false, reason: msg };
  }
}

const MAX_RECOVERY_ATTEMPTS = 3;

async function runAutoRecovery(): Promise<{ recovered: number; killed: number }> {
  const fiveMinAgo = new Date(Date.now() - STUCK_TIMEOUT_MS).toISOString();
  const { data: stuck } = await admin
    .from("video_jobs")
    .select("id,status,updated_at,metadata,video_url")
    .in("status", ["queued", "pending", "processing", "generating_prompt", "generating_script", "script_ready", "generating_audio", "generating_voice", "rendering", "uploading"])
    .lt("updated_at", fiveMinAgo)
    .limit(20);

  if (!stuck || stuck.length === 0) return { recovered: 0, killed: 0 };

  let recovered = 0;
  let killed = 0;
  for (const j of stuck) {
    const meta = (j.metadata || {}) as Record<string, any>;
    const attempts = Number(meta.recovery_attempts || 0);

    // Cap anti-loop: depois de N tentativas falhas, encerra como failed
    if (attempts >= MAX_RECOVERY_ATTEMPTS) {
      await logRenderEvent(j.id, "VIDEO_PIPELINE_FAILED", {
        status: j.status, reason: "recovery_attempts_exhausted", attempts,
      });
      await updateJob(j.id, {
        status: "failed",
        progress: 100,
        video_url: null,
        error: "recovery_attempts_exhausted",
        metadata: { ...meta, pipeline_lock: false, needs_browser_render: false, recovery_killed_at: new Date().toISOString() },
      });
      killed += 1;
      continue;
    }

    await logRenderEvent(j.id, "VIDEO_PIPELINE_RECOVERED", { status: j.status, reason: "watchdog_5min", attempts: attempts + 1 });
    await updateJob(j.id, {
      status: j.status === "processing" ? "pending" : j.status,
      metadata: {
        ...meta,
        pipeline_lock: false,
        recovered_at: new Date().toISOString(),
        recovery_attempts: attempts + 1,
      },
    });
    chainNext(j.id);
    recovered += 1;
  }
  return { recovered, killed };
}

async function safeProcessOne(jobId: string, caller: Caller) {
  try {
    await processOne(jobId, caller);
  } catch (fatal) {
    const message = fatal instanceof Error ? fatal.message : "fatal_crash";
    try { await logRenderEvent(jobId, "VIDEO_PIPELINE_FAILED", { error: message, fatal: true }); } catch { /* noop */ }
    try {
      await admin.from("video_jobs").update({
        status: "error",
        progress: 100,
        video_url: null,
        error: message,
        metadata: { pipeline_lock: false, fatal_crash_at: new Date().toISOString() },
      } as never).eq("id", jobId);
    } catch { /* last resort */ }
  }
}



serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const provided = req.headers.get("x-pipeline-secret") || "";
  const bearer = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const authorization = req.headers.get("Authorization") || "";
  const apiKey = req.headers.get("apikey") || "";
  const serviceCaller = provided === PIPELINE_SECRET || bearer === SERVICE_KEY;

  let caller: Caller = { service: serviceCaller };
  if (!serviceCaller && authorization.startsWith("Bearer ") && ANON_KEY) {
    const { data } = await authClientFor(authorization).auth.getUser();
    if (data?.user?.id) caller = { service: false, userId: data.user.id };
  }

  let body: any = {};
  try { body = await req.json(); } catch { /* ignore */ }

  const recoverAllowed = serviceCaller || bearer === ANON_KEY || apiKey === ANON_KEY || Boolean(caller.userId);
  if (body?.action === "recover") {
    if (!recoverAllowed) return json({ error: "unauthorized" }, 401);
    const r = await runAutoRecovery();
    return json({ ok: true, ...r });
  }

  if (!serviceCaller && !caller.userId) return json({ error: "unauthorized" }, 401);
  if (!body?.jobId) return json({ error: "jobId_required" }, 400);
  await logRenderEvent(body.jobId, "VIDEO_PIPELINE_STARTED", { status: "accepted" });
  EdgeRuntime.waitUntil(safeProcessOne(body.jobId, caller));
  return json({ ok: true, accepted: true, jobId: body.jobId }, 202);
});
