/**
 * 🎬 ffmpegService — Singleton FFmpeg.wasm loader (browser-only).
 * Carrega ffmpeg-core a partir de assets LOCAIS em /public/ffmpeg/.
 * Sem CDN externa, sem CORS, sem 404.
 */

import type { FFmpeg } from "@ffmpeg/ffmpeg";

let ffmpegPromise: Promise<FFmpeg> | null = null;

const BASE_URL = "/ffmpeg";

export const getFFmpeg = async (): Promise<FFmpeg> => {
  if (typeof window === "undefined") throw new Error("ffmpeg_browser_only");
  if (!ffmpegPromise) {
    ffmpegPromise = (async () => {
      try {
        const { FFmpeg } = await import("@ffmpeg/ffmpeg");
        const ffmpeg = new FFmpeg();
        await ffmpeg.load({
          coreURL: `${BASE_URL}/ffmpeg-core.js`,
          wasmURL: `${BASE_URL}/ffmpeg-core.wasm`,
        });
        console.log("[FFMPEG] loaded from local /ffmpeg/");
        return ffmpeg;
      } catch (err) {
        // Reset singleton para permitir nova tentativa (ou fallback Canvas)
        ffmpegPromise = null;
        console.warn("[FFMPEG] load failed, caller should fallback to Canvas", err);
        throw err;
      }
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
