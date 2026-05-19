/**
 * 🎬 ffmpegService — Singleton FFmpeg.wasm loader (browser).
 * Carrega ffmpeg-core via CDN, expõe exec/writeFile/readFile/deleteFile.
 * Reaproveita a instância entre renders.
 */

import type { FFmpeg } from "@ffmpeg/ffmpeg";

let ffmpegPromise: Promise<FFmpeg> | null = null;

export const getFFmpeg = async (): Promise<FFmpeg> => {
  if (!ffmpegPromise) {
    ffmpegPromise = (async () => {
      const [{ FFmpeg }, { toBlobURL }] = await Promise.all([
        import("@ffmpeg/ffmpeg"),
        import("@ffmpeg/util"),
      ]);
      const ffmpeg = new FFmpeg();
      const baseUrl = "https://unpkg.com/@ffmpeg/core@0.12.6/dist";
      const [coreURL, wasmURL, workerURL] = await Promise.all([
        toBlobURL(`${baseUrl}/ffmpeg-core.js`, "text/javascript"),
        toBlobURL(`${baseUrl}/ffmpeg-core.wasm`, "application/wasm"),
        toBlobURL(`${baseUrl}/ffmpeg-core.worker.js`, "text/javascript"),
      ]);
      await ffmpeg.load({ coreURL, wasmURL, workerURL });
      return ffmpeg;
    })();
  }
  return ffmpegPromise;
};

export const fetchFileBytes = async (url: string): Promise<Uint8Array> => {
  const { fetchFile } = await import("@ffmpeg/util");
  return fetchFile(url);
};

export const safeDelete = async (ffmpeg: FFmpeg, name: string) => {
  try {
    await ffmpeg.deleteFile(name);
  } catch {
    /* ignore */
  }
};

export const extFromUrl = (url: string): string => {
  const clean = url.split("?")[0];
  const parts = clean.split(".");
  return parts.length > 1 ? (parts.pop() as string).toLowerCase() : "jpg";
};
