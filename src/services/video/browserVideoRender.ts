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

const nonEmpty = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;

function resolveImages(job: BrowserRenderJob): string[] {
  const list = Array.isArray(job.images) ? job.images.filter(nonEmpty) : [];
  if (list.length > 0) return list;
  return nonEmpty(job.image_url) ? [job.image_url] : [];
}

async function updateJob(jobId: string, patch: Record<string, unknown>) {
  await supabase.from("video_jobs").update(patch as never).eq("id", jobId);
}

const BLOCKED_MIME = /^(image\/|text\/html|application\/json)/i;

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

async function refreshSignedUrl(url: string): Promise<string> {
  try {
    if (!url.includes("supabase.co/storage")) return url;
    const m = url.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/([^?#]+)/);
    if (!m) return url;
    const [, bucket, path] = m;
    const { data } = await supabase.storage.from(bucket).createSignedUrl(decodeURIComponent(path), 3600);
    return data?.signedUrl || url;
  } catch {
    return url;
  }
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  const fresh = await refreshSignedUrl(url);
  const tryLoad = (src: string, withCors: boolean) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      if (withCors) img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("image_load_failed"));
      img.src = src;
    });
  try { return await tryLoad(fresh, true); }
  catch {
    try {
      const res = await fetch(fresh, { mode: "cors" });
      if (!res.ok) throw new Error("fetch_failed");
      const blob = await res.blob();
      return await tryLoad(URL.createObjectURL(blob), false);
    } catch {
      return await tryLoad(fresh, false);
    }
  }
}

async function canvasCaptureFallback(job: BrowserRenderJob): Promise<string> {
  const imageUrl = resolveImages(job)[0];
  if (!imageUrl) throw new Error("image_url_required");

  const canvas = document.createElement("canvas");
  canvas.width = 720;
  canvas.height = 1280;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas_unavailable");

  const img = await loadImage(imageUrl);

  const stream = canvas.captureStream(30);
  const candidates = ["video/mp4;codecs=h264", "video/mp4", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
  const mime = candidates.find((c) => MediaRecorder.isTypeSupported(c)) || "video/webm";
  const chunks: BlobPart[] = [];
  const recorder = new MediaRecorder(stream, { mimeType: mime });
  recorder.ondataavailable = (event) => event.data.size > 0 && chunks.push(event.data);

  const done = new Promise<Blob>((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mime }));
  });

  recorder.start(100);
  const start = performance.now();
  const durationMs = 6000;

  await new Promise<void>((resolve) => {
    const draw = () => {
      const elapsed = performance.now() - start;
      const t = Math.min(1, elapsed / durationMs);
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
      lines.slice(0, 3).forEach((ln, i) => {
        ctx.fillText(ln, canvas.width / 2, canvas.height - 200 + i * 52, canvas.width - 80);
      });
      if (elapsed < durationMs) requestAnimationFrame(draw);
      else resolve();
    };
    draw();
  });

  recorder.stop();
  const blob = await done;
  if (blob.size < 1000) throw new Error("empty_video_output");
  const ext = mime.startsWith("video/mp4") ? "mp4" : "webm";
  return uploadBlob(job.id, blob, ext);
}

export async function renderBrowserFallbackForJob(job: BrowserRenderJob): Promise<{ ok: boolean; videoUrl?: string; error?: string }> {
  const images = resolveImages(job);
  if (images.length === 0) return { ok: false, error: "image_url_required" };

  const baseMeta = job.metadata || {};
  await updateJob(job.id, {
    status: "fallback_processing",
    progress: 72,
    error: null,
    provider: "browser",
    render_mode: "native_pipeline",
    metadata: { ...baseMeta, pipeline_lock: true, browser_render_started_at: new Date().toISOString() },
  });

  try {
    logVideoEvent("VIDEO_RENDER_STARTED", { jobId: job.id, fallback: "browser_renderer" });
    const native = await renderVideoNative({
      jobId: job.id,
      images,
      audioUrl: job.audio_url,
      captionText: job.prompt || undefined,
      resolution: "720p",
      uploadToStorage: true,
      onStage: (_stage, progress) => {
        updateJob(job.id, { progress: Math.max(72, Math.min(96, progress)), status: "fallback_processing" }).catch(() => {});
      },
    });
    if (!native.videoUrl || !native.blob || native.blob.size < 1000) throw new Error("empty_video_output");
    const persistedUrl = native.storagePath ? native.videoUrl : await uploadBlob(job.id, native.blob, "mp4");
    const v1 = validateVideoUrl(persistedUrl, { allowedImageUrl: job.image_url });
    if (!v1.ok) {
      logVideoEvent("PIPELINE_INVALID_VIDEO_URL", { jobId: job.id, stage: "native_renderer", reason: v1.reason, url: persistedUrl });
      throw new Error("fallback_render_required");
    }
    await updateJob(job.id, {
      video_url: persistedUrl,
      progress: 100,
      status: "completed",
      error: null,
      metadata: { ...baseMeta, pipeline_lock: false, needs_browser_render: false, browser_render_completed_at: new Date().toISOString() },
    });
    logVideoEvent("VIDEO_RENDER_COMPLETED", { jobId: job.id, provider: "browser_renderer" });
    return { ok: true, videoUrl: persistedUrl };
  } catch (nativeError: any) {
    try {
      logVideoEvent("VIDEO_FALLBACK_TRIGGERED", { jobId: job.id, fallback: "ffmpeg.wasm", error: nativeError?.message });
      const url = await renderVideoFromImage(images[0], {
        durationSec: 6,
        fps: 30,
        width: 720,
        height: 1280,
        animation: "kenburns",
        narrationUrl: job.audio_url || undefined,
      });
      if (!url) throw new Error("empty_video_output");
      const persistedUrl = await persistRenderedUrl(job.id, url, "mp4");
      const v2 = validateVideoUrl(persistedUrl, { allowedImageUrl: job.image_url });
      if (!v2.ok) {
        logVideoEvent("PIPELINE_INVALID_VIDEO_URL", { jobId: job.id, stage: "ffmpeg_wasm", reason: v2.reason, url: persistedUrl });
        throw new Error("fallback_render_required");
      }
      await updateJob(job.id, {
        video_url: persistedUrl,
        progress: 100,
        status: "completed",
        error: null,
        metadata: { ...baseMeta, pipeline_lock: false, needs_browser_render: false, browser_render_completed_at: new Date().toISOString(), fallback_used: "ffmpeg.wasm" },
      });
      return { ok: true, videoUrl: persistedUrl };
    } catch (ffmpegError: any) {
      try {
        logVideoEvent("VIDEO_FALLBACK_TRIGGERED", { jobId: job.id, fallback: "canvas_capture", error: ffmpegError?.message });
        const url = await canvasCaptureFallback(job);
        if (!url) throw new Error("empty_video_output");
        const persistedUrl = url;
        const v3 = validateVideoUrl(persistedUrl, { allowedImageUrl: job.image_url });
        if (!v3.ok) {
          logVideoEvent("PIPELINE_INVALID_VIDEO_URL", { jobId: job.id, stage: "canvas_capture", reason: v3.reason, url: persistedUrl });
          throw new Error("fallback_render_required");
        }
        await updateJob(job.id, {
          video_url: persistedUrl,
          progress: 100,
          status: "completed",
          error: null,
          metadata: { ...baseMeta, pipeline_lock: false, needs_browser_render: false, browser_render_completed_at: new Date().toISOString(), fallback_used: "canvas_capture" },
        });
        return { ok: true, videoUrl: persistedUrl };
      } catch (canvasError: any) {
        const raw = canvasError?.message || ffmpegError?.message || nativeError?.message || "empty_video_output";
        const msg = raw === "Video vazio" ? "empty_video_output" : raw;
        const finalMsg = msg === "fallback_render_required" ? "fallback_render_required" : msg;
        await updateJob(job.id, {
          status: "failed",
          progress: 100,
          video_url: null,
          error: finalMsg,
          metadata: { ...baseMeta, pipeline_lock: false, needs_browser_render: false, browser_render_failed_at: new Date().toISOString() },
        });
        logVideoEvent("VIDEO_PIPELINE_FAILED", { jobId: job.id, error: finalMsg });
        return { ok: false, error: finalMsg };
      }
    }
  }
}
