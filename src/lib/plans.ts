export type PlanId = "free" | "start" | "pro" | "premium";

export type PlanLimits = Record<string, number | boolean>;

export interface PlanDefinition {
  id: PlanId;
  label: string;
  price: string;
  priceAmount: number;
  highlight?: boolean;
  limits: PlanLimits;
  features: string[];
  stripePriceId?: string;
  stripeProductId?: string;
}

export const PLAN_DEFS: Record<PlanId, PlanDefinition> = {
  free: {
    id: "free",
    label: "FREE",
    price: "R$0",
    priceAmount: 0,
    limits: {
      videos_dia: 2,
      watermark: true,
      fila_prioritaria: false,
    },
    features: ["2 vídeos/dia", "Marca d'água", "Fila padrão"],
  },
  start: {
    id: "start",
    label: "START",
    price: "R$29/mês",
    priceAmount: 29,
    limits: {
      videos_dia: 10,
      watermark: true,
      fila_prioritaria: false,
    },
    features: ["10 vídeos/mês", "3 nichos", "Export CapCut"],
    stripePriceId: "price_1TKYr5IOSHT7dLDrICXAzw09",
    stripeProductId: "prod_UJBDGmPDOnLWTN",
  },
  pro: {
    id: "pro",
    label: "PRO",
    price: "R$97/mês",
    priceAmount: 97,
    highlight: true,
    limits: {
      videos_dia: 50,
      watermark: false,
      fila_prioritaria: true,
    },
    features: ["50 vídeos/mês", "Todos nichos", "Copy avançada", "Modo Viral Machine"],
    stripePriceId: "price_1TKYu6IOSHT7dLDrHGRVqDXM",
    stripeProductId: "prod_UJBGF9LClWjDMH",
  },
  premium: {
    id: "premium",
    label: "PREMIUM",
    price: "R$197/mês",
    priceAmount: 197,
    limits: {
      videos_dia: Number.POSITIVE_INFINITY,
      watermark: false,
      fila_prioritaria: true,
      render_rapido: true,
      acesso_antecipado: true,
    },
    features: ["Ilimitado", "IA otimizada", "Templates virais", "CRM de performance"],
    stripePriceId: "price_1TKYuWIOSHT7dLDrr7zozFeL",
    stripeProductId: "prod_UJBH0RzegE8HW1",
  },
};

export const planOrder: PlanId[] = ["free", "start", "pro", "premium"];

export const getPlanLimits = (planId: PlanId) => PLAN_DEFS[planId]?.limits ?? PLAN_DEFS.free.limits;

export const getPlanLabel = (planId: PlanId) => PLAN_DEFS[planId]?.label ?? "FREE";

export const getVideoDailyKey = (_planId: PlanId) => "videos_dia";

export const formatLimitLabel = (key: string) => {
  const labels: Record<string, string> = {
    videos_dia: "Vídeos/mês",
    watermark: "Marca d'água",
    fila_prioritaria: "Prioridade na fila",
    render_rapido: "Render rápido",
    acesso_antecipado: "Acesso antecipado",
  };
  return labels[key] || key;
};

export const getNextResetAt = () => {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0));
  return next.toISOString();
};

export const isResetDue = (resetAt?: string | null) => {
  if (!resetAt) return true;
  return new Date(resetAt).getTime() <= Date.now();
};
