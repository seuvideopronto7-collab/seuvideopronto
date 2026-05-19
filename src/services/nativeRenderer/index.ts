/**
 * 🎬 nativeRenderer — Motor nativo de vídeo 100% client-side.
 *
 * Pipeline:
 *   10  VIDEO_RENDER_STARTED        — setup + ffmpeg load
 *   30  VIDEO_SCENE_GENERATED       — todas as cenas renderizadas + concat
 *   50  VIDEO_MEDIAPIPE_COMPLETE    — animação com foco (ou MEDIAPIPE_SKIPPED)
 *   70  AUDIO_MIXED                 — narração + música mixadas
 *   85  VIDEO_FFMPEG_RENDERED       — legenda queimada + encode final 1080x1920
 *  100  VIDEO_UPLOAD_COMPLETE       — upload Supabase storage + video_url
 *
 * Saídas Reels/TikTok: 1080x1920, H.264 (libx264), AAC 192k, faststart.
 * Funciona sem APIs externas: se narração/música/MediaPipe faltarem, segue em frente.
 */

import { supabase } from "@/integrations/supabase/client";
import { getFFmpeg, safeDelete } from "./ffmpegService";
import { composeScenes, concatSegments, type Scene } from "./sceneComposer";
import { burnSubtitles } from "./subtitleBurner";
import { mixAudio } from "./audioMixer";

export type { Scene } from "./sceneComposer";
export type { AnimationKind } from "./mediaPipeAnimator";

export type NativeStage =
  | "VIDEO_RENDER_STARTED"
  | "VIDEO_SCENE_GENERATED"
  | "VIDEO_MEDIAPIPE_COMPLETE"
  | "MEDIAPIPE_SKIPPED"
  | "AUDIO_MIXED"
  | "VIDEO_FFMPEG_RENDERED"
  | "VIDEO_UPLOAD_COMPLETE"
  | "VIDEO_RENDER_FAILED";

const STAGE_PROGRESS: Record<NativeStage, number> = {
  VIDEO_RENDER_STARTED: 10,
  VIDEO_SCENE_GENERATED: 30,
  VIDEO_MEDIAPIPE_COMPLETE: 50,
  MEDIAPIPE_SKIPPED: 50,
  AUDIO_MIXED: 70,
  VIDEO_FFMPEG_RENDERED: 85,
  VIDEO_UPLOAD_COMPLETE: 100,
  VIDEO_RENDER_FAILED: 0,
};

export interface RenderNativeInput {
  jobId?: string;
  scenes: Scene[];
  width?: number;
  height?: number;
  fps?: number;
  narrationUrl?: string | null;
  musicUrl?: string | null;
  narrationVolume?: number;
  musicVolume?: number;
  enableDucking?: boolean;
  useMediaPipe?: boolean;
  burnCaptions?: boolean;
  uploadToStorage?: boolean;
  bucket?: string;
  onStage?: (stage: NativeStage, progress: number) => void;
}

export interface RenderNativeResult {
  videoUrl: string;
  blob: Blob;
  storagePath?: string;
  durationSec: number;
  mediaPipeUsed: boolean;
  renderMode: "native_pipeline";
  status: "fallback_completed";
  width: number;
  height: number;
}

const logStage = async (jobId: string | undefined, stage: NativeStage, extra: Record<string, unknown> = {}) => {
  const progress = STAGE_PROGRESS[stage];
  console.log(`[nativeRenderer] ${stage} (${progress}%)`, extra);
  if (!jobId) return;
  try {
    await supabase.from("job_logs" as never).insert({
      job_id: jobId,
      stage: "render",
      level: stage === "VIDEO_RENDER_FAILED" ? "error" : "info",
      message: stage,
      payload_json: { progress, render_mode: "native_pipeline", ...extra },
    } as never);
  } catch {
    /* job_logs pode não existir / FK falhar — best-effort */
  }
  try {
    if (stage !== "VIDEO_RENDER_FAILED") {
      await supabase
        .from("video_jobs")
        .update({ progress, status: stage === "VIDEO_UPLOAD_COMPLETE" ? "concluido" : "processando" } as never)
        .eq("id", jobId);
    }
  } catch {
    /* tolerante a schema */
  }
};

export const renderNativeVideo = async (
  input: RenderNativeInput,
): Promise<RenderNativeResult> => {
  const width = input.width ?? 1080;
  const height = input.height ?? 1920;
  const fps = input.fps ?? 30;
  const useMediaPipe = input.useMediaPipe ?? true;
  const burn = input.burnCaptions ?? true;
  const upload = input.uploadToStorage ?? true;
  const bucket = input.bucket ?? "videos";
  const jobId = input.jobId;

  if (!input.scenes || input.scenes.length === 0) {
    await logStage(jobId, "VIDEO_RENDER_FAILED", { reason: "no_scenes" });
    throw new Error("renderNativeVideo: pelo menos uma cena é obrigatória");
  }

  const emit = (stage: NativeStage, extra: Record<string, unknown> = {}) => {
    input.onStage?.(stage, STAGE_PROGRESS[stage]);
    return logStage(jobId, stage, extra);
  };

  try {
    // 10 — setup + ffmpeg
    await emit("VIDEO_RENDER_STARTED", { scenes: input.scenes.length, width, height, fps });
    const ffmpeg = await getFFmpeg();

    // 30 — render de cenas + concat
    const { segments, totalDurationSec } = await composeScenes(ffmpeg, input.scenes, {
      width,
      height,
      fps,
      useMediaPipe,
    });
    const timeline = await concatSegments(ffmpeg, segments, "timeline.mp4");
    await emit("VIDEO_SCENE_GENERATED", { scenes: input.scenes.length, duration: totalDurationSec });

    // 50 — MediaPipe (já aplicado em composeScenes; aqui só sinaliza)
    await emit(useMediaPipe ? "VIDEO_MEDIAPIPE_COMPLETE" : "MEDIAPIPE_SKIPPED");

    // 70 — mix de áudio
    const mixed = await mixAudio(
      ffmpeg,
      timeline,
      {
        narrationUrl: input.narrationUrl,
        musicUrl: input.musicUrl,
        narrationVolume: input.narrationVolume,
        musicVolume: input.musicVolume,
        enableDucking: input.enableDucking,
        totalDurationSec,
      },
      "mixed.mp4",
    );
    await emit("AUDIO_MIXED", { hasNarration: !!input.narrationUrl, hasMusic: !!input.musicUrl });

    // 85 — legenda queimada + encode final otimizado Reels
    const subtitled = burn ? await burnSubtitles(ffmpeg, mixed, input.scenes, "subtitled.mp4") : mixed;

    const finalName = "final.mp4";
    // Re-encode final para garantir bitrate/perfil mobile-friendly
    await ffmpeg.exec([
      "-i", subtitled,
      "-c:v", "libx264",
      "-profile:v", "main",
      "-level", "4.0",
      "-preset", "veryfast",
      "-b:v", "4500k",
      "-maxrate", "5000k",
      "-bufsize", "9000k",
      "-pix_fmt", "yuv420p",
      "-r", String(fps),
      "-c:a", "aac",
      "-b:a", "192k",
      "-movflags", "+faststart",
      finalName,
    ]);
    await safeDelete(ffmpeg, subtitled);
    await emit("VIDEO_FFMPEG_RENDERED", { bitrate: "4500k", codec: "h264/aac" });

    const data = await ffmpeg.readFile(finalName);
    await safeDelete(ffmpeg, finalName);
    const blob = new Blob([(data as Uint8Array).buffer], { type: "video/mp4" });

    // 100 — upload (ou blob URL)
    let videoUrl = URL.createObjectURL(blob);
    let storagePath: string | undefined;

    if (upload) {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const uid = userData.user?.id ?? "anon";
        storagePath = `${uid}/${jobId ?? `native-${Date.now()}`}.mp4`;
        const { error: upErr } = await supabase.storage
          .from(bucket)
          .upload(storagePath, blob, { contentType: "video/mp4", upsert: true });
        if (upErr) throw upErr;
        const { data: signed } = await supabase.storage
          .from(bucket)
          .createSignedUrl(storagePath, 60 * 60 * 24 * 7);
        if (signed?.signedUrl) videoUrl = signed.signedUrl;
      } catch (err) {
        console.warn("[nativeRenderer] upload falhou, mantendo blob URL:", err);
      }
    }

    if (jobId) {
      try {
        await supabase
          .from("video_jobs")
          .update({ video_url: videoUrl, status: "concluido", progress: 100 } as never)
          .eq("id", jobId);
      } catch {
        /* tolerante */
      }
    }

    await emit("VIDEO_UPLOAD_COMPLETE", { storagePath, hasSignedUrl: Boolean(storagePath) });

    return {
      videoUrl,
      blob,
      storagePath,
      durationSec: totalDurationSec,
      mediaPipeUsed: useMediaPipe,
      renderMode: "native_pipeline",
      status: "fallback_completed",
      width,
      height,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await logStage(jobId, "VIDEO_RENDER_FAILED", { error: msg });
    if (jobId) {
      try {
        await supabase
          .from("video_jobs")
          .update({ status: "erro", error: msg } as never)
          .eq("id", jobId);
      } catch {
        /* ignore */
      }
    }
    throw err;
  }
};
