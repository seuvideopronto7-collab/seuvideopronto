/**
 * renderNativeVideo — wrapper compatível com a API solicitada no patch.
 *
 * Delega para o motor nativo já implementado em src/services/nativeRenderer/,
 * que faz:
 *  - Carregamento de imagens + áudio
 *  - Timeline com zoom suave + crossfade + fade in/out
 *  - Overlay glow / vinheta via sceneComposer (Canvas)
 *  - Encode H.264 + AAC via ffmpeg.wasm (720p ou 1080p)
 *  - Upload para Supabase Storage (bucket configurável)
 *  - Logs: VIDEO_RENDER_STARTED / PROGRESS / COMPLETED / FAILED / STORAGE_UPLOADED
 *
 * Bucket padrão neste wrapper: "generated-videos" (criado por migration).
 */
import {
  renderNativeVideo as renderNativeCore,
  type Scene,
  type NativeStage,
  type RenderNativeResult,
} from "@/services/nativeRenderer";

export type RenderVideoNativeInput = {
  /** URLs das imagens a animar (mínimo 1). */
  images: string[];
  /** URL do áudio de narração. */
  audioUrl?: string | null;
  /** URL da trilha musical de fundo. */
  musicUrl?: string | null;
  /** Nome de arquivo de saída (sem extensão). */
  outputName?: string;
  /** Job id (para logs e persistência). */
  jobId?: string;
  /** Duração de cada cena (s). Default 4. */
  sceneDurationSec?: number;
  /** Resolução: 720p (faster) ou 1080p. */
  resolution?: "720p" | "1080p";
  /** Legendas a queimar no vídeo (opcional). */
  captionText?: string;
  /** Salvar no Supabase Storage. Default true. */
  uploadToStorage?: boolean;
  /** Callback de progresso. */
  onStage?: (stage: NativeStage, progress: number) => void;
};

const RES_MAP = {
  "720p": { width: 720, height: 1280 },
  "1080p": { width: 1080, height: 1920 },
};

export async function renderVideoNative(input: RenderVideoNativeInput): Promise<RenderNativeResult> {
  if (!input.images || input.images.length === 0) {
    throw new Error("renderVideoNative: ao menos uma imagem é obrigatória");
  }

  const { width, height } = RES_MAP[input.resolution || "1080p"];
  const sceneDur = input.sceneDurationSec || 4;

  const scenes: Scene[] = input.images.map((url, i) => ({
    imageUrl: url,
    durationSec: sceneDur,
    text: i === 0 && input.captionText ? input.captionText : undefined,
    animation: i % 2 === 0 ? "ken_burns_in" : "ken_burns_out",
  }));

  return await renderNativeCore({
    jobId: input.jobId,
    scenes,
    width,
    height,
    fps: 30,
    narrationUrl: input.audioUrl || undefined,
    musicUrl: input.musicUrl || undefined,
    burnCaptions: Boolean(input.captionText),
    uploadToStorage: input.uploadToStorage !== false,
    bucket: "generated-videos",
    onStage: input.onStage,
  });
}

// Backward-compat: alguns blocos importam como default
export default renderVideoNative;
