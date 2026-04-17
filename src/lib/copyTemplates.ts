// Templates estáticos por nicho — usados como fallback quando a IA falha (402/429/timeout).
// Reflete o Copy Engine V2: HOOK → PROBLEMA → AGITAÇÃO → SOLUÇÃO → PROVA → CTA

export type EstiloCopy = "vsl_agressivo" | "storytelling" | "direct_response";

export interface RoteiroEstruturado {
  hook: string;
  problema: string;
  agitacao: string;
  solucao: string;
  prova: string;
  cta: string;
}

const NICHOS = {
  pet: {
    dor: "Seu pet sofre com problemas que você nem percebe — e isso pode estar reduzindo a vida dele.",
    desejo: "Um pet saudável, ativo e feliz por anos a mais ao seu lado.",
    prova: "Mais de 12.000 tutores já transformaram a rotina dos seus pets.",
  },
  saude: {
    dor: "Cansaço, inchaço, baixa autoestima — você sente isso todo dia e ninguém te explica o porquê.",
    desejo: "Acordar com energia, se olhar no espelho e amar o que vê.",
    prova: "Mais de 10.327 pessoas relataram resultados em até 21 dias.",
  },
  financas: {
    dor: "Você trabalha o mês inteiro e o dinheiro some sem você entender pra onde foi.",
    desejo: "Liberdade pra decidir, viajar e parar de viver pelo boleto.",
    prova: "Milhares de brasileiros já saíram do vermelho usando esse método.",
  },
  beleza: {
    dor: "Aquela ruga, aquela mancha, aquele cabelo que não cresce — e nenhum produto resolve.",
    desejo: "Pele firme, cabelo brilhante, autoestima lá em cima.",
    prova: "Aprovado por mais de 8.493 mulheres em todo o Brasil.",
  },
  fitness: {
    dor: "Você treina, faz dieta, e mesmo assim a barriga não some.",
    desejo: "Corpo definido, roupa caindo bem, sem precisar passar fome.",
    prova: "Mais de 15.000 pessoas conquistaram resultados visíveis em 30 dias.",
  },
  default: {
    dor: "Você já tentou de tudo e nada funcionou de verdade.",
    desejo: "Um resultado real, rápido e definitivo.",
    prova: "Milhares de pessoas já transformaram suas vidas com esse método.",
  },
} as const;

function detectNicho(nicho: string): keyof typeof NICHOS {
  const k = (nicho || "").toLowerCase();
  if (k.includes("pet") || k.includes("cachorro") || k.includes("gato")) return "pet";
  if (k.includes("saude") || k.includes("saúde") || k.includes("emagre")) return "saude";
  if (k.includes("finan") || k.includes("dinheiro") || k.includes("renda")) return "financas";
  if (k.includes("beleza") || k.includes("pele") || k.includes("cabelo")) return "beleza";
  if (k.includes("fit") || k.includes("treino") || k.includes("musculo")) return "fitness";
  return "default";
}

export function gerarRoteiroFallback(
  produto: string,
  nicho: string,
  estilo: EstiloCopy = "vsl_agressivo"
): RoteiroEstruturado {
  const n = NICHOS[detectNicho(nicho)];

  const base: RoteiroEstruturado = {
    hook: `⚠️ Pare tudo. Se você usa ${produto}, precisa ouvir isso AGORA.`,
    problema: n.dor,
    agitacao:
      "E o pior: quanto mais tempo você ignora, mais difícil fica reverter. Cada dia perdido é uma chance que escapa.",
    solucao: `Foi por isso que ${produto} foi criado — para resolver exatamente esse problema, sem complicação.`,
    prova: n.prova,
    cta: "👉 Clique no link agora e garanta o seu — últimas unidades com 50% OFF.",
  };

  if (estilo === "storytelling") {
    base.hook = `Eu também já passei por isso. E foi quando descobri ${produto}...`;
    base.cta = "Hoje quero compartilhar isso com você. Toque no link e mude sua história também.";
  } else if (estilo === "direct_response") {
    base.hook = `${produto}: o que ninguém te contou.`;
    base.cta = "Garanta o seu agora. Clique no botão abaixo.";
  }

  return base;
}

export function roteiroToFullScript(r: RoteiroEstruturado): string {
  return [r.hook, r.problema, r.agitacao, r.solucao, r.prova, r.cta].join(" ");
}
