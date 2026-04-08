import { useCallback } from "react";

// ═══════════════════════════════════════
// COPY SCORING ENGINE
// ═══════════════════════════════════════
export type CopyScore = {
  total: number;
  detalhes: {
    gancho: number;
    urgencia: number;
    prova: number;
    dorEmocional: number;
    cta: number;
  };
  nivel: "fraco" | "medio" | "forte" | "ultra";
  recomendacao: string;
};

const urgenciaKeywords = ["últimas", "só hoje", "agora", "limitado", "expira", "esgotando", "última chance", "corre", "restantes", "tempo"];
const provaKeywords = ["mil", "pessoas", "mulheres", "homens", "resultados", "testaram", "comprovado", "aprovado", "depoimentos", "semana"];
const dorKeywords = ["travado", "inchad", "frustrad", "cansad", "autoestima", "espelho", "armário", "roupa", "vergonha", "sofr"];
const ctaKeywords = ["clique", "toque", "garanta", "comece", "aproveite", "quero", "compre", "acesse", "descubra"];
const ganchoPatterns = ["⚠️", "você não", "ninguém", "o problema", "pare de", "isso está", "o que", "cuidado"];

function countMatches(text: string, keywords: string[]): number {
  const lower = text.toLowerCase();
  return keywords.filter(k => lower.includes(k.toLowerCase())).length;
}

export function scoreCopy(copy: {
  gancho?: string;
  roteiro?: string;
  cta?: string;
  narracao?: string;
}): CopyScore {
  const fullText = [copy.gancho, copy.roteiro, copy.cta, copy.narracao].filter(Boolean).join(" ");

  const ganchoScore = Math.min(20, countMatches(copy.gancho || "", ganchoPatterns) * 7 + (copy.gancho && copy.gancho.length > 10 ? 6 : 0));
  const urgenciaScore = Math.min(20, countMatches(fullText, urgenciaKeywords) * 5);
  const provaScore = Math.min(20, countMatches(fullText, provaKeywords) * 5);
  const dorScore = Math.min(20, countMatches(fullText, dorKeywords) * 5);
  const ctaScore = Math.min(20, countMatches(copy.cta || fullText, ctaKeywords) * 5);

  const total = ganchoScore + urgenciaScore + provaScore + dorScore + ctaScore;

  return {
    total,
    detalhes: {
      gancho: ganchoScore,
      urgencia: urgenciaScore,
      prova: provaScore,
      dorEmocional: dorScore,
      cta: ctaScore,
    },
    nivel: total >= 80 ? "ultra" : total >= 60 ? "forte" : total >= 40 ? "medio" : "fraco",
    recomendacao:
      total >= 80 ? "Copy matadora! Pronta para vender." :
      total >= 60 ? "Boa copy. Pode melhorar urgência ou prova social." :
      total >= 40 ? "Copy mediana. Adicione mais dor emocional e gatilhos." :
      "Copy fraca. Reescreva com mais emoção, urgência e prova.",
  };
}

// ═══════════════════════════════════════
// GANCHO GENERATOR (5 TIPOS)
// ═══════════════════════════════════════
export type TipoGancho = "quebra_crenca" | "erro_comum" | "segredo" | "alerta" | "promessa_inesperada";

const ganchoTemplates: Record<TipoGancho, (produto: string) => string[]> = {
  quebra_crenca: (p) => [
    `Você NÃO precisa de dieta para ${p} funcionar`,
    `${p} não é o que você pensa — é muito melhor`,
    `Esqueça tudo que te contaram sobre ${p}`,
  ],
  erro_comum: (p) => [
    `O ERRO que te impede de ter resultados com ${p}`,
    `90% das pessoas usam ${p} do jeito ERRADO`,
    `Se você faz isso, ${p} NUNCA vai funcionar`,
  ],
  segredo: (p) => [
    `O segredo que ninguém conta sobre ${p}`,
    `Descobriram algo CHOCANTE sobre ${p}`,
    `A verdade escondida por trás de ${p}`,
  ],
  alerta: (p) => [
    `⚠️ CUIDADO com ${p} se você não fizer isso antes`,
    `⚠️ Pare AGORA se você está usando ${p} assim`,
    `⚠️ Isso está SABOTANDO seus resultados com ${p}`,
  ],
  promessa_inesperada: (p) => [
    `${p} em 7 dias? Sim, é possível — veja como`,
    `E se ${p} pudesse mudar sua vida em 1 semana?`,
    `Resultado VISÍVEL com ${p} em tempo recorde`,
  ],
};

export function gerarGanchos(produto: string, count = 5): { tipo: TipoGancho; texto: string }[] {
  const tipos: TipoGancho[] = ["quebra_crenca", "erro_comum", "segredo", "alerta", "promessa_inesperada"];
  const result: { tipo: TipoGancho; texto: string }[] = [];
  for (let i = 0; i < count; i++) {
    const tipo = tipos[i % tipos.length];
    const templates = ganchoTemplates[tipo](produto);
    result.push({ tipo, texto: templates[Math.floor(Math.random() * templates.length)] });
  }
  return result;
}

// ═══════════════════════════════════════
// SCENE STRUCTURE ENGINE
// ═══════════════════════════════════════
export const estruturaVideo = [
  "gancho",
  "dor",
  "dor_emocional",
  "promessa",
  "beneficio",
  "prova",
  "oferta",
  "cta",
] as const;

// ═══════════════════════════════════════
// COPY RANDOMIZER
// ═══════════════════════════════════════
function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function randomizeCopy(produto: string) {
  return {
    gancho: randomItem(gerarGanchos(produto, 5)).texto,
    prova: randomItem(["10.327 pessoas", "12.847 mulheres", "milhares de clientes", "8.493 resultados comprovados"]),
    cta: randomItem([
      "⏳ Clique agora — últimas unidades",
      "🔥 Garanta já com 50% OFF",
      "👉 Comece hoje sua transformação",
      "📦 Últimas unidades disponíveis",
      "⚡ Oferta expira em minutos",
    ]),
    urgencia: randomItem([
      "Só hoje", "Últimas unidades", "Enquanto durar o estoque", "Oferta relâmpago", "Desconto expira em breve",
    ]),
  };
}

// ═══════════════════════════════════════
// INTENSIDADE MAP (exposed for UI)
// ═══════════════════════════════════════
export const intensityMap = {
  1: "linguagem leve e educativa",
  2: "persuasão equilibrada",
  3: "copy agressiva focada em dor",
  4: "copy altamente emocional e direta, estilo anúncio que para scroll",
} as const;

export type IntensityLevel = keyof typeof intensityMap;

// ═══════════════════════════════════════
// HOOK
// ═══════════════════════════════════════
export function useUltraCopyEngine() {
  const score = useCallback((copy: Parameters<typeof scoreCopy>[0]) => scoreCopy(copy), []);
  const ganchos = useCallback((produto: string, count?: number) => gerarGanchos(produto, count), []);
  const randomize = useCallback((produto: string) => randomizeCopy(produto), []);

  const shouldRewrite = useCallback((copy: Parameters<typeof scoreCopy>[0]) => {
    return scoreCopy(copy).total < 70;
  }, []);

  return { score, ganchos, randomize, shouldRewrite, estruturaVideo, intensityMap };
}
