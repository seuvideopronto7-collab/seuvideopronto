/**
 * 🎬 videoRender — Wrapper de compatibilidade.
 *
 * A implementação real do render local agora vive em `src/services/nativeRenderer`.
 * Este arquivo mantém a assinatura antiga (`renderVideoFromImage(imageUrl, opts)`)
 * para não quebrar imports existentes em VideoWizard, EditorProReal, ImportContent
 * e VideoGeneratorUI. Internamente delega ao motor nativo (Ken Burns + ffmpeg.wasm
 * + audio mix + legenda queimada + encode 1080x1920 Reels/TikTok).
 */

import { renderNativeVideo } from "@/services/nativeRenderer";
import type { AnimationKind } from "@/services/nativeRenderer/mediaPipeAnimator";

type RenderOptions = {
  durationSec?: number;
  fps?: number;
  width?: number;
  height?: number;
  animation?:
    | "kenburns"
    | "zoom-in"
    | "zoom-out"
    | "slide-left"
    | "slide-right"
    | "slide-up"
    | "slide-down"
    | "none";
  fadeInSec?: number;
  fadeOutSec?: number;
  narrationUrl?: string | null;
  musicUrl?: string | null;
  narrationVolume?: number;
  musicVolume?: number;
  enableDucking?: boolean;
  onProgress?: (ratio: number) => void;
};

export const renderVideoFromImage = async (
  imageUrl: string,
  options?: RenderOptions,
): Promise<string> => {
  const duration = options?.durationSec ?? 5;
  const animation = (options?.animation ?? "kenburns") as AnimationKind;

  const result = await renderNativeVideo({
    scenes: [{ imageUrl, durationSec: duration, animation }],
    width: options?.width ?? 1080,
    height: options?.height ?? 1920,
    fps: options?.fps ?? 30,
    narrationUrl: options?.narrationUrl,
    musicUrl: options?.musicUrl,
    narrationVolume: options?.narrationVolume,
    musicVolume: options?.musicVolume,
    enableDucking: options?.enableDucking,
    useMediaPipe: true,
    burnCaptions: false,
    uploadToStorage: false,
    onStage: (_stage, progress) => options?.onProgress?.(progress / 100),
  });

  return result.videoUrl;
};
