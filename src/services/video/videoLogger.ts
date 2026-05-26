/**
 * Throttled video pipeline logger.
 * Same event key won't log more than once per 60s.
 */
const lastEmit = new Map<string, number>();
const THROTTLE_MS = 60_000;

export type VideoLogEvent =
  | "SHOTSTACK_INVALID_KEY"
  | "SHOTSTACK_403"
  | "VIDEO_FALLBACK_TRIGGERED"
  | "VIDEO_NATIVE_RENDER_STARTED"
  | "VIDEO_NATIVE_RENDER_COMPLETED"
  | "VIDEO_PLAYER_ERROR"
  | "AUTO_HEAL_VIDEO_JOB"
  | "VIDEO_PIPELINE_STARTED"
  | "VIDEO_RENDER_STARTED"
  | "VIDEO_RENDER_PROGRESS"
  | "VIDEO_RENDER_COMPLETED"
  | "VIDEO_RENDER_FAILED"
  | "VIDEO_UPLOAD_COMPLETED"
  | "VIDEO_EMPTY_OUTPUT"
  | "VIDEO_PIPELINE_FAILED"
  | "VIDEO_PIPELINE_RECOVERED"
  | "MEDIARECORDER_START"
  | "MEDIARECORDER_STOP"
  | "PIPELINE_TIMEOUT"
  | "PIPELINE_INVALID_VIDEO_URL"
  | "PIPELINE_FAKE_VIDEO_BLOCKED"
  | "PIPELINE_SCHEMA_FALLBACK"
  | "VIDEO_AUTO_HEAL_TRIGGERED"
  | "VIDEO_AUTO_HEAL_RETRY"
  | "VIDEO_AUTO_HEAL_RESET_PIPELINE"
  | "VIDEO_AUTO_HEAL_NO_IMAGE"
  | "VIDEO_AUTO_HEAL_FAILED"
  | "VIDEO_AUTO_HEAL_SUCCESS"
  | "PIPELINE_NUDGE"
  | "PIPELINE_STATUS_CHANGED"
  | "PIPELINE_RECOVERY_TRIGGERED"
  | "PIPELINE_RECOVERY_SUCCESS"
  | "PIPELINE_RECOVERY_FAILED"
  | "PIPELINE_LOCK_EXPIRED"
  | "PIPELINE_RETRY_MANUAL"
  | "PIPELINE_RETRY_AUTO";

const UNTHROTTLED_EVENTS = new Set<VideoLogEvent>([
  "VIDEO_RENDER_PROGRESS",
  "MEDIARECORDER_START",
  "MEDIARECORDER_STOP",
  "PIPELINE_TIMEOUT",
]);

export function logVideoEvent(event: VideoLogEvent, payload?: Record<string, unknown>) {
  const key = `${event}:${payload?.jobId ?? "global"}`;
  const now = Date.now();
  const last = lastEmit.get(key) || 0;
  if (!UNTHROTTLED_EVENTS.has(event)) {
    if (now - last < THROTTLE_MS) return;
    lastEmit.set(key, now);
  }
  // eslint-disable-next-line no-console
  console.log(`[VIDEO_PIPELINE] ${event}`, payload || {});
}
