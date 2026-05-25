/**
 * videoJobs — cliente leve para a rota /api/video-jobs (server.js Express).
 *
 * Patch cirúrgico:
 *  - AbortController real
 *  - timeout global (15 min)
 *  - parada em estados terminais (completed/failed/error/fallback_completed)
 *  - try/catch para evitar loop infinito em 404/HTML/JSON inválido
 *  - logs estruturados
 *
 * Observação: na maior parte do projeto o pipeline usa `src/services/api.ts`
 * (edge functions). Este módulo é mantido por compatibilidade com integrações
 * que apontam para o backend Express local.
 */

const TERMINAL_STATUSES = new Set([
  "completed",
  "done",
  "failed",
  "error",
  "fallback_completed",
]);

const DEFAULT_POLL_INTERVAL_MS = 3000;
const DEFAULT_GLOBAL_TIMEOUT_MS = 15 * 60 * 1000;

export type CreateVideoJobPayload = {
  imageUrl: string;
  productType: string;
  style: string;
  useDarkflow?: boolean;
  useViral?: boolean;
};

export type VideoJobResponse = { id: string };

export const createVideoJob = async (
  payload: CreateVideoJobPayload,
  signal?: AbortSignal,
): Promise<VideoJobResponse> => {
  const res = await fetch("/api/video-jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });
  if (!res.ok) throw new Error(`createVideoJob failed: HTTP ${res.status}`);
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    throw new Error("createVideoJob failed: resposta não-JSON (backend ausente?)");
  }
  return res.json();
};

export type PollVideoJobOptions = {
  intervalMs?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
};

export type PollHandle = {
  cancel: () => void;
  promise: Promise<any>;
};

/**
 * Faz polling de um job. Retorna `{ cancel, promise }` para permitir
 * cancelamento real (o cancelamento antigo era retornado *após* o fim do loop).
 */
export const pollVideoJob = (
  jobId: string,
  onUpdate: (job: any) => void,
  options: PollVideoJobOptions = {},
): PollHandle => {
  const interval = options.intervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const timeoutMs = options.timeoutMs ?? DEFAULT_GLOBAL_TIMEOUT_MS;

  const controller = new AbortController();
  const onExternalAbort = () => controller.abort();
  if (options.signal) {
    if (options.signal.aborted) controller.abort();
    else options.signal.addEventListener("abort", onExternalAbort, { once: true });
  }

  const timeoutId = setTimeout(() => {
    console.warn("[VIDEO_POLLING_ABORTED]", { jobId, reason: "global_timeout", timeoutMs });
    controller.abort();
  }, timeoutMs);

  console.log("[VIDEO_POLLING_STARTED]", { jobId, interval, timeoutMs });

  const promise = (async () => {
    let lastJob: any = null;
    let consecutiveErrors = 0;
    try {
      while (!controller.signal.aborted) {
        try {
          const res = await fetch(`/api/video-jobs/${jobId}`, { signal: controller.signal });
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
          }
          const ct = res.headers.get("content-type") || "";
          if (!ct.includes("application/json")) {
            throw new Error("resposta não-JSON");
          }
          const job = await res.json();
          consecutiveErrors = 0;
          lastJob = job;
          try { onUpdate(job); } catch (cbErr) {
            console.error("[VIDEO_POLLING] onUpdate threw", cbErr);
          }
          if (job?.status && TERMINAL_STATUSES.has(String(job.status))) {
            console.log("[VIDEO_POLLING_ABORTED]", { jobId, reason: "terminal_status", status: job.status });
            break;
          }
        } catch (err: any) {
          if (controller.signal.aborted || err?.name === "AbortError") break;
          consecutiveErrors += 1;
          console.warn("[VIDEO_POLLING] fetch error", { jobId, attempt: consecutiveErrors, message: err?.message });
          if (consecutiveErrors >= 5) {
            console.error("[VIDEO_POLLING_ABORTED]", { jobId, reason: "too_many_errors" });
            break;
          }
        }
        // espera respeitando abort
        await new Promise<void>((resolve) => {
          const t = setTimeout(resolve, interval);
          controller.signal.addEventListener("abort", () => { clearTimeout(t); resolve(); }, { once: true });
        });
      }
    } finally {
      clearTimeout(timeoutId);
      options.signal?.removeEventListener("abort", onExternalAbort);
    }
    return lastJob;
  })();

  return {
    cancel: () => {
      console.log("[VIDEO_POLLING_ABORTED]", { jobId, reason: "manual_cancel" });
      controller.abort();
    },
    promise,
  };
};
