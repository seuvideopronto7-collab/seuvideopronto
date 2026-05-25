/**
 * 🎬 VIDEO FALLBACK ENGINE — Motor central de geração em 3 camadas.
 *
 * Camada 1 (AI Premium): Edge function generate-video (Runway/Shotstack/OpenAI/Gemini)
 * Camada 2 (Backend): video-pipeline / orchestrate-pipeline (se houver jobId)
 * Camada 3 (Local Gratuito): renderVideoFromImage no navegador (FFmpeg.wasm)
 *
 * Garantia: SEMPRE retorna um videoUrl reproduzível, exceto se não houver imagem.
 */

import { supabase } from "@/integrations/supabase/client";
import { renderVideoFromImage } from "@/lib/videoRender";
import { addSystemLog } from "@/lib/systemLog";

export type VideoFormat = "9:16" | "1:1" | "16:9" | "4:5";
export type VideoAnimation =
  | "kenburns"
  | "zoom-in"
  | "zoom-out"
  | "slide-left"
  | "slide-right"
  | "slide-up"
  | "slide-down"
  | "none";

export interface VideoFallbackInput {
  imageUrl: string;
  duration?: number;
  format?: VideoFormat;
  animation?: VideoAnimation;
  headline?: string;
  subhead?: string;
  cta?: string;
  captions?: string[];
  narrationUrl?: string | null;
  musicUrl?: string | null;
  productType?: string;
  style?: string;
  prompt?: string;
}

export interface VideoFallbackOptions {
  enableAI?: boolean;
  enableBackend?: boolean;
  jobId?: string;
  onProgress?: (ratio: number) => void;
  onEngineChange?: (engine: VideoEngine, label: string) => void;
}

export type VideoEngine = "ai" | "backend" | "local";
export type VideoStatus = "completed" | "fallback_completed" | "failed";

export interface VideoFallbackResult {
  videoUrl: string | null;
  engine: VideoEngine | null;
  fallbackUsed: boolean;
  status: VideoStatus;
  errors: string[];
  metadata: {
    duration: number;
    format: VideoFormat;
    provider: string;
    generatedAt: string;
  };
}

const FORMAT_DIMENSIONS: Record<VideoFormat, { width: number; height: number }> = {
  "9:16": { width: 1080, height: 1920 },
  "1:1": { width: 1080, height: 1080 },
  "16:9": { width: 1920, height: 1080 },
  "4:5": { width: 1080, height: 1350 },
};

export const ENGINE_LABELS: Record<VideoEngine, string> = {
  ai: "IA Premium",
  backend: "Fallback Backend",
  local: "Render Local Gratuito",
};

const withTimeout = <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timeout (${ms}ms)`)), ms),
    ),
  ]);

/**
 * Tenta IA Premium via edge function generate-video.
 */
async function tryAIEngine(input: VideoFallbackInput, options: VideoFallbackOptions): Promise<string | null> {
  const { data, error } = await withTimeout(
    supabase.functions.invoke("generate-video", {
      body: {
        imageUrl: input.imageUrl,
        prompt: input.prompt || `Vídeo cinematográfico para ${input.headline || "produto"}.`,
        productType: input.productType || "Outro",
        style: input.style || "Luxo",
        createJob: false,
        duration: input.duration || 5,
        format: input.format || "9:16",
      },
    }),
    25000,
    "AI Engine",
  );
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  const url = (data as any)?.videoUrl;
  if (!url) throw new Error("AI sem videoUrl");
  return url;
}

/**
 * Tenta Backend (video-pipeline) — só se houver jobId.
 */
async function tryBackendEngine(input: VideoFallbackInput, options: VideoFallbackOptions): Promise<string | null> {
  if (!options.jobId) throw new Error("Backend exige jobId");
  const { data, error } = await withTimeout(
    supabase.functions.invoke("video-pipeline", {
      body: {
        jobId: options.jobId,
        imageUrl: input.imageUrl,
        format: input.format || "9:16",
      },
    }),
    30000,
    "Backend Engine",
  );
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  const url = (data as any)?.videoUrl || (data as any)?.video_url;
  if (!url) throw new Error("Backend sem videoUrl");
  return url;
}

/**
 * Render local — sempre funciona se houver imagem acessível.
 */
async function tryLocalEngine(input: VideoFallbackInput, options: VideoFallbackOptions): Promise<string> {
  const dims = FORMAT_DIMENSIONS[input.format || "9:16"];
  return renderVideoFromImage(input.imageUrl, {
    durationSec: input.duration || 6,
    fps: 30,
    width: dims.width,
    height: dims.height,
    animation: input.animation || "kenburns",
    fadeInSec: 0.4,
    fadeOutSec: 0.4,
    narrationUrl: input.narrationUrl || undefined,
    musicUrl: input.musicUrl || undefined,
    narrationVolume: 1,
    musicVolume: 0.35,
    enableDucking: true,
    onProgress: options.onProgress,
  });
}

/**
 * Função principal: tenta IA → Backend → Local. Sempre retorna resultado.
 */
export async function generateVideoWithFallback(
  input: VideoFallbackInput,
  options: VideoFallbackOptions = {},
): Promise<VideoFallbackResult> {
  const errors: string[] = [];
  const generatedAt = new Date().toISOString();
  const format = input.format || "9:16";
  const duration = input.duration || 6;

  if (!input.imageUrl) {
    return {
      videoUrl: null,
      engine: null,
      fallbackUsed: false,
      status: "failed",
      errors: ["imageUrl ausente"],
      metadata: { duration, format, provider: "none", generatedAt },
    };
  }

  // ── Camada 1: AI Premium ──
  if (options.enableAI !== false) {
    try {
      options.onEngineChange?.("ai", ENGINE_LABELS.ai);
      const url = await tryAIEngine(input, options);
      if (url) {
        addSystemLog({ level: "info", etapa: "video", status: "ai_completed", motivo: "AI Premium" });
        return {
          videoUrl: url,
          engine: "ai",
          fallbackUsed: false,
          status: "completed",
          errors,
          metadata: { duration, format, provider: "generate-video", generatedAt },
        };
      }
    } catch (err: any) {
      const msg = `AI: ${err?.message || err}`;
      console.warn("[videoFallbackEngine]", msg);
      errors.push(msg);
    }
  }

  // ── Camada 2: Backend ──
  if (options.enableBackend !== false && options.jobId) {
    try {
      options.onEngineChange?.("backend", ENGINE_LABELS.backend);
      const url = await tryBackendEngine(input, options);
      if (url) {
        addSystemLog({ level: "warning", etapa: "video", status: "backend_completed", motivo: "Backend fallback" });
        return {
          videoUrl: url,
          engine: "backend",
          fallbackUsed: true,
          status: "fallback_completed",
          errors,
          metadata: { duration, format, provider: "video-pipeline", generatedAt },
        };
      }
    } catch (err: any) {
      const msg = `Backend: ${err?.message || err}`;
      console.warn("[videoFallbackEngine]", msg);
      errors.push(msg);
    }
  }

  // ── Camada 3: Local (sempre tenta) ──
  try {
    options.onEngineChange?.("local", ENGINE_LABELS.local);
    const url = await tryLocalEngine(input, options);
    console.log("[VIDEO_LOCAL_RENDER_SUCCESS]", { jobId: options.jobId, isBlob: url.startsWith("blob:") });

    // Persistência: se for blob: URL, sobe para Storage e atualiza video_jobs.video_url
    let finalUrl = url;
    let persistError: string | null = null;
    if (url.startsWith("blob:")) {
      try {
        console.log("[VIDEO_STORAGE_UPLOAD_STARTED]", { jobId: options.jobId });
        const blob = await (await fetch(url)).blob();
        if (!blob || blob.size < 1000) throw new Error("blob inválido (vazio)");

        const { data: { user } } = await supabase.auth.getUser();
        const ownerPrefix = user?.id ? `${user.id}/` : "anonymous/";
        const fileName = `${ownerPrefix}fallback-${options.jobId || crypto.randomUUID()}-${Date.now()}.mp4`;

        const { error: upErr } = await supabase.storage
          .from("generated-videos")
          .upload(fileName, blob, { contentType: "video/mp4", upsert: false });
        if (upErr) throw upErr;

        const { data: signed, error: signErr } = await supabase.storage
          .from("generated-videos")
          .createSignedUrl(fileName, 60 * 60 * 24 * 7);
        if (signErr || !signed?.signedUrl) throw signErr || new Error("signed URL ausente");

        finalUrl = signed.signedUrl;
        try { URL.revokeObjectURL(url); } catch { /* noop */ }
        console.log("[VIDEO_STORAGE_UPLOAD_SUCCESS]", { jobId: options.jobId, path: fileName });

        if (options.jobId) {
          await supabase
            .from("video_jobs")
            .update({
              video_url: finalUrl,
              status: "fallback_completed",
              progress: 100,
              error: null,
            })
            .eq("id", options.jobId);
        }
      } catch (upErr: any) {
        persistError = upErr?.message || String(upErr);
        console.error("[VIDEO_STORAGE_UPLOAD_FAILED]", { jobId: options.jobId, error: persistError });
        if (options.jobId) {
          await supabase
            .from("video_jobs")
            .update({
              status: "failed",
              progress: 100,
              error: `local_persist_failed: ${persistError}`,
              error_code: "local_persist_failed",
              video_url: null,
            })
            .eq("id", options.jobId);
        }
        addSystemLog({ level: "error", etapa: "video", status: "failed", motivo: `Upload local falhou: ${persistError}` });
        errors.push(`LocalPersist: ${persistError}`);
        return {
          videoUrl: null,
          engine: null,
          fallbackUsed: true,
          status: "failed",
          errors,
          metadata: { duration, format, provider: "none", generatedAt },
        };
      }
    } else if (options.jobId) {
      // URL já persistida (ex.: signed URL)
      await supabase
        .from("video_jobs")
        .update({ video_url: finalUrl, status: "fallback_completed", progress: 100, error: null })
        .eq("id", options.jobId);
    } else {
      console.warn("[VIDEO_JOB_COMPLETED_WITHOUT_URL]", { reason: "no_jobId_to_persist" });
    }

    addSystemLog({ level: "warning", etapa: "video", status: "local_completed", motivo: "Render local gratuito" });
    return {
      videoUrl: finalUrl,
      engine: "local",
      fallbackUsed: true,
      status: "fallback_completed",
      errors,
      metadata: { duration, format, provider: "native_pipeline", generatedAt, render_mode: "native_pipeline" } as any,
    };
  } catch (err: any) {
    const msg = `Local: ${err?.message || err}`;
    console.error("[videoFallbackEngine]", msg);
    errors.push(msg);
    addSystemLog({ level: "error", etapa: "video", status: "failed", motivo: msg });
    return {
      videoUrl: null,
      engine: null,
      fallbackUsed: true,
      status: "failed",
      errors,
      metadata: { duration, format, provider: "none", generatedAt },
    };
  }
}


/**
 * Mensagem amigável de status.
 */
export function getFriendlyStatusMessage(result: VideoFallbackResult): string {
  if (result.status === "completed" && result.engine === "ai") {
    return "✅ Vídeo gerado com IA Premium";
  }
  if (result.engine === "backend") {
    return "✅ Vídeo gerado (Fallback Backend)";
  }
  if (result.engine === "local") {
    return "✅ Vídeo gerado em modo gratuito local";
  }
  return "❌ Não foi possível gerar o vídeo";
}
