export type PlanId = "start" | "basic" | "pro";

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
  start: {
    id: "start",
    label: "START",
    price: "R$97/mês",
    limits: {
      videos_curto_dia: 10,
      duracao_curto: 3,
      vozes_ia: true,
      estilos: 1000,
      legendas_premium: true,
      editor: true,
    },
    features: ["Vídeos curtos", "IA básica", "Editor liberado", "Legendas premium"],
  },
  basic: {
    id: "basic",
    label: "BASIC",
    price: "R$197/mês",
    highlight: true,
    limits: {
      videos_curto_dia: 20,
      videos_5min_dia: 20,
      videos_12min_dia: 5,
      imagens_por_video: 90,
      thumbnails_dia: 15,
      videos_animados_dia: 30,
      editor: true,
    },
    features: ["Vídeos médios", "Thumbnails", "Volume maior", "Editor liberado"],
  },
  pro: {
    id: "pro",
    label: "PRO",
    price: "R$397/mês",
    limits: {
      videos_curto_dia: 30,
      videos_5min_dia: 30,
      videos_30min_dia: 15,
      imagens_por_video: 270,
      thumbnails_dia: 30,
      videos_animados_dia: 60,
      editor: true,
    },
    features: ["Vídeos longos", "Geração massiva", "Limites altos", "Editor liberado"],
  },
};

export const planOrder: PlanId[] = ["start", "basic", "pro"];

export const getPlanLimits = (planId: PlanId) => PLAN_DEFS[planId].limits;

export const getPlanLabel = (planId: PlanId) => PLAN_DEFS[planId].label;

export const getVideoDailyKey = (planId: PlanId) => {
  if (planId === "basic") return "videos_5min_dia";
  if (planId === "pro") return "videos_30min_dia";
  return "videos_curto_dia";
};

export const formatLimitLabel = (key: string) => {
  const labels: Record<string, string> = {
    videos_curto_dia: "Vídeos curtos/dia",
    videos_5min_dia: "Vídeos 5min/dia",
    videos_12min_dia: "Vídeos 12min/dia",
    videos_30min_dia: "Vídeos 30min/dia",
    imagens_por_video: "Imagens por vídeo",
    thumbnails_dia: "Thumbnails/dia",
    videos_animados_dia: "Vídeos animados/dia",
    duracao_curto: "Duração curta (min)",
    vozes_ia: "Voz IA",
    estilos: "Estilos",
    legendas_premium: "Legendas premium",
    editor: "Editor",
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
