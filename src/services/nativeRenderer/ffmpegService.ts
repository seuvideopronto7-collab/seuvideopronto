/**
 * 🎬 ffmpegService — Singleton FFmpeg.wasm BLINDADO (browser-only).
 *
 * - Single global instance via globalThis.__ffmpeg_instance
 * - Nunca carrega 2x (sem race condition)
 * - Reseta em erro fatal para permitir retry
 * - Timeout de load: 30s
 * - HEAD check em /ffmpeg/ffmpeg-core.wasm antes de carregar
 * - Sanity check: `ffmpeg.exec(["-version"])` após load
 * - Assets 100% locais (/public/ffmpeg/), sem CDN
 */

import type { FFmpeg } from "@ffmpeg/ffmpeg";

const BASE_URL = "/ffmpeg";
const LOAD_TIMEOUT_MS = 30_000;

type GlobalWithFFmpeg = typeof globalThis & {
  __ffmpeg_instance?: Promise<FFmpeg> | null;
};

const g = globalThis as GlobalWithFFmpeg;

const withTimeout = <T,>(p: Promise<T>, ms: number, label: string): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label}_timeout`)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });

async function assertWasmAvailable() {
  try {
    const res = await fetch(`${BASE_URL}/ffmpeg-core.wasm`, { method: "HEAD" });
    if (!res.ok) throw new Error(`ffmpeg_wasm_missing_${res.status}`);
  } catch (err) {
    // Em alguns servidores HEAD não é suportado — tenta GET com Range mínimo
    try {
      const res2 = await fetch(`${BASE_URL}/ffmpeg-core.wasm`, {
        method: "GET",
        headers: { Range: "bytes=0-0" },
      });
      if (!res2.ok && res2.status !== 206) throw err;
    } catch {
      throw new Error("ffmpeg_wasm_missing");
    }
  }
}

export const getFFmpeg = async (): Promise<FFmpeg> => {
  if (typeof window === "undefined") throw new Error("ffmpeg_browser_only");

  if (!g.__ffmpeg_instance) {
    g.__ffmpeg_instance = (async () => {
      try {
        await assertWasmAvailable();
        const { FFmpeg } = await import("@ffmpeg/ffmpeg");
        const ffmpeg = new FFmpeg();

        await withTimeout(
          ffmpeg.load({
            coreURL: `${BASE_URL}/ffmpeg-core.js`,
            wasmURL: `${BASE_URL}/ffmpeg-core.wasm`,
          }),
          LOAD_TIMEOUT_MS,
          "ffmpeg_load",
        );

        // Sanity check
        try {
          await withTimeout(ffmpeg.exec(["-version"]), 10_000, "ffmpeg_version");
        } catch (e) {
          console.warn("[FFMPEG] -version check failed (non-fatal)", e);
        }

        console.log("[FFMPEG] loaded singleton from /ffmpeg/");
        return ffmpeg;
      } catch (err) {
        // Reset para permitir nova tentativa
        g.__ffmpeg_instance = null;
        console.warn("[FFMPEG] load failed, caller should fallback to Canvas", err);
        throw err;
      }
    })();
  }
  return g.__ffmpeg_instance;
};

export const resetFFmpeg = async () => {
  try {
    const inst = await g.__ffmpeg_instance;
    inst?.terminate?.();
  } catch {
    /* ignore */
  }
  g.__ffmpeg_instance = null;
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
