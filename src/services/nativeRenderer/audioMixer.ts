/**
 * 🔊 audioMixer — Mixa narração + música em uma única trilha AAC.
 *
 * - Narração: volume cheio (1.0 default).
 * - Música: volume reduzido (0.35 default), com ducking opcional quando há narração.
 * - Loop automático da música até o fim do vídeo.
 * - Se nenhuma trilha for fornecida, retorna o vídeo de entrada sem alterações.
 */

import type { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFileBytes, safeDelete, extFromUrl } from "./ffmpegService";

export interface MixOptions {
  narrationUrl?: string | null;
  musicUrl?: string | null;
  narrationVolume?: number;
  musicVolume?: number;
  enableDucking?: boolean;
  totalDurationSec: number;
}

export const mixAudio = async (
  ffmpeg: FFmpeg,
  inputVideo: string,
  opts: MixOptions,
  outputName = "mixed.mp4",
): Promise<string> => {
  const { narrationUrl, musicUrl, totalDurationSec } = opts;
  if (!narrationUrl && !musicUrl) return inputVideo;

  const narrationVolume = opts.narrationVolume ?? 1;
  const musicVolume = opts.musicVolume ?? 0.35;
  const enableDucking = opts.enableDucking ?? true;

  const args: string[] = ["-i", inputVideo];

  if (narrationUrl) {
    const ext = extFromUrl(narrationUrl);
    await ffmpeg.writeFile(`narration.${ext}`, await fetchFileBytes(narrationUrl));
    args.push("-i", `narration.${ext}`);
  }
  if (musicUrl) {
    const ext = extFromUrl(musicUrl);
    await ffmpeg.writeFile(`music.${ext}`, await fetchFileBytes(musicUrl));
    args.push("-stream_loop", "-1", "-i", `music.${ext}`);
  }

  const hasNar = Boolean(narrationUrl);
  const hasMus = Boolean(musicUrl);

  if (hasNar && hasMus) {
    const musicGain = enableDucking ? Math.min(musicVolume, 0.22) : musicVolume;
    const filter = [
      `[1:a]volume=${narrationVolume.toFixed(2)}[voice]`,
      `[2:a]volume=${musicGain.toFixed(2)}[music]`,
      "[voice][music]amix=inputs=2:duration=longest:dropout_transition=2[aout]",
    ].join(";");
    args.push(
      "-filter_complex", filter,
      "-map", "0:v",
      "-map", "[aout]",
      "-t", String(totalDurationSec),
      "-c:v", "copy",
      "-c:a", "aac",
      "-b:a", "192k",
      outputName,
    );
  } else if (hasNar) {
    args.push(
      "-map", "0:v",
      "-map", "1:a",
      "-t", String(totalDurationSec),
      "-c:v", "copy",
      "-c:a", "aac",
      "-b:a", "192k",
      outputName,
    );
  } else {
    args.push(
      "-map", "0:v",
      "-map", "1:a",
      "-t", String(totalDurationSec),
      "-c:v", "copy",
      "-c:a", "aac",
      "-b:a", "192k",
      outputName,
    );
  }

  await ffmpeg.exec(args);

  if (narrationUrl) await safeDelete(ffmpeg, `narration.${extFromUrl(narrationUrl)}`);
  if (musicUrl) await safeDelete(ffmpeg, `music.${extFromUrl(musicUrl)}`);
  await safeDelete(ffmpeg, inputVideo);

  return outputName;
};
