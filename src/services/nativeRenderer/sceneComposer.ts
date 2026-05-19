/**
 * 🎬 sceneComposer — Compõe múltiplas cenas (imagem+texto+duração) em timeline FFmpeg.
 *
 * Cada cena vira um segmento renderizado individualmente (loop de imagem +
 * zoompan animado). Em seguida, o concat demuxer junta tudo em um único MP4.
 *
 * Funciona com 1..N cenas. Se houver só 1 cena, faz render direto.
 */

import type { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFileBytes, safeDelete, extFromUrl } from "./ffmpegService";
import { buildZoompan, detectFocus, type AnimationKind } from "./mediaPipeAnimator";

export interface Scene {
  imageUrl: string;
  text?: string;
  durationSec?: number;
  animation?: AnimationKind;
}

export interface ComposeOptions {
  width: number;
  height: number;
  fps: number;
  useMediaPipe?: boolean;
  onSceneProgress?: (index: number, total: number) => void;
}

/**
 * Renderiza cada cena como segmento MP4 silencioso e retorna a lista de nomes
 * de arquivos prontos para concat. O áudio é mixado depois em audioMixer.
 */
export const composeScenes = async (
  ffmpeg: FFmpeg,
  scenes: Scene[],
  options: ComposeOptions,
): Promise<{ segments: string[]; totalDurationSec: number }> => {
  const segments: string[] = [];
  let total = 0;

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const duration = scene.durationSec ?? 3;
    const frames = Math.max(1, Math.round(duration * options.fps));
    const animation: AnimationKind = scene.animation ?? "kenburns";

    const ext = extFromUrl(scene.imageUrl);
    const inputName = `scene_${i}.${ext}`;
    const segmentName = `seg_${i}.mp4`;

    await ffmpeg.writeFile(inputName, await fetchFileBytes(scene.imageUrl));

    const focus = options.useMediaPipe ? await detectFocus(scene.imageUrl) : undefined;
    const scale = `scale=${options.width}:${options.height}:force_original_aspect_ratio=increase`;
    const zoompan = buildZoompan(options.width, options.height, frames, animation, focus);
    const vf = [scale, zoompan].join(",");

    await ffmpeg.exec([
      "-loop", "1",
      "-i", inputName,
      "-vf", vf,
      "-t", String(duration),
      "-r", String(options.fps),
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-pix_fmt", "yuv420p",
      "-an",
      segmentName,
    ]);

    await safeDelete(ffmpeg, inputName);
    segments.push(segmentName);
    total += duration;
    options.onSceneProgress?.(i + 1, scenes.length);
  }

  return { segments, totalDurationSec: total };
};

/**
 * Concatena segmentos em um único MP4 silencioso usando concat demuxer.
 */
export const concatSegments = async (
  ffmpeg: FFmpeg,
  segments: string[],
  outputName = "timeline.mp4",
): Promise<string> => {
  if (segments.length === 1) {
    // renomeia sem reencode
    const data = await ffmpeg.readFile(segments[0]);
    await ffmpeg.writeFile(outputName, data as Uint8Array);
    await safeDelete(ffmpeg, segments[0]);
    return outputName;
  }

  const listContent = segments.map((s) => `file '${s}'`).join("\n");
  await ffmpeg.writeFile("concat.txt", new TextEncoder().encode(listContent));
  await ffmpeg.exec([
    "-f", "concat",
    "-safe", "0",
    "-i", "concat.txt",
    "-c", "copy",
    outputName,
  ]);
  await safeDelete(ffmpeg, "concat.txt");
  for (const s of segments) await safeDelete(ffmpeg, s);
  return outputName;
};
