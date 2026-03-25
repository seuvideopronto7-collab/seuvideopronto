export type PlanId = "free" | "pro" | "premium";

export type PlanLimits = Record<string, number | boolean>;

export interface PlanDefinition {
  id: PlanId;
  label: string;
  price: string;
  highlight?: boolean;
  limits: PlanLimits;
  features: string[];
}

export const PLAN_DEFS: Record<PlanId, PlanDefinition> = {
  free: {
    id: "free",
    label: "FREE",
    price: "R$0",
    limits: {
      videos_dia: 2,
      watermark: true,
      fila_prioritaria: false,
    },
    features: ["2 vídeos/dia", "Marca d'água", "Fila padrão"],
  },
  pro: {
    id: "pro",
    label: "PRO",
    price: "R$97/mês",
    highlight: true,
    limits: {
      videos_dia: 20,
      watermark: false,
      fila_prioritaria: true,
    },
    features: ["20 vídeos/dia", "Sem marca d'água", "Prioridade na fila"],
  },
  premium: {
    id: "premium",
    label: "PREMIUM",
    price: "R$197/mês",
    limits: {
      videos_dia: Number.POSITIVE_INFINITY,
      watermark: false,
      fila_prioritaria: true,
      render_rapido: true,
      acesso_antecipado: true,
    },
    features: ["Ilimitado", "Render mais rápido", "Acesso antecipado"],
  },
};

export const planOrder: PlanId[] = ["free", "pro", "premium"];

export const getPlanLimits = (planId: PlanId) => PLAN_DEFS[planId].limits;

export const getPlanLabel = (planId: PlanId) => PLAN_DEFS[planId].label;

export const getVideoDailyKey = (planId: PlanId) => {
  return "videos_dia";
};

export const formatLimitLabel = (key: string) => {
  const labels: Record<string, string> = {
    videos_dia: "Vídeos/dia",
    watermark: "Marca d'água",
    fila_prioritaria: "Prioridade na fila",
    render_rapido: "Render rápido",
    acesso_antecipado: "Acesso antecipado",
  };
  return labels[key] || key;
};

export const getNextResetAt = () => {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
  return next.toISOString();
};

export const isResetDue = (resetAt?: string | null) => {
  if (!resetAt) return true;
  const now = new Date();
  return new Date(resetAt).getTime() <= now.getTime();
};
