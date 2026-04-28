// VIDEO_EDITOR — pipeline crítico de geração REAL de vídeo (MP4)
// Garante 3 camadas: PRO (Shotstack/FFmpeg backend) → IA (imagens+áudio) → FALLBACK (Canvas/MediaRecorder)
// Loop obrigatório: até 3 tentativas e nunca finaliza sem videoUrl válido.
import { supabase } from "@/integrations/supabase/client";
import { renderProvider, canvasRenderProvider } from "@/lib/providers";
import type { RenderInput, Scene } from "@/lib/providers/types";

export type VideoProvider = "shotstack" | "ia" | "browser";

export interface VideoEditorOutput {
  videoUrl: string;
  status: "success" | "fallback";
  provider: VideoProvider;
  durationMs: number;
  attempts: number;
  errors?: string[];
}

const MAX_VIDEO_ATTEMPTS = 3;

function isValidVideoUrl(url: unknown): url is string {
  if (typeof url !== "string" || url.length < 8) return false;
  if (!/^https?:\/\//i.test(url) && !url.startsWith("blob:") && !url.startsWith("data:video")) {
    return false;
  }
  // aceita .mp4, .webm, ou URLs assinadas do Supabase storage
  return /\.(mp4|webm|mov)(\?|$)/i.test(url) || url.includes("/storage/") || url.startsWith("blob:") || url.startsWith("data:video");
}

async function probeDurationOk(url: string): Promise<boolean> {
  // não bloquear pipeline em ambiente sem DOM/CORS — best-effort
  if (typeof document === "undefined") return true;
  try {
    return await new Promise<boolean>((resolve) => {
      const v = document.createElement("video");
      v.preload = "metadata";
      v.muted = true;
      const t = setTimeout(() => resolve(true), 4000);
      v.onloadedmetadata = () => {
        clearTimeout(t);
        resolve(Number.isFinite(v.duration) ? v.duration > 0 : true);
      };
      v.onerror = () => {
        clearTimeout(t);
        resolve(true); // não reprovar por CORS de probe
      };
      v.src = url;
    });
  } catch {
    return true;
  }
}

function buildScenesFromPayload(payload: Record<string, unknown>): Scene[] {
  const raw =
    (payload.scenes as Scene[] | undefined) ??
    (payload.cenas as Scene[] | undefined) ??
    (payload.script && typeof payload.script === "object"
      ? ((payload.script as { cenas?: Scene[] }).cenas as Scene[] | undefined)
      : undefined);

  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((s, i) => ({
      imageUrl: (s as Scene).imageUrl ?? "/placeholder.svg",
      text: (s as Scene).text ?? `Cena ${i + 1}`,
      durationMs: (s as Scene).durationMs ?? 2500,
      audioUrl: (s as Scene).audioUrl,
    }));
  }

  // fallback mínimo: 3 cenas neutras
  const goal = (payload.goal as string) ?? (payload.title as string) ?? "Seu Vídeo Pronto";
  return [
    { imageUrl: "/placeholder.svg", text: goal, durationMs: 2500 },
    { imageUrl: "/placeholder.svg", text: "Conteúdo gerado por IA", durationMs: 2500 },
    { imageUrl: "/placeholder.svg", text: "Assista até o fim", durationMs: 2500 },
  ];
}

// CAMADA PRO — Shotstack/FFmpeg backend via edge function
async function layerPro(input: RenderInput): Promise<{ url?: string; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke("video-pipeline", {
      body: { jobId: input.jobId, scenes: input.scenes, aspectRatio: input.aspectRatio, quality: "1080p" },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    if (!data?.videoUrl) throw new Error("Sem URL retornada pela camada PRO");
    return { url: data.videoUrl as string };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "pro_layer_failed" };
  }
}

// CAMADA IA — gera imagens+áudio e monta vídeo via render-video-pro
async function layerIA(input: RenderInput): Promise<{ url?: string; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke("render-video-pro", {
      body: { jobId: input.jobId, scenes: input.scenes, aspectRatio: input.aspectRatio, useAI: true },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    if (!data?.videoUrl) throw new Error("Sem URL retornada pela camada IA");
    return { url: data.videoUrl as string };
  } catch (e) {
    // fallback: provider unificado (já tenta Shotstack→Canvas)
    try {
      const r = await renderProvider.generate(input);
      if (r.ok && r.data?.videoUrl) return { url: r.data.videoUrl };
      return { error: r.ok ? "ia_no_url" : r.error };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "ia_layer_failed" };
    }
  }
}

// CAMADA FALLBACK — Canvas + MediaRecorder local
async function layerBrowser(input: RenderInput): Promise<{ url?: string; error?: string }> {
  try {
    if (typeof document === "undefined" || typeof MediaRecorder === "undefined") {
      return { error: "browser_unavailable" };
    }
    const r = await canvasRenderProvider.generate(input);
    if (r.ok && r.data?.videoUrl) return { url: r.data.videoUrl };
    return { error: r.ok ? "canvas_no_url" : r.error };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "browser_layer_failed" };
  }
}

const LAYERS: Array<{ name: VideoProvider; run: (i: RenderInput) => Promise<{ url?: string; error?: string }> }> = [
  { name: "shotstack", run: layerPro },
  { name: "ia", run: layerIA },
  { name: "browser", run: layerBrowser },
];

/**
 * Executa a geração REAL de vídeo com 3 camadas e até 3 tentativas globais.
 * Lança erro crítico se nenhuma camada produzir videoUrl válido.
 */
export async function runVideoEditorPipeline(payload: Record<string, unknown>): Promise<VideoEditorOutput> {
  const t0 = performance.now();
  const errors: string[] = [];
  const jobId = (payload.jobId as string) ?? `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const aspectRatio = ((payload.aspectRatio as string) ?? "9:16") as RenderInput["aspectRatio"];
  const scenes = buildScenesFromPayload(payload);
  const renderInput: RenderInput = { jobId, scenes, aspectRatio };

  let attempts = 0;
  let lastUrl: string | undefined;
  let usedProvider: VideoProvider | null = null;

  while (attempts < MAX_VIDEO_ATTEMPTS) {
    attempts++;
    for (const layer of LAYERS) {
      const { url, error } = await layer.run(renderInput);
      if (url && isValidVideoUrl(url)) {
        const durOk = await probeDurationOk(url);
        if (!durOk) {
          errors.push(`[${layer.name}] vídeo sem duração válida`);
          continue;
        }
        lastUrl = url;
        usedProvider = layer.name;
        break;
      }
      errors.push(`[${layer.name}] ${error ?? "saída inválida"}`);
    }
    if (lastUrl && usedProvider) break;
  }

  if (!lastUrl || !usedProvider) {
    throw new Error(
      `VIDEO_EDITOR_CRITICAL: nenhuma camada gerou vídeo válido após ${attempts} tentativas. Erros: ${errors.join(" | ")}`,
    );
  }

  return {
    videoUrl: lastUrl,
    status: usedProvider === "browser" ? "fallback" : "success",
    provider: usedProvider,
    durationMs: performance.now() - t0,
    attempts,
    errors: errors.length ? errors : undefined,
  };
}
