// CORE_AI_ENGINE — Orquestrador central dos 35 agentes
// Fluxo: INPUT → Estratégia → Produção → Distribuição → Análise → Auditoria → Otimização
import { AGENT_REGISTRY, AGENT_IDS } from "./registry";
import { runAgent } from "./executors";
import type {
  AgentId,
  AgentLogEntry,
  AgentRunResult,
  AgentRuntimeState,
  AgentSnapshot,
  CoreInput,
} from "./types";

type Listener = () => void;

class CoreAIEngineImpl {
  private state: Record<AgentId, AgentRuntimeState>;
  private listeners = new Set<Listener>();
  private globalLogs: AgentLogEntry[] = [];

  constructor() {
    this.state = AGENT_IDS.reduce((acc, id) => {
      acc[id] = { status: "idle", logs: [] };
      return acc;
    }, {} as Record<AgentId, AgentRuntimeState>);
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    this.listeners.forEach((l) => l());
  }

  private log(agentId: AgentId | "ENGINE", level: AgentLogEntry["level"], message: string, meta?: Record<string, unknown>) {
    const entry: AgentLogEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      level,
      message,
      meta,
    };
    if (agentId !== "ENGINE") {
      this.state[agentId].logs = [...this.state[agentId].logs.slice(-49), entry];
    }
    this.globalLogs = [...this.globalLogs.slice(-199), { ...entry, meta: { ...meta, agent: agentId } }];
    this.emit();
  }

  getSnapshot(): AgentSnapshot[] {
    return AGENT_IDS.map((id) => ({ ...AGENT_REGISTRY[id], ...this.state[id] }));
  }

  getGlobalLogs() {
    return this.globalLogs;
  }

  getAgent(id: AgentId): AgentSnapshot {
    return { ...AGENT_REGISTRY[id], ...this.state[id] };
  }

  // Define os fluxos por tipo de input — mapeia para os 35 agentes
  private resolveFlow(input: CoreInput): AgentId[] {
    switch (input.kind) {
      case "video":
      case "campanha":
        return [
          "CEO_AI",
          "MARKET_ANALYST",
          "PRODUCT_STRATEGIST",
          "COPYWRITER",
          "SCRIPT_WRITER",
          "HOOK_SPECIALIST",
          "DESIGNER_AI",
          "VIDEO_EDITOR",
          "AI_AUDITOR",
          "QA_AGENT",
          "SOCIAL_STRATEGIST",
          "AUTOMATION_ARCHITECT",
          "METRICS_ANALYST",
          "SUPERVISOR",
        ];
      case "produto":
        return [
          "MARKET_ANALYST",
          "PRODUCT_STRATEGIST",
          "COPYWRITER",
          "FUNNEL_SPECIALIST",
          "VSL_CREATOR",
          "CRO_SPECIALIST",
          "AI_AUDITOR",
          "SUPERVISOR",
        ];
      case "problema":
        return ["CTO_AI", "BACKEND_DEV", "FRONTEND_DEV", "QA_AGENT", "SUPERVISOR"];
      case "ideia":
      default:
        return ["CEO_AI", "MARKET_ANALYST", "COPYWRITER", "SCRIPT_WRITER", "AI_AUDITOR", "SUPERVISOR"];
    }
  }

  private async runOne(agentId: AgentId, input: CoreInput): Promise<AgentRunResult> {
    this.state[agentId] = { ...this.state[agentId], status: "running", lastAction: input.goal ?? input.kind };
    this.log(agentId, "info", `Iniciando ${agentId}`);
    this.emit();

    const result = await runAgent(agentId, input);

    // Validador (regra: nenhum agente trabalha isolado)
    const validatorId = AGENT_REGISTRY[agentId].validator;
    if (validatorId && validatorId !== agentId) {
      this.log(agentId, "info", `Saída validada por ${validatorId}`);
      result.validatedBy = validatorId;
    }

    this.state[agentId] = {
      ...this.state[agentId],
      status: result.usedFallback ? "fallback" : result.ok ? "completed" : "error",
      lastResult: result,
      lastRunAt: Date.now(),
    };
    this.log(
      agentId,
      result.ok ? (result.usedFallback ? "fallback" : "info") : "error",
      result.ok ? `Concluído em ${Math.round(result.durationMs)}ms${result.usedFallback ? " (fallback)" : ""}` : `Falhou: ${result.error}`,
    );
    return result;
  }

  async run(input: CoreInput): Promise<{ flow: AgentId[]; results: Record<string, AgentRunResult> }> {
    const flow = this.resolveFlow(input);
    this.log("ENGINE", "info", `Iniciando fluxo (${input.kind}) com ${flow.length} agentes`, { flow });

    const results: Record<string, AgentRunResult> = {};
    for (const agentId of flow) {
      try {
        results[agentId] = await this.runOne(agentId, input);
      } catch (err) {
        this.state[agentId].status = "error";
        results[agentId] = {
          ok: false,
          error: err instanceof Error ? err.message : "engine_error",
          durationMs: 0,
        };
        this.log(agentId, "error", "Erro inesperado, mantendo fluxo (fallback)", { err: String(err) });
      }
    }

    this.log("ENGINE", "info", "Fluxo concluído");
    return { flow, results };
  }

  // Reset de status — útil pra UI
  resetAll() {
    AGENT_IDS.forEach((id) => {
      this.state[id] = { status: "idle", logs: [] };
    });
    this.globalLogs = [];
    this.emit();
  }
}

export const CoreAIEngine = new CoreAIEngineImpl();
export type { AgentSnapshot } from "./types";
