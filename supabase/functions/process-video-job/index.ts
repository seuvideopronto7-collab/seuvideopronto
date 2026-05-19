import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

declare const EdgeRuntime: { waitUntil: (promise: Promise<unknown>) => void };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-pipeline-secret",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
const pipelineSecret = Deno.env.get("PIPELINE_SECRET") || serviceKey;
const shotstackKey = Deno.env.get("SHOTSTACK_API_KEY") || "";
const shotstackEnv = (Deno.env.get("SHOTSTACK_ENV") || "stage").toLowerCase() === "v1" ? "v1" : "stage";

const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
const LOCK_TTL_MS = 5 * 60 * 1000;
const HTTP_TIMEOUT_MS = 10_000;
const MAX_VIDEO_MB = 250;
const MAX_VIDEO_BYTES = MAX_VIDEO_MB * 1024 * 1024;

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = HTTP_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

type JobRow = {
  id: string;
  user_id: string | null;
  status: string;
  progress: number;
  prompt: string | null;
  image_url: string | null;
  video_url: string | null;
  audio_url: string | null;
  error: string | null;
  provider: string | null;
  render_mode: string | null;
  metadata: Record<string, any> | null;
  scenes: any;
  images: any;
  updated_at: string;
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function cleanMeta(meta: Record<string, any> | null | undefined) {
  return meta && typeof meta === "object" ? meta : {};
}

async function updateJob(jobId: string, patch: Record<string, unknown>) {
  const { error } = await admin.from("video_jobs").update(patch).eq("id", jobId);
  if (error) throw error;
}

async function logEvent(jobId: string, event: string, payload: Record<string, unknown> = {}) {
  console.log(`[VIDEO_CONSUMER] ${event}`, JSON.stringify({ jobId, ...payload }));
  try {
    await admin.from("video_render_logs").insert({
      job_id: jobId,
      provider: "process-video-job",
      status: event,
      erro: typeof payload.error === "string" ? payload.error : null,
      metadata: payload,
    });
  } catch {
    // best-effort
  }
}

async function fetchJob(jobId: string) {
  const { data, error } = await admin
    .from("video_jobs")
    .select("id,user_id,status,progress,prompt,image_url,video_url,audio_url,error,provider,render_mode,metadata,scenes,images,updated_at")
    .eq("id", jobId)
    .maybeSingle();
  if (error) throw error;
  return data as JobRow | null;
}

async function userFromAuth(authHeader: string) {
  if (!authHeader.startsWith("Bearer ") || !anonKey) return null;
  if (authHeader.replace(/^Bearer\s+/i, "") === serviceKey) return { id: "service_role", service: true };
  const client = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: authHeader } },
  });
  const { data } = await client.auth.getUser();
  return data.user ? { id: data.user.id, service: false } : null;
}

async function canAccess(job: JobRow, authHeader: string, secret: string) {
  if (secret && secret === pipelineSecret) return true;
  const caller = await userFromAuth(authHeader);
  if (!caller) return false;
  if (caller.service || caller.id === job.user_id) return true;
  const { data: isAdmin } = await admin.rpc("has_role", { _user_id: caller.id, _role: "admin" });
  return Boolean(isAdmin);
}

async function acquireLock(job: JobRow): Promise<JobRow | null> {
  const { data, error } = await admin.rpc("claim_video_job", {
    _job_id: job.id,
    _lock_ttl_seconds: Math.floor(LOCK_TTL_MS / 1000),
  });
  if (error) throw error;
  if (!data?.claimed || !data?.job) return null;
  return data.job as JobRow;
}

async function releaseLock(jobId: string, meta: Record<string, any>, extra: Record<string, unknown> = {}) {
  await updateJob(jobId, {
    ...extra,
    metadata: { ...meta, pipeline_lock: false, pipeline_unlocked_at: new Date().toISOString() },
  });
}

function fallbackScript(job: JobRow) {
  const base = job.prompt || "Seu vídeo pronto";
  return `${base}. Transforme atenção em ação com um vídeo curto, claro e profissional. Comece agora.`.slice(0, 500);
}

function normalizeScenes(job: JobRow, script: string) {
  if (Array.isArray(job.scenes) && job.scenes.length > 0) return job.scenes;
  return [
    { texto: script.slice(0, 80), visual: "abertura cinematográfica", emocao: "curiosidade" },
    { texto: "Mostre valor rápido e gere desejo.", visual: "produto em destaque", emocao: "desejo" },
    { texto: "Clique e comece hoje.", visual: "chamada para ação", emocao: "urgência" },
  ];
}

async function generateAudio(jobId: string, script: string) {
  const apiKey = Deno.env.get("ELEVENLABS_API_KEY") || "";
  if (!apiKey) return null;
  try {
    const res = await fetchWithTimeout("https://api.elevenlabs.io/v1/text-to-speech/onwK4e9ZLuTAKqWW03F9?output_format=mp3_44100_128", {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ text: script, model_id: "eleven_multilingual_v2" }),
    }, 15_000);
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    if (buffer.byteLength < 1024) return null;
    const path = `voiceovers/${jobId}.mp3`;
    const { error } = await admin.storage.from("audio").upload(path, buffer, { contentType: "audio/mpeg", upsert: true });
    if (error) return null;
    const { data } = admin.storage.from("audio").getPublicUrl(path);
    return data.publicUrl || null;
  } catch {
    return null;
  }
}

async function renderWithShotstack(job: JobRow, script: string, audioUrl: string | null) {
  if (!shotstackKey || !job.image_url) return null;
  const scenes = normalizeScenes(job, script);
  const sceneDuration = 3;
  const totalDuration = Math.max(sceneDuration, scenes.length * sceneDuration);
  const esc = (s: string) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;");

  const tracks: any[] = [
    {
      clips: scenes.map((scene: any, i: number) => ({
        asset: { type: "html", html: `<p style="font-family:Arial;font-size:46px;color:#fff;text-align:center;text-shadow:2px 2px 8px rgba(0,0,0,.9);font-weight:800;line-height:1.25">${esc(String(scene.texto || script).slice(0, 90))}</p>`, width: 900, height: 220 },
        start: i * sceneDuration,
        length: sceneDuration,
        position: "bottom",
        offset: { y: 0.12 },
        transition: { in: "fade", out: "fade" },
      })),
    },
    {
      clips: scenes.map((_scene: any, i: number) => ({
        asset: { type: "image", src: job.image_url },
        start: i * sceneDuration,
        length: sceneDuration,
        fit: "cover",
        effect: i % 2 === 0 ? "zoomIn" : "zoomOut",
        transition: { in: "fade", out: "fade" },
      })),
    },
  ];

  if (audioUrl) {
    tracks.push({ clips: [{ asset: { type: "audio", src: audioUrl, volume: 1 }, start: 0, length: totalDuration }] });
  }

  const create = await fetch(`https://api.shotstack.io/edit/${shotstackEnv}/render`, {
    method: "POST",
    headers: { "x-api-key": shotstackKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      timeline: { background: "#000000", tracks },
      output: { format: "mp4", aspectRatio: "9:16", size: { width: 1080, height: 1920 }, fps: 30 },
    }),
  });

  if (!create.ok) {
    await logEvent(job.id, "VIDEO_JOB_FAILED", { stage: "render_create", status: create.status, error: await create.text() });
    return null;
  }

  const created = await create.json();
  const renderId = created?.response?.id;
  if (!renderId) return null;

  for (let i = 0; i < 36; i++) {
    await delay(5000);
    const poll = await fetch(`https://api.shotstack.io/edit/${shotstackEnv}/render/${renderId}`, {
      headers: { "x-api-key": shotstackKey },
    });
    if (!poll.ok) continue;
    const data = await poll.json();
    const status = data?.response?.status;
    await updateJob(job.id, { progress: Math.min(88, 70 + i) });
    if (status === "done") return data?.response?.url || null;
    if (status === "failed") return null;
  }
  return null;
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

async function uploadVideo(job: JobRow, url: string) {
  const res = await fetchWithTimeout(url, {}, HTTP_TIMEOUT_MS);
  if (!res.ok) throw new Error("empty_video_output");
  const ctype = (res.headers.get("content-type") || "").toLowerCase();
  if (ctype) {
    if (/^image\//.test(ctype) || /^text\/html/.test(ctype) || /^application\/json/.test(ctype)) {
      throw new Error("invalid_video_content_type");
    }
    if (!ctype.startsWith("video/")) throw new Error("invalid_video_content_type");
  }
  const clen = Number(res.headers.get("content-length") || "0");
  if (clen && clen > MAX_VIDEO_BYTES) {
    await logEvent(job.id, "PIPELINE_VIDEO_TOO_LARGE", { contentLength: clen, maxBytes: MAX_VIDEO_BYTES });
    throw new Error("video_too_large");
  }
  const buffer = await res.arrayBuffer();
  if (!buffer || buffer.byteLength === 0 || buffer.byteLength < 1000) throw new Error("empty_video_output");
  if (buffer.byteLength > MAX_VIDEO_BYTES) {
    await logEvent(job.id, "PIPELINE_VIDEO_TOO_LARGE", { byteLength: buffer.byteLength, maxBytes: MAX_VIDEO_BYTES });
    throw new Error("video_too_large");
  }
  const owner = job.user_id || "system";
  const path = `${owner}/${job.id}.mp4`;
  const { error } = await admin.storage.from("generated-videos").upload(path, buffer, { contentType: "video/mp4", upsert: true });
  if (error) throw error;
  const { data } = await admin.storage.from("generated-videos").createSignedUrl(path, 60 * 60 * 24 * 7);
  if (!data?.signedUrl) throw new Error("empty_video_output");
  return data.signedUrl;
}

async function processJob(jobId: string) {
  let job = await fetchJob(jobId);
  if (!job) return;
  if (["completed", "done"].includes(job.status) && job.video_url) return;

  const claimedJob = await acquireLock(job);
  if (!claimedJob) return;
  await logEvent(jobId, "VIDEO_JOB_CONSUMED", { status: job.status });

  job = claimedJob;
  const meta = cleanMeta(job.metadata);

  try {
    await updateJob(jobId, { progress: 20, status: "processing", metadata: { ...meta, current_step: "script", pipeline_lock: true } });
    const script = fallbackScript(job);

    await updateJob(jobId, { progress: 40, status: "processing", metadata: { ...meta, current_step: "audio", pipeline_lock: true } });
    const audioUrl = job.audio_url || await generateAudio(jobId, script);
    if (audioUrl) await updateJob(jobId, { audio_url: audioUrl });

    await updateJob(jobId, { progress: 70, status: "processing", metadata: { ...meta, current_step: "render", pipeline_lock: true } });
    await logEvent(jobId, "VIDEO_RENDER_STARTED", { provider: shotstackKey ? "shotstack" : "browser_required" });

    const renderedUrl = await renderWithShotstack(job, script, audioUrl);
    const renderedCheck = isValidVideoUrl(renderedUrl, job.image_url);
    if (!renderedUrl || !renderedCheck.ok) {
      if (renderedUrl && !renderedCheck.ok) {
        await logEvent(jobId, "PIPELINE_FAKE_VIDEO_BLOCKED", { url: renderedUrl, reason: renderedCheck.reason });
      }
      await logEvent(jobId, "VIDEO_RENDER_EMPTY", { fallback: "browser_renderer_required" });
      await updateJob(jobId, {
        status: "fallback_processing",
        progress: 70,
        error: null,
        provider: "browser",
        render_mode: "native_pipeline",
        metadata: {
          ...meta,
          pipeline_lock: false,
          needs_browser_render: true,
          browser_render_requested_at: new Date().toISOString(),
        },
      });
      return;
    }

    await logEvent(jobId, "VIDEO_RENDER_SUCCESS", { url: renderedUrl });
    await updateJob(jobId, { progress: 90, status: "processing", metadata: { ...meta, current_step: "upload", pipeline_lock: true } });
    const storedUrl = await uploadVideo(job, renderedUrl);
    await logEvent(jobId, "VIDEO_UPLOAD_SUCCESS", { url: storedUrl });

    const storedCheck = isValidVideoUrl(storedUrl, job.image_url);
    if (!storedCheck.ok) {
      await logEvent(jobId, "PIPELINE_INVALID_VIDEO_URL", { url: storedUrl, reason: storedCheck.reason });
      await releaseLock(jobId, meta, { status: "failed", progress: 100, video_url: null, error: storedCheck.reason || "empty_video_output" });
      return;
    }

    await releaseLock(jobId, meta, {
      status: "completed",
      progress: 100,
      video_url: storedUrl,
      error: null,
      provider: shotstackKey ? "shotstack" : "native",
      render_mode: "native_pipeline",
    });
    await logEvent(jobId, "VIDEO_JOB_COMPLETED", { videoUrl: storedUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    await logEvent(jobId, "VIDEO_JOB_FAILED", { error: message });
    await releaseLock(jobId, meta, {
      status: "error",
      progress: 100,
      video_url: null,
      error: message === "Video vazio" ? "empty_video_output" : message,
    });
  }
}

async function safeProcessJob(jobId: string) {
  try {
    await processJob(jobId);
  } catch (fatal) {
    const message = fatal instanceof Error ? fatal.message : "fatal_crash";
    try { await logEvent(jobId, "VIDEO_JOB_FAILED", { error: message, fatal: true }); } catch { /* noop */ }
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

async function recoverStalled() {
  const cutoff = new Date(Date.now() - LOCK_TTL_MS).toISOString();
  const { data: jobs } = await admin
    .from("video_jobs")
    .select("id,status,metadata,updated_at")
    .in("status", ["pending", "processing"])
    .lt("updated_at", cutoff)
    .limit(20);

  for (const job of jobs || []) {
    const meta = cleanMeta(job.metadata as Record<string, any>);
    await logEvent(job.id, "VIDEO_JOB_RECOVERED", { from: job.status });
    await updateJob(job.id, {
      status: "pending",
      progress: 0,
      error: null,
      metadata: { ...meta, pipeline_lock: false, recovered_at: new Date().toISOString() },
    });
    EdgeRuntime.waitUntil(safeProcessJob(job.id));
  }

  const { data: browserStale } = await admin
    .from("video_jobs")
    .select("id,metadata")
    .eq("status", "fallback_processing")
    .lt("updated_at", cutoff)
    .limit(20);

  for (const job of browserStale || []) {
    const meta = cleanMeta(job.metadata as Record<string, any>);
    await logEvent(job.id, "VIDEO_JOB_FAILED", { error: "browser_render_timeout" });
    await updateJob(job.id, {
      status: "error",
      progress: 100,
      error: "browser_render_timeout",
      metadata: { ...meta, pipeline_lock: false, needs_browser_render: false },
    });
  }

  return { recovered: jobs?.length || 0, browserTimedOut: browserStale?.length || 0 };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Metodo nao permitido" }, 405);

  if (!supabaseUrl || !serviceKey || !anonKey) return json({ error: "Backend env not configured." }, 500);

  let body: any = {};
  try { body = await req.json(); } catch { body = {}; }

  const authHeader = req.headers.get("Authorization") || "";
  const secret = req.headers.get("x-pipeline-secret") || "";
  const apiKey = req.headers.get("apikey") || "";

  if (body?.action === "recover") {
    const caller = await userFromAuth(authHeader);
    const allowed = secret === pipelineSecret || authHeader.replace(/^Bearer\s+/i, "") === serviceKey || apiKey === anonKey || Boolean(caller);
    if (!allowed) return json({ error: "Unauthorized" }, 401);
    const result = await recoverStalled();
    return json({ ok: true, ...result });
  }

  const { jobId } = body;
  if (!jobId) return json({ error: "jobId obrigatorio" }, 400);

  const job = await fetchJob(jobId);
  if (!job) return json({ error: "Job nao encontrado" }, 404);
  if (!(await canAccess(job, authHeader, secret))) return json({ error: "Unauthorized" }, 401);

  EdgeRuntime.waitUntil(safeProcessJob(jobId));
  return json({ ok: true, accepted: true, id: jobId, status: "processing" }, 202);
});
