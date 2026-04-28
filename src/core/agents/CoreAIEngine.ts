// CORE_AI_ENGINE — Orquestrador central com auditoria contínua e auto-correção
// Fluxo: INPUT → execução → AI_AUDITOR → fixers → re-execução parcial (até 3 ciclos)
import { AGENT_REGISTRY, AGENT_IDS } from "./registry";
import { runAgent } from "./executors";
import type {
  AgentId,
  AgentLogEntry,
  AgentRunResult,
  AgentRuntimeState,
  AgentSnapshot,
  AuditProblem,
  AuditProblemType,
  AuditReport,
  AuditSeverity,
  CoreInput,
  FixAttempt,
  RunReport,
} from "./types";

type Listener = () => void;

const MAX_ATTEMPTS = 3;

// ─── Mapeamento problema → agente corretor ──────────────────────
const FIXER_MAP: Record<AuditProblemType, AgentId> = {
  video_falhou: "VIDEO_EDITOR",
  api_falhou: "API_INTEGRATOR",
  automacao_falhou: "AUTOMATION_ARCHITECT",
  ui_bug: "FRONTEND_DEV",
  backend_erro: "BACKEND_DEV",
  performance: "DEVOPS",
  custo_alto: "MODEL_OPTIMIZER",
  ia_indisponivel: "MODEL_OPTIMIZER",
  saida_invalida: "PROMPT_ENGINEER",
  desconhecido: "SUPERVISOR",
};

export function resolveFixAgent(problema: AuditProblem): AgentId {
  return FIXER_MAP[problema.tipo] ?? "SUPERVISOR";
}

// Classifica erro a partir do resultado de um agente
function classifyError(agentId: AgentId, result: AgentRunResult): AuditProblem | null {
  if (result.ok && !result.usedFallback) return null;

  const def = AGENT_REGISTRY[agentId];
  let tipo: AuditProblemType = "desconhecido";
  let impacto: AuditSeverity = "medio";

  if (result.errorType) {
    tipo = result.errorType;
  } else if (result.usedFallback) {
    tipo = "ia_indisponivel";
    impacto = "baixo";
  } else if (def.group === "criativo" && agentId === "VIDEO_EDITOR") {
    tipo = "video_falhou";
    impacto = "critico";
  } else if (def.group === "automacao") {
    tipo = "automacao_falhou";
  } else if (def.group === "tecnologia") {
    tipo = agentId === "FRONTEND_DEV" ? "ui_bug" : "backend_erro";
    impacto = "critico";
  } else if (def.mode === "ai") {
    tipo = "saida_invalida";
  }

  return {
    agente: agentId,
    tipo,
    descricao: result.error ?? (result.usedFallback ? "Fallback acionado" : "Falha não especificada"),
    impacto,
    acao_recomendada: `Acionar ${FIXER_MAP[tipo]}`,
  };
}

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

  private log(
    agentId: AgentId | "ENGINE",
    level: AgentLogEntry["level"],
    message: string,
    meta?: Record<string, unknown>,
  ) {
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

  // Define os fluxos por tipo de input
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
    const t0 = performance.now();
    this.state[agentId] = { ...this.state[agentId], status: "running", lastAction: input.goal ?? input.kind };
    this.log(agentId, "info", `Iniciando ${agentId}`);
    this.emit();

    let result: AgentRunResult;
    try {
      result = await runAgent(agentId, input);
    } catch (err) {
      result = {
        ok: false,
        error: err instanceof Error ? err.message : "engine_error",
        errorType: "desconhecido",
        durationMs: performance.now() - t0,
      };
    }

    const validatorId = AGENT_REGISTRY[agentId].validator;
    if (validatorId && validatorId !== agentId) {
      result.validatedBy = validatorId;
      this.log(agentId, "info", `Saída validada por ${validatorId}`);
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
      result.ok
        ? `Concluído em ${Math.round(result.durationMs)}ms${result.usedFallback ? " (fallback registrado para auditoria)" : ""}`
        : `Falhou: ${result.error}`,
      { errorType: result.errorType, fallback: result.usedFallback },
    );
    return result;
  }

  // ─── AI_AUDITOR: gera relatório a partir dos resultados ────────
  private async runAuditor(
    flow: AgentId[],
    results: Record<string, AgentRunResult>,
    input: CoreInput,
  ): Promise<AuditReport> {
    const tAudit = performance.now();
    const problemas: AuditProblem[] = [];

    for (const agentId of flow) {
      if (agentId === "AI_AUDITOR" || agentId === "SUPERVISOR") continue;
      const r = results[agentId];
      if (!r) continue;
      const p = classifyError(agentId, r);
      if (p) problemas.push(p);
    }

    // Executa o agente AI_AUDITOR oficial (orquestração + IA) para registrar a auditoria
    await this.runOne("AI_AUDITOR", {
      ...input,
      goal: `Auditoria do ciclo (${problemas.length} problemas detectados)`,
      payload: { ...input.payload, problemas },
    });

    const aprovado = problemas.filter((p) => p.impacto !== "baixo").length === 0;
    const report: AuditReport = { aprovado, problemas, geradoEm: Date.now() };
    this.log("AI_AUDITOR", aprovado ? "info" : "warn", `Auditoria: ${aprovado ? "APROVADO" : `${problemas.length} problemas`}`, {
      durationMs: Math.round(performance.now() - tAudit),
      problemas,
    });
    return report;
  }

  // ─── SUPERVISOR: decide reexecução parcial vs completa ─────────
  private async runSupervisor(
    audit: AuditReport,
    flow: AgentId[],
    input: CoreInput,
  ): Promise<{ rerun: AgentId[]; mode: "parcial" | "completo" | "nenhum" }> {
    const criticos = audit.problemas.filter((p) => p.impacto === "critico");
    const medios = audit.problemas.filter((p) => p.impacto === "medio");

    let mode: "parcial" | "completo" | "nenhum" = "nenhum";
    let rerun: AgentId[] = [];

    if (criticos.length >= 3) {
      mode = "completo";
      rerun = flow;
    } else if (criticos.length > 0 || medios.length > 0) {
      mode = "parcial";
      // priorizar críticos primeiro
      const ordered = [...criticos, ...medios];
      rerun = Array.from(new Set(ordered.map((p) => p.agente)));
    }

    await this.runOne("SUPERVISOR", {
      ...input,
      goal: `Decisão: reexecução ${mode}`,
      payload: { ...input.payload, decisao: { mode, rerun, criticos: criticos.length, medios: medios.length } },
    });

    this.log("SUPERVISOR", "info", `Reexecução ${mode} — ${rerun.length} agente(s)`, { rerun });
    return { rerun, mode };
  }

  // ─── Loop de auto-correção ─────────────────────────────────────
  async run(input: CoreInput): Promise<RunReport> {
    const flow = this.resolveFlow(input);
    this.log("ENGINE", "info", `Iniciando fluxo (${input.kind}) com ${flow.length} agentes`, { flow });

    const results: Record<string, AgentRunResult> = {};
    const audits: AuditReport[] = [];
    const fixes: FixAttempt[] = [];

    let attempts = 0;
    let approved = false;
    let toRun: AgentId[] = flow.filter((a) => a !== "AI_AUDITOR" && a !== "SUPERVISOR");

    while (!approved && attempts < MAX_ATTEMPTS) {
      attempts++;
      this.log("ENGINE", "info", `Tentativa ${attempts}/${MAX_ATTEMPTS} — ${toRun.length} agente(s)`);

      // 1) execução do fluxo (ou subset)
      for (const agentId of toRun) {
        results[agentId] = await this.runOne(agentId, input);
      }

      // 2) auditoria
      const audit = await this.runAuditor(flow, results, input);
      audits.push(audit);

      if (audit.aprovado) {
        approved = true;
        break;
      }

      // 3) supervisor decide
      const { rerun, mode } = await this.runSupervisor(audit, flow, input);

      // 4) correção: roda fixer de cada problema (ordenado por impacto)
      const ordered = [...audit.problemas].sort((a, b) => {
        const w: Record<AuditSeverity, number> = { critico: 0, medio: 1, baixo: 2 };
        return w[a.impacto] - w[b.impacto];
      });

      for (const problema of ordered) {
        if (problema.impacto === "baixo") {
          this.log("ENGINE", "info", `Problema baixo registrado (apenas log): ${problema.descricao}`, { problema });
          continue;
        }
        const fixer = resolveFixAgent(problema);
        const tFix = performance.now();
        const fixResult = await this.runOne(fixer, {
          ...input,
          goal: `Corrigir ${problema.tipo} de ${problema.agente}`,
          payload: { ...input.payload, problema },
        });
        const attempt: FixAttempt = {
          problema,
          fixerAgent: fixer,
          resolved: fixResult.ok && !fixResult.usedFallback,
          durationMs: performance.now() - tFix,
          notes: fixResult.error,
        };
        fixes.push(attempt);
        this.log("ENGINE", attempt.resolved ? "info" : "warn", `Fix ${fixer} → ${problema.agente}: ${attempt.resolved ? "ok" : "falhou"}`, {
          attempt,
        });
      }

      // 5) define próximo subset (parcial/completo/nenhum)
      if (mode === "completo") {
        toRun = flow.filter((a) => a !== "AI_AUDITOR" && a !== "SUPERVISOR");
      } else if (mode === "parcial" && rerun.length > 0) {
        toRun = rerun;
      } else {
        // nada a reexecutar — encerra
        break;
      }
    }

    this.log("ENGINE", approved ? "info" : "warn", `Fluxo concluído (aprovado=${approved}, tentativas=${attempts})`);
    return { flow, results, attempts, audits, fixes, approved };
  }

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
