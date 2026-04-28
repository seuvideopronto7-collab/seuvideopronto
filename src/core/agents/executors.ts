// Executores híbridos: orquestração de features existentes OU chamada Lovable AI
// Fase 1: stubs seguros + execução de IA via edge function quando aplicável.
import { supabase } from "@/integrations/supabase/client";
import { AGENT_REGISTRY } from "./registry";
import type { AgentId, AgentRunResult, CoreInput } from "./types";

// Chama Lovable AI Gateway via edge function existente (analyze-content como ponte genérica),
// mas mantemos contrato: se não houver função dedicada, devolvemos fallback estruturado.
async function callAIAgent(agentId: AgentId, input: CoreInput): Promise<AgentRunResult> {
  const def = AGENT_REGISTRY[agentId];
  const t0 = performance.now();
  try {
    // Tenta usar edge function genérica de IA (se existir generate-script-v2 reaproveitamos prompt)
    const { data, error } = await supabase.functions.invoke("generate-script-v2", {
      body: {
        agentId,
        systemPrompt: def.systemPrompt,
        goal: input.goal ?? "",
        payload: input.payload,
        kind: input.kind,
      },
    });
    if (error) throw error;
    return {
      ok: true,
      output: data,
      durationMs: performance.now() - t0,
    };
  } catch (err) {
    // Fallback estático: agente devolve estrutura mínima previsível
    return {
      ok: true,
      usedFallback: true,
      output: {
        agent: agentId,
        fallback: true,
        note: "Resposta gerada por template local (IA indisponível ou sem crédito)",
        echo: input.payload,
      },
      durationMs: performance.now() - t0,
      error: err instanceof Error ? err.message : "ai_unavailable",
    };
  }
}

// Orquestradores: agentes que coordenam features reais do projeto (sem chamar IA diretamente)
const ORCHESTRATOR_HANDLERS: Partial<Record<AgentId, (input: CoreInput) => Promise<unknown>>> = {
  VIDEO_EDITOR: async (input) => ({ action: "render_pipeline", ref: input.payload }),
  DESIGNER_AI: async () => ({ action: "apply_design_tokens" }),
  API_INTEGRATOR: async () => ({ action: "verify_integrations" }),
  MAKE_ENGINEER: async () => ({ action: "make_webhook_ready", configured: false }),
  ZAPIER_ENGINEER: async () => ({ action: "zapier_webhook_ready", configured: false }),
  QA_AGENT: async (input) => ({ action: "qa_pass", checked: Object.keys(input.payload) }),
  METRICS_ANALYST: async () => ({ action: "collect_kpis" }),
  SUPERVISOR: async () => ({ action: "supervise_pipeline" }),
  CTO_AI: async () => ({ action: "review_architecture" }),
  DEVOPS: async () => ({ action: "check_deploy_health" }),
  CYBER_SECURITY: async () => ({ action: "scan_permissions" }),
  FRONTEND_DEV: async () => ({ action: "ui_consistency_check" }),
  BACKEND_DEV: async () => ({ action: "edge_functions_check" }),
  FULLSTACK_DEV: async () => ({ action: "feature_assembly" }),
  MODEL_OPTIMIZER: async () => ({ action: "select_cheapest_model" }),
};

async function runOrchestrator(agentId: AgentId, input: CoreInput): Promise<AgentRunResult> {
  const t0 = performance.now();
  const handler = ORCHESTRATOR_HANDLERS[agentId];
  try {
    const output = handler ? await handler(input) : { action: "noop", agent: agentId };
    return { ok: true, output, durationMs: performance.now() - t0 };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "orchestrator_error",
      durationMs: performance.now() - t0,
      usedFallback: true,
      output: { fallback: true, agent: agentId },
    };
  }
}

export async function runAgent(agentId: AgentId, input: CoreInput): Promise<AgentRunResult> {
  const def = AGENT_REGISTRY[agentId];
  if (def.mode === "ai") return callAIAgent(agentId, input);
  if (def.mode === "orchestrator") return runOrchestrator(agentId, input);
  // hybrid: tenta orquestrador primeiro, complementa com IA se houver systemPrompt
  const orchResult = await runOrchestrator(agentId, input);
  if (def.systemPrompt) {
    const aiResult = await callAIAgent(agentId, input);
    return {
      ok: orchResult.ok && aiResult.ok,
      output: { orchestration: orchResult.output, ai: aiResult.output },
      usedFallback: aiResult.usedFallback || orchResult.usedFallback,
      durationMs: orchResult.durationMs + aiResult.durationMs,
      error: aiResult.error || orchResult.error,
    };
  }
  return orchResult;
}
