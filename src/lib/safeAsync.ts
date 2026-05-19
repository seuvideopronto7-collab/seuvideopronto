/**
 * safeAsync — wrapper que captura, loga estruturado e re-emite (ou retorna fallback).
 * Usado para blindar todo await crítico no pipeline de vídeo.
 */
import { logVideoEvent } from "@/services/video/videoLogger";

export type SafeAsyncContext = {
  phase: string;
  jobId?: string;
  meta?: Record<string, unknown>;
  rethrow?: boolean;
};

export async function safeAsync<T>(
  fn: () => Promise<T>,
  context: SafeAsyncContext,
): Promise<T | null> {
  try {
    return await fn();
  } catch (err: any) {
    const payload = {
      jobId: context.jobId,
      phase: context.phase,
      message: err?.message || String(err),
      stack: err?.stack?.split("\n").slice(0, 6).join("\n"),
      ...(context.meta || {}),
    };
    console.error(`[SAFE_ASYNC] ${context.phase}`, payload);
    try {
      logVideoEvent("VIDEO_PIPELINE_FAILED", payload);
    } catch {
      /* logger best-effort */
    }
    if (context.rethrow !== false) throw err;
    return null;
  }
}
