import { supabase } from "@/integrations/supabase/client";
import { logVideoEvent } from "./videoLogger";
import { runPipelineStep } from "./runPipelineStep";

const PROCESSING_STATUSES = new Set([
  "pending", "queued", "processing", "rendering", "fallback_processing",
  "generating_script", "generating_voice", "generating_images",
  "generating_video", "generating_prompt", "script_ready",
]);

const retryLock = new Set<string>();
const COOLDOWN_MS = 5_000;
const LOCK_TTL_MS = 5 * 60 * 1000;

export type RetryableJob = {
  id: string;
  status: string;
  image_url?: string | null;
  prompt?: string | null;
  metadata?: Record<string, any> | null;
};

function corrId(jobId: string) {
  return `${jobId.slice(0, 8)}-${Date.now().toString(36)}`;
}

/** Clear stale pipeline_lock from metadata (older than LOCK_TTL). */
async function clearExpiredLock(jobId: string, metadata?: Record<string, any> | null) {
  if (!metadata?.pipeline_lock) return;
  const lockedAt = metadata.pipeline_locked_at ? Date.parse(metadata.pipeline_locked_at) : 0;
  if (Date.now() - lockedAt < LOCK_TTL_MS) return;
  logVideoEvent("PIPELINE_LOCK_EXPIRED", { jobId, lockedAt });
  await supabase
    .from("video_jobs")
    .update({
      metadata: { ...metadata, pipeline_lock: false, pipeline_lock_cleared_at: new Date().toISOString() },
    })
    .eq("id", jobId);
}

/** Unified retry: blocks duplicates, resets status, restarts full pipeline. */
export async function retryVideoJob(job: RetryableJob): Promise<{ ok: boolean; reason?: string }> {
  const cid = corrId(job.id);
  if (retryLock.has(job.id)) return { ok: false, reason: "LOCKED" };
  if (PROCESSING_STATUSES.has(job.status)) return { ok: false, reason: "ALREADY_PROCESSING" };

  retryLock.add(job.id);
  try {
    await clearExpiredLock(job.id, job.metadata);

    await supabase
      .from("video_jobs")
      .update({ status: "pending", progress: 0, error: null })
      .eq("id", job.id);

    logVideoEvent("PIPELINE_RETRY_MANUAL", {
      jobId: job.id, old_status: job.status, new_status: "pending", correlation_id: cid, timestamp: Date.now(),
    });

    if (job.image_url) {
      logVideoEvent("VIDEO_NATIVE_RENDER_STARTED", { jobId: job.id, correlation_id: cid });
      const { error } = await supabase.functions.invoke("process-video-job", {
        body: { jobId: job.id, imageUrl: job.image_url, prompt: job.prompt },
      });
      if (error) return { ok: false, reason: error.message };
    } else {
      // No image: restart pipeline from scratch
      logVideoEvent("VIDEO_AUTO_HEAL_RESET_PIPELINE", { jobId: job.id, correlation_id: cid });
      const res = await runPipelineStep(job.id);
      if (!res.ok) return { ok: false, reason: res.error || "PIPELINE_RESET_FAILED" };
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
 * Auto-heal with progressive backoff:
 *  - terminal "completed/done/fallback_completed" sem video_url → re-enfileira
 *  - "failed/error" → re-tenta até AUTO_HEAL_MAX por sessão (mesmo sem image_url)
 *  - stuck "processing/rendering/..." sem heartbeat → reset+restart
 */
const autoHealAttempts = new Map<string, number>();
const autoHealNextAt = new Map<string, number>();
const AUTO_HEAL_MAX = 3;
const BACKOFF_MS = [0, 10_000, 30_000];
const STUCK_MS = 5 * 60 * 1000;

const STUCK_STATUSES = new Set([
  "processing", "rendering", "generating_video", "generating_images",
  "generating_voice", "generating_script",
]);

export function resetAutoHealAttempts(jobId: string) {
  autoHealAttempts.delete(jobId);
  autoHealNextAt.delete(jobId);
}

export async function autoHealJob(job: {
  id: string;
  status: string;
  video_url?: string | null;
  image_url?: string | null;
  prompt?: string | null;
  updated_at?: string | null;
  metadata?: Record<string, any> | null;
}): Promise<boolean> {
  const cid = corrId(job.id);
  const isTerminalMissingUrl =
    ["completed", "done", "fallback_completed"].includes(job.status) && !job.video_url;
  const isFailed = ["failed", "error"].includes(job.status);
  const isStuck =
    STUCK_STATUSES.has(job.status) &&
    job.updated_at != null &&
    Date.now() - Date.parse(job.updated_at) > STUCK_MS;

  if (!isTerminalMissingUrl && !isFailed && !isStuck) return false;
  if (retryLock.has(job.id)) return false;

  const attempts = autoHealAttempts.get(job.id) || 0;
  if (attempts >= AUTO_HEAL_MAX) return false;

  const nextAt = autoHealNextAt.get(job.id) || 0;
  if (Date.now() < nextAt) return false;

  autoHealAttempts.set(job.id, attempts + 1);
  autoHealNextAt.set(job.id, Date.now() + (BACKOFF_MS[Math.min(attempts + 1, BACKOFF_MS.length - 1)] || 30_000));

  logVideoEvent("VIDEO_AUTO_HEAL_TRIGGERED", {
    jobId: job.id, old_status: job.status, attempts: attempts + 1, correlation_id: cid, timestamp: Date.now(),
    reason: isStuck ? "STUCK" : isFailed ? "FAILED" : "MISSING_URL",
  });

  if (isStuck) {
    logVideoEvent("PIPELINE_RECOVERY_TRIGGERED", { jobId: job.id, old_status: job.status, attempts: attempts + 1, correlation_id: cid });
  }

  if (!job.image_url) {
    logVideoEvent("VIDEO_AUTO_HEAL_NO_IMAGE", { jobId: job.id, correlation_id: cid });
  }

  logVideoEvent("VIDEO_AUTO_HEAL_RETRY", { jobId: job.id, attempt: attempts + 1, correlation_id: cid });
  logVideoEvent("PIPELINE_RETRY_AUTO", { jobId: job.id, old_status: job.status, attempts: attempts + 1, correlation_id: cid });

  const res = await retryVideoJob({
    id: job.id,
    status: "failed", // force bypass of PROCESSING guard
    image_url: job.image_url,
    prompt: job.prompt,
    metadata: job.metadata,
  });

  if (res.ok) {
    logVideoEvent("VIDEO_AUTO_HEAL_SUCCESS", { jobId: job.id, attempt: attempts + 1, correlation_id: cid });
    if (isStuck) logVideoEvent("PIPELINE_RECOVERY_SUCCESS", { jobId: job.id, correlation_id: cid });
  } else {
    logVideoEvent("VIDEO_AUTO_HEAL_FAILED", { jobId: job.id, reason: res.reason, attempt: attempts + 1, correlation_id: cid });
    if (isStuck) logVideoEvent("PIPELINE_RECOVERY_FAILED", { jobId: job.id, reason: res.reason, correlation_id: cid });
  }
  return res.ok;
}
