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
 * Auto-heal:
 *  - terminal "completed/done/fallback_completed" sem video_url → re-enfileira
 *  - "failed/error" com image_url → re-tenta UMA vez por sessão (cap)
 * Throttled por retryLock + autoHealAttempts.
 */
const autoHealAttempts = new Map<string, number>();
const AUTO_HEAL_MAX = 1;

export async function autoHealJob(job: {
  id: string;
  status: string;
  video_url?: string | null;
  image_url?: string | null;
  prompt?: string | null;
}): Promise<boolean> {
  const isTerminalMissingUrl =
    ["completed", "done", "fallback_completed"].includes(job.status) && !job.video_url;
  const isFailed = ["failed", "error"].includes(job.status);
  if (!isTerminalMissingUrl && !isFailed) return false;
  if (!job.image_url) return false;
  if (retryLock.has(job.id)) return false;

  const attempts = autoHealAttempts.get(job.id) || 0;
  if (attempts >= AUTO_HEAL_MAX) return false;
  autoHealAttempts.set(job.id, attempts + 1);

  logVideoEvent("AUTO_HEAL_VIDEO_JOB", { jobId: job.id, fromStatus: job.status, attempt: attempts + 1 });
  const res = await retryVideoJob({
    id: job.id,
    status: "failed",
    image_url: job.image_url,
    prompt: job.prompt,
  });
  return res.ok;
}
