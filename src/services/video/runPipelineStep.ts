import { supabase } from "@/integrations/supabase/client";
import { logVideoEvent } from "./videoLogger";

/**
 * Dispara o orquestrador de pipeline (chained, server-side).
 * O frontend NÃO controla as etapas — apenas chuta a primeira pedrinha.
 */
export async function runPipelineStep(jobId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke("process-video-job", {
      body: { jobId },
    });
    if (error) {
      logVideoEvent("VIDEO_PLAYER_ERROR", { jobId, error: error.message });
      return { ok: false, error: error.message };
    }
    return { ok: true, ...(data || {}) };
  } catch (e: any) {
    return { ok: false, error: e?.message || "invoke_failed" };
  }
}

/** Aciona o ciclo de recovery manualmente (mesma rota usada pelo cron). */
export async function triggerPipelineRecovery() {
  return supabase.functions.invoke("process-video-job", { body: { action: "recover" } });
}
