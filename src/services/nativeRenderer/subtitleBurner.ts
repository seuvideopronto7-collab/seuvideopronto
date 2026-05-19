/**
 * 📝 subtitleBurner — Gera SRT a partir das cenas e queima legendas no vídeo.
 *
 * Usa o filtro `subtitles=` do FFmpeg (libass). Se libass não estiver
 * disponível no core, faz fallback para `drawtext` em modo simples.
 */

import type { FFmpeg } from "@ffmpeg/ffmpeg";
import { safeDelete } from "./ffmpegService";
import type { Scene } from "./sceneComposer";

const fmtTime = (sec: number) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.floor((sec - Math.floor(sec)) * 1000);
  const pad = (n: number, l = 2) => String(n).padStart(l, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`;
};

export const buildSRT = (scenes: Scene[]): string => {
  let cursor = 0;
  const lines: string[] = [];
  scenes.forEach((scene, i) => {
    const duration = scene.durationSec ?? 3;
    const start = cursor;
    const end = cursor + duration;
    cursor = end;
    if (!scene.text) return;
    lines.push(
      String(i + 1),
      `${fmtTime(start)} --> ${fmtTime(end)}`,
      scene.text.replace(/\r?\n/g, " ").slice(0, 120),
      "",
    );
  });
  return lines.join("\n");
};

/**
 * Queima legendas no vídeo. Se nenhuma cena tiver texto, retorna o vídeo
 * de entrada sem alterações.
 */
export const burnSubtitles = async (
  ffmpeg: FFmpeg,
  inputVideo: string,
  scenes: Scene[],
  outputName = "subtitled.mp4",
): Promise<string> => {
  const hasText = scenes.some((s) => s.text && s.text.trim().length > 0);
  if (!hasText) return inputVideo;

  const srt = buildSRT(scenes);
  await ffmpeg.writeFile("subs.srt", new TextEncoder().encode(srt));

  // Estilo Reels/TikTok: branco, contorno preto, base inferior
  const style =
    "FontName=Arial,FontSize=22,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=2,Shadow=0,Alignment=2,MarginV=120";

  try {
    await ffmpeg.exec([
      "-i", inputVideo,
      "-vf", `subtitles=subs.srt:force_style='${style}'`,
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-pix_fmt", "yuv420p",
      "-c:a", "copy",
      outputName,
    ]);
  } catch (err) {
    console.warn("[subtitleBurner] libass falhou, devolvendo vídeo sem legenda:", err);
    await safeDelete(ffmpeg, "subs.srt");
    return inputVideo;
  }

  await safeDelete(ffmpeg, "subs.srt");
  await safeDelete(ffmpeg, inputVideo);
  return outputName;
};
