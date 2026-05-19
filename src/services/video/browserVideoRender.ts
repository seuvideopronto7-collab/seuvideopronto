import { supabase } from "@/integrations/supabase/client";
import renderVideoNative from "@/lib/video/renderNativeVideo";
import { renderVideoFromImage } from "@/lib/videoRender";
import { logVideoEvent } from "./videoLogger";

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

async function uploadBlob(jobId: string, blob: Blob, extension: "mp4" | "webm") {
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
  if (blob.size < 1000) throw new Error("empty_video_output");
  return uploadBlob(jobId, blob, preferredExt);
}

async function canvasCaptureFallback(job: BrowserRenderJob): Promise<string> {
  const imageUrl = resolveImages(job)[0];
  if (!imageUrl) throw new Error("image_url_required");

  const canvas = document.createElement("canvas");
  canvas.width = 720;
  canvas.height = 1280;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas_unavailable");

  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("image_load_failed"));
    img.src = imageUrl;
  });

  const stream = canvas.captureStream(30);
  const mime = MediaRecorder.isTypeSupported("video/mp4") ? "video/mp4" : "video/webm";
  const chunks: BlobPart[] = [];
  const recorder = new MediaRecorder(stream, { mimeType: mime });
  recorder.ondataavailable = (event) => event.data.size > 0 && chunks.push(event.data);

  const done = new Promise<Blob>((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mime }));
  });

  recorder.start();
  const start = performance.now();
  const durationMs = 6000;

  await new Promise<void>((resolve) => {
    const draw = () => {
      const elapsed = performance.now() - start;
      const t = Math.min(1, elapsed / durationMs);
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const scale = 1.08 + t * 0.08;
      const imgRatio = img.width / img.height;
      const canvasRatio = canvas.width / canvas.height;
      let drawW = canvas.width * scale;
      let drawH = drawW / imgRatio;
      if (drawH < canvas.height * scale || imgRatio > canvasRatio) {
        drawH = canvas.height * scale;
        drawW = drawH * imgRatio;
      }
      ctx.drawImage(img, (canvas.width - drawW) / 2, (canvas.height - drawH) / 2, drawW, drawH);
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#fff";
      ctx.font = "700 42px sans-serif";
      ctx.textAlign = "center";
      const caption = (job.prompt || "Seu vídeo pronto").slice(0, 60);
      ctx.fillText(caption, canvas.width / 2, canvas.height - 180, canvas.width - 80);
      if (elapsed < durationMs) requestAnimationFrame(draw);
      else resolve();
    };
    draw();
  });

  recorder.stop();
  const blob = await done;
  if (blob.size < 1000) throw new Error("empty_video_output");
  return uploadBlob(job.id, blob, mime === "video/mp4" ? "mp4" : "webm");
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
        await updateJob(job.id, {
          video_url: persistedUrl,
          progress: 100,
          status: "completed",
          error: null,
          metadata: { ...baseMeta, pipeline_lock: false, needs_browser_render: false, browser_render_completed_at: new Date().toISOString(), fallback_used: "canvas_capture" },
        });
        return { ok: true, videoUrl: persistedUrl };
      } catch (canvasError: any) {
        const msg = canvasError?.message || ffmpegError?.message || nativeError?.message || "empty_video_output";
        await updateJob(job.id, {
          status: "error",
          progress: 100,
          video_url: null,
          error: msg === "Video vazio" ? "empty_video_output" : msg,
          metadata: { ...baseMeta, pipeline_lock: false, needs_browser_render: false, browser_render_failed_at: new Date().toISOString() },
        });
        logVideoEvent("VIDEO_PIPELINE_FAILED", { jobId: job.id, error: msg });
        return { ok: false, error: msg };
      }
    }
  }
}
