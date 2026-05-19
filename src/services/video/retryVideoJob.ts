import { supabase } from "@/integrations/supabase/client";
import { logVideoEvent } from "./videoLogger";

const PROCESSING_STATUSES = new Set([
  "pending", "queued", "processing", "rendering", "fallback_processing",
  "generating_script", "generating_voice", "generating_images",
  "generating_video", "generating_prompt", "script_ready",
]);

const retryLock = new Set<string>();
const COOLDOWN_MS = 5_000;

export type RetryableJob = {
  id: string;
  status: string;
  image_url?: string | null;
  prompt?: string | null;
};

/** Unified retry: blocks duplicates, resets status, invokes process-video-job. */
export async function retryVideoJob(job: RetryableJob): Promise<{ ok: boolean; reason?: string }> {
  if (retryLock.has(job.id)) return { ok: false, reason: "LOCKED" };
  if (PROCESSING_STATUSES.has(job.status)) return { ok: false, reason: "ALREADY_PROCESSING" };

  retryLock.add(job.id);
  try {
    await supabase
      .from("video_jobs")
      .update({ status: "pending", progress: 0, error: null })
      .eq("id", job.id);

    if (job.image_url) {
      logVideoEvent("VIDEO_NATIVE_RENDER_STARTED", { jobId: job.id });
      const { error } = await supabase.functions.invoke("process-video-job", {
        body: { jobId: job.id, imageUrl: job.image_url, prompt: job.prompt },
      });
      if (error) return { ok: false, reason: error.message };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, reason: e?.message || "UNKNOWN" };
  } finally {
    setTimeout(() => retryLock.delete(job.id), COOLDOWN_MS);
  }
}

export function isRetryLocked(jobId: string) {
  return retryLock.has(jobId);
}

/**
 * Auto-heal: if a terminal job has no video_url but has image_url, re-enqueue via native pipeline.
 * Throttled by retryLock so it won't spam.
 */
export async function autoHealJob(job: {
  id: string;
  status: string;
  video_url?: string | null;
  image_url?: string | null;
  prompt?: string | null;
}): Promise<boolean> {
  const terminal = ["completed", "done", "failed", "error", "fallback_completed"].includes(job.status);
  if (!terminal) return false;
  if (job.video_url) return false;
  if (!job.image_url) return false;
  if (retryLock.has(job.id)) return false;

  logVideoEvent("AUTO_HEAL_VIDEO_JOB", { jobId: job.id, fromStatus: job.status });
  const res = await retryVideoJob({
    id: job.id,
    status: "failed",
    image_url: job.image_url,
    prompt: job.prompt,
  });
  return res.ok;
}
