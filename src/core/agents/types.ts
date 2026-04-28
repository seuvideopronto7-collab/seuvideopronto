// CORE_AI_ENGINE — Tipos centrais dos 35 agentes
// Fase 1: estrutura de dados, sem UI.

export type AgentStatus =
  | "idle"
  | "queued"
  | "running"
  | "completed"
  | "error"
  | "fallback";

export type AgentGroup =
  | "estrategia"
  | "growth_vendas"
  | "criativo"
  | "automacao"
  | "tecnologia"
  | "ia_especializada"
  | "controle";

export type AgentExecutionMode = "orchestrator" | "ai" | "hybrid";

export interface AgentLogEntry {
  id: string;
  timestamp: number;
  level: "info" | "warn" | "error" | "fallback";
  message: string;
  meta?: Record<string, unknown>;
}

export interface AgentRunResult {
  ok: boolean;
  output?: unknown;
  error?: string;
  usedFallback?: boolean;
  durationMs: number;
  validatedBy?: AgentId;
}

export interface AgentDefinition {
  id: AgentId;
  name: string;
  group: AgentGroup;
  role: string; // descrição curta da função
  mode: AgentExecutionMode;
  // ID de outro agente que valida a saída deste (regra: nenhum agente trabalha isolado)
  validator?: AgentId;
  // Prompt base quando mode inclui "ai"
  systemPrompt?: string;
}

export interface AgentRuntimeState {
  status: AgentStatus;
  lastAction?: string;
  lastResult?: AgentRunResult;
  lastRunAt?: number;
  logs: AgentLogEntry[];
}

export type AgentSnapshot = AgentDefinition & AgentRuntimeState;

// Input universal que entra no CORE_AI_ENGINE
export interface CoreInput {
  kind: "ideia" | "produto" | "campanha" | "video" | "problema" | "custom";
  payload: Record<string, unknown>;
  userId?: string;
  goal?: string;
}

export type AgentId =
  // Estratégia
  | "CEO_AI"
  | "CTO_AI"
  | "HEAD_GROWTH"
  | "MARKET_ANALYST"
  | "PRODUCT_STRATEGIST"
  // Growth & Vendas
  | "COPYWRITER"
  | "FUNNEL_SPECIALIST"
  | "TRAFFIC_MANAGER"
  | "VSL_CREATOR"
  | "CRO_SPECIALIST"
  | "SOCIAL_STRATEGIST"
  // Criativo
  | "DESIGNER_AI"
  | "ART_DIRECTOR"
  | "VIDEO_EDITOR"
  | "SCRIPT_WRITER"
  | "HOOK_SPECIALIST"
  // Automação
  | "AUTOMATION_ARCHITECT"
  | "MAKE_ENGINEER"
  | "ZAPIER_ENGINEER"
  | "BOT_BUILDER"
  | "API_INTEGRATOR"
  // Tecnologia
  | "FULLSTACK_DEV"
  | "FRONTEND_DEV"
  | "BACKEND_DEV"
  | "DEVOPS"
  | "CYBER_SECURITY"
  // IA Especializada
  | "PROMPT_ENGINEER"
  | "AI_TRAINER"
  | "DATA_ANALYST"
  | "AI_AUDITOR"
  | "MODEL_OPTIMIZER"
  // Controle
  | "FINANCIAL_ANALYST"
  | "METRICS_ANALYST"
  | "QA_AGENT"
  | "SUPERVISOR";
