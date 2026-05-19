import { supabase } from "@/integrations/supabase/client";
import renderVideoNative from "@/lib/video/renderNativeVideo";
import { renderVideoFromImage } from "@/lib/videoRender";
import { logVideoEvent } from "./videoLogger";
import { validateVideoUrl } from "./validateVideoUrl";

type BrowserRenderJob = {
  id: string;
  image_url?: string | null;
  audio_url?: string | null;
  prompt?: string | null;
  images?: unknown;
  scenes?: unknown;
  metadata?: Record<string, unknown> | null;
};

const RENDER_TIMEOUT_MS = 5 * 60 * 1000;
const IMAGE_TIMEOUT_MS = 20_000;
const RECORDING_SLICE_MS = 250;
const CANVAS_DURATION_MS = 6000;
const BLOCKED_MIME = /^(image\/|text\/html|application\/json)/i;

const nonEmpty = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;

function resolveImages(job: BrowserRenderJob): string[] {
  const list = Array.isArray(job.images) ? job.images.filter(nonEmpty) : [];
  if (list.length > 0) return list;
  return nonEmpty(job.image_url) ? [job.image_url] : [];
}

async function updateJob(jobId: string, patch: Record<string, unknown>) {
  const { error } = await supabase.from("video_jobs").update(patch as never).eq("id", jobId);
  if (error) {
    logVideoEvent("VIDEO_RENDER_FAILED", { jobId, error: error.message, stage: "db_update" });
    throw error;
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, onTimeout: () => void): Promise<T> {
  let timer: number | undefined;
  return new Promise<T>((resolve, reject) => {
    timer = window.setTimeout(() => {
      onTimeout();
      reject(new Error("pipeline_timeout"));
    }, ms);
    promise.then(resolve, reject).finally(() => window.clearTimeout(timer));
  });
}

function assertVideoBlob(blob: Blob) {
  const t = (blob.type || "").toLowerCase();
  if (t && BLOCKED_MIME.test(t)) throw new Error("invalid_video_content_type");
  if (t && !t.startsWith("video/")) throw new Error("invalid_video_content_type");
  if (blob.size < 1000) throw new Error("empty_video_output");
}

async function uploadBlob(jobId: string, blob: Blob, extension: "mp4" | "webm") {
  assertVideoBlob(blob);
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error("unauthorized");
  const path = `${uid}/${jobId}.${extension}`;
  const { error } = await supabase.storage
    .from("generated-videos")
    .upload(path, blob, { contentType: extension === "mp4" ? "video/mp4" : "video/webm", upsert: true });
  if (error) throw error;
  const { data } = await supabase.storage.from("generated-videos").createSignedUrl(path, 60 * 60 * 24 * 7);
  if (!data?.signedUrl) throw new Error("empty_video_output");
  return data.signedUrl;
}

async function persistRenderedUrl(jobId: string, url: string, preferredExt: "mp4" | "webm" = "mp4") {
  if (!url.startsWith("blob:")) return url;
  const res = await fetch(url);
  if (!res.ok) throw new Error("empty_video_output");
  const blob = await res.blob();
  assertVideoBlob(blob);
  return uploadBlob(jobId, blob, preferredExt);
}

async function backendSignedUrl(jobId: string, url: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke("process-video-job", {
      body: { action: "sign-storage-url", jobId, url },
    });
    if (error) throw error;
    return typeof data?.signedUrl === "string" ? data.signedUrl : null;
  } catch (error: any) {
    logVideoEvent("VIDEO_RENDER_FAILED", { jobId, stage: "asset_sign", error: error?.message || "asset_sign_failed" });
    return null;
  }
}

async function refreshSignedUrl(jobId: string, url: string): Promise<string> {
  if (!url.includes("/storage/v1/object/")) return url;
  const m = url.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/([^?#]+)/);
  if (!m) return url;
  const [, bucket, path] = m;
  try {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(decodeURIComponent(path), 3600);
    if (!error && data?.signedUrl) return data.signedUrl;
  } catch {
    // segue para assinatura via backend
  }
  return (await backendSignedUrl(jobId, url)) || url;
}

async function fetchImageBlob(jobId: string, url: string): Promise<string> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS);
  try {
    const res = await fetch(url, { mode: "cors", signal: controller.signal });
    if (!res.ok) throw new Error(`asset_fetch_${res.status}`);
    const ctype = (res.headers.get("content-type") || "").toLowerCase();
    if (ctype && (/^text\/html/.test(ctype) || /^application\/json/.test(ctype))) throw new Error("invalid_asset_content_type");
    const blob = await res.blob();
    if (blob.size < 100) throw new Error("empty_asset");
    return URL.createObjectURL(blob);
  } catch (error: any) {
    logVideoEvent("VIDEO_RENDER_FAILED", { jobId, stage: "asset_fetch", error: error?.message || "asset_fetch_failed" });
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

async function loadImage(jobId: string, url: string): Promise<{ img: HTMLImageElement; cleanup: () => void }> {
  const fresh = await refreshSignedUrl(jobId, url);
  const objectUrls: string[] = [];
  const tryLoad = (src: string, withCors: boolean) =>
    withTimeout(
      new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        if (withCors) img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("image_load_failed"));
        img.src = src;
      }),
      IMAGE_TIMEOUT_MS,
      () => logVideoEvent("PIPELINE_TIMEOUT", { jobId, stage: "image_load" }),
    );

  try {
    return { img: await tryLoad(fresh, true), cleanup: () => objectUrls.forEach(URL.revokeObjectURL) };
  } catch {
    const blobUrl = await fetchImageBlob(jobId, fresh);
    objectUrls.push(blobUrl);
    return { img: await tryLoad(blobUrl, false), cleanup: () => objectUrls.forEach(URL.revokeObjectURL) };
  }
}

async function canvasCaptureFallback(job: BrowserRenderJob): Promise<string> {
  const imageUrl = resolveImages(job)[0];
  if (!imageUrl) throw new Error("image_url_required");
  if (typeof MediaRecorder === "undefined") throw new Error("mediarecorder_unavailable");

  const canvas = document.createElement("canvas");
  canvas.width = 720;
  canvas.height = 1280;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas_unavailable");

  const { img, cleanup } = await loadImage(job.id, imageUrl);
  const stream = canvas.captureStream(30);
  if (!stream || stream.getVideoTracks().length === 0) throw new Error("capture_stream_unavailable");

  const candidates = ["video/mp4;codecs=h264", "video/mp4", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
  const mime = candidates.find((c) => MediaRecorder.isTypeSupported(c)) || "video/webm";
  const chunks: BlobPart[] = [];
  let frameId = 0;
  let stopped = false;
  const recorder = new MediaRecorder(stream, { mimeType: mime });

  const done = new Promise<Blob>((resolve, reject) => {
    recorder.ondataavailable = (event) => event.data.size > 0 && chunks.push(event.data);
    recorder.onerror = () => reject(new Error("mediarecorder_failed"));
    recorder.onstop = () => {
      logVideoEvent("MEDIARECORDER_STOP", { jobId: job.id, chunks: chunks.length, mime });
      chunks.length ? resolve(new Blob(chunks, { type: mime })) : reject(new Error("empty_video_output"));
    };
  });

  const stopRecorder = () => {
    if (stopped) return;
    stopped = true;
    if (frameId) cancelAnimationFrame(frameId);
    if (recorder.state !== "inactive") recorder.stop();
    stream.getTracks().forEach((track) => track.stop());
    cleanup();
  };

  try {
    recorder.start(RECORDING_SLICE_MS);
    logVideoEvent("MEDIARECORDER_START", { jobId: job.id, mime, tracks: stream.getVideoTracks().length });
    const start = performance.now();

    await new Promise<void>((resolve) => {
      const draw = () => {
        const elapsed = performance.now() - start;
        const t = Math.min(1, elapsed / CANVAS_DURATION_MS);
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const scale = 1.08 + t * 0.12;
        const imgRatio = img.width / img.height;
        const canvasRatio = canvas.width / canvas.height;
        let drawW = canvas.width * scale;
        let drawH = drawW / imgRatio;
        if (imgRatio > canvasRatio) {
          drawH = canvas.height * scale;
          drawW = drawH * imgRatio;
        }
        ctx.drawImage(img, (canvas.width - drawW) / 2, (canvas.height - drawH) / 2, drawW, drawH);
        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.fillRect(0, canvas.height - 320, canvas.width, 320);
        ctx.fillStyle = "#fff";
        ctx.font = "700 42px sans-serif";
        ctx.textAlign = "center";
        const caption = (job.prompt || "Seu vídeo pronto").slice(0, 80);
        const words = caption.split(/\s+/);
        const lines: string[] = [];
        let line = "";
        for (const w of words) {
          if ((line + " " + w).trim().length > 24) { lines.push(line.trim()); line = w; }
          else line = (line + " " + w).trim();
        }
        if (line) lines.push(line);
        lines.slice(0, 3).forEach((ln, i) => ctx.fillText(ln, canvas.width / 2, canvas.height - 200 + i * 52, canvas.width - 80));
        if (elapsed % 1000 < 40) logVideoEvent("VIDEO_RENDER_PROGRESS", { jobId: job.id, progress: Math.round(80 + t * 15), stage: "canvas_capture" });
        if (elapsed < CANVAS_DURATION_MS) frameId = requestAnimationFrame(draw);
        else resolve();
      };
      draw();
    });

    stopRecorder();
    const blob = await done;
    assertVideoBlob(blob);
    const ext = mime.startsWith("video/mp4") ? "mp4" : "webm";
    return uploadBlob(job.id, blob, ext);
  } finally {
    stopRecorder();
  }
}

async function renderWithFfmpeg(job: BrowserRenderJob): Promise<string> {
  const images = resolveImages(job);
  const result = await renderVideoNative({
    images,
    audioUrl: job.audio_url,
    outputName: job.id,
    jobId: job.id,
    sceneDurationSec: 4,
    resolution: "720p",
    captionText: job.prompt || "Seu vídeo pronto",
    uploadToStorage: true,
    onStage: (_stage, progress) => logVideoEvent("VIDEO_RENDER_PROGRESS", { jobId: job.id, progress, stage: "ffmpeg_wasm" }),
  });
  return result.videoUrl;
}

async function renderWithLegacyImage(job: BrowserRenderJob): Promise<string> {
  const image = resolveImages(job)[0];
  if (!image) throw new Error("image_url_required");
  const url = await renderVideoFromImage(image, {
    durationSec: 5,
    width: 720,
    height: 1280,
    narrationUrl: job.audio_url,
    onProgress: (ratio) => logVideoEvent("VIDEO_RENDER_PROGRESS", { jobId: job.id, progress: Math.round(75 + ratio * 15), stage: "legacy_canvas" }),
  });
  return persistRenderedUrl(job.id, url, "mp4");
}

export async function renderBrowserFallbackForJob(job: BrowserRenderJob): Promise<{ ok: boolean; videoUrl?: string; error?: string }> {
  const images = resolveImages(job);
  if (images.length === 0) {
    await updateJob(job.id, {
      status: "failed", progress: 100, video_url: null, error: "image_url_required",
      metadata: { ...(job.metadata || {}), pipeline_lock: false, needs_browser_render: false },
    });
    return { ok: false, error: "image_url_required" };
  }

  const baseMeta = job.metadata || {};
  let timeoutId: number | undefined;
  await updateJob(job.id, {
    status: "fallback_processing",
    progress: 80,
    error: null,
    provider: "browser",
    render_mode: "hybrid_browser",
    metadata: { ...baseMeta, pipeline_lock: true, needs_browser_render: true, browser_render_started_at: new Date().toISOString() },
  });

  const renderPromise = (async () => {
    const attempts: Array<[string, () => Promise<string>]> = [
      ["ffmpeg.wasm", () => renderWithFfmpeg(job)],
      ["legacy_canvas", () => renderWithLegacyImage(job)],
      ["canvas_capture", () => canvasCaptureFallback(job)],
    ];

    for (const [name, run] of attempts) {
      try {
        logVideoEvent("VIDEO_RENDER_STARTED", { jobId: job.id, fallback: name });
        const url = await run();
        const v = validateVideoUrl(url, { allowedImageUrl: job.image_url });
        if (!v.ok) throw new Error(v.reason || "fallback_render_required");
        return { url, name };
      } catch (error: any) {
        const msg = error?.message || "render_failed";
        logVideoEvent("VIDEO_RENDER_FAILED", { jobId: job.id, fallback: name, error: msg });
        await updateJob(job.id, {
          progress: 85,
          error: msg,
          metadata: { ...baseMeta, pipeline_lock: true, needs_browser_render: true, last_browser_fallback_error: msg, last_browser_fallback: name },
        });
      }
    }
    throw new Error("fallback_render_required");
  })();

  try {
    const { url: persistedUrl, name } = await withTimeout(renderPromise, RENDER_TIMEOUT_MS, () => {
      logVideoEvent("PIPELINE_TIMEOUT", { jobId: job.id, stage: "browser_render", timeoutMs: RENDER_TIMEOUT_MS });
      timeoutId = window.setTimeout(() => undefined, 0);
    });
    window.clearTimeout(timeoutId);
    await updateJob(job.id, {
      video_url: persistedUrl,
      progress: 100,
      status: "completed",
      error: null,
      metadata: { ...baseMeta, pipeline_lock: false, needs_browser_render: false, browser_render_completed_at: new Date().toISOString(), fallback_used: name },
    });
    logVideoEvent("VIDEO_RENDER_COMPLETED", { jobId: job.id, provider: name, videoUrl: persistedUrl });
    return { ok: true, videoUrl: persistedUrl };
  } catch (err: any) {
    const raw = err?.message || "empty_video_output";
    const msg = raw === "Video vazio" || raw === "pipeline_timeout" ? (raw === "pipeline_timeout" ? "browser_render_timeout" : "empty_video_output") : raw;
    await updateJob(job.id, {
      status: "failed",
      progress: 100,
      video_url: null,
      error: msg,
      metadata: { ...baseMeta, pipeline_lock: false, needs_browser_render: false, browser_render_failed_at: new Date().toISOString() },
    });
    logVideoEvent("VIDEO_RENDER_FAILED", { jobId: job.id, error: msg, terminal: true });
    return { ok: false, error: msg };
  }
}
