/**
 * CapCut PRO Kit Generator
 * Generates a complete editing kit: script, synced subtitles, music suggestion, and instructions.
 */

export interface CapCutKit {
  videoUrl: string | null;
  roteiro: string;
  legendas: { start: number; end: number; text: string }[];
  musicaSugerida: string;
  estilo: string;
  cta: string;
  instrucoes: string[];
  template: CapCutTemplate;
}

export interface CapCutTemplate {
  id: string;
  label: string;
  nicho: string;
  corPrincipal: string;
  fonteSugerida: string;
  efeitoSugerido: string;
  musicaBase: string;
  dicasEdicao: string[];
}

interface JobData {
  title: string;
  copy_base: string;
  niche: string;
  objective: string;
  cta: string;
  platform: string;
  duration: string;
  voice: string;
  script_mode: string;
}

const COPY_BANK: Record<string, string[]> = {
  pet: [
    "Seu pet pode estar sofrendo em silêncio…",
    "Você percebe esses sinais?",
    "Falta de energia, tristeza, queda de pelo…",
    "Isso não é normal.",
    "Clique agora e descubra como ajudar seu pet hoje.",
  ],
  emagrecimento: [
    "Você já tentou de tudo pra emagrecer?",
    "Dieta, exercício, chá… e nada funciona.",
    "O problema não é o que você come.",
    "É o que ninguém te contou sobre metabolismo.",
    "Descubra o método que está mudando tudo.",
  ],
  renda_extra: [
    "Enquanto você dorme, alguém está lucrando.",
    "Não é sorte. É método.",
    "Com R$50 e um celular você começa hoje.",
    "Milhares já estão fazendo isso.",
    "Clique e comece agora mesmo.",
  ],
  beleza: [
    "Sua pele está pedindo socorro…",
    "Você usa os produtos errados sem saber.",
    "Isso acelera o envelhecimento.",
    "Existe um truque simples que muda tudo.",
    "Veja o resultado em 7 dias.",
  ],
  fitness: [
    "Treinar mais não significa resultado melhor.",
    "Você está sabotando seu corpo sem saber.",
    "O segredo está no que você faz FORA da academia.",
    "Poucos personal trainers contam isso.",
    "Descubra agora o protocolo que funciona.",
  ],
  tecnologia: [
    "Seu celular pode fazer isso e você não sabia.",
    "Essa função está escondida há anos.",
    "99% das pessoas nunca usaram.",
    "Quando você descobrir, vai se arrepender de não saber antes.",
    "Ative agora em 2 toques.",
  ],
  autoridade: [
    "As pessoas seguem quem tem autoridade.",
    "Mas autoridade não se pede — se demonstra.",
    "Uma dica: conteúdo consistente = confiança.",
    "Você precisa de um método pra isso.",
    "Clique e veja como construir sua marca.",
  ],
};

const MUSIC_MAP: Record<string, Record<string, string>> = {
  vendas: {
    default: "Cinematic Emotional — piano + strings, tensão crescente",
    pet: "Soft Emotional — piano suave, tom acolhedor",
    fitness: "Motivational Epic — batida forte, energia alta",
    tecnologia: "Tech Corporate — synth minimalista, futurista",
  },
  autoridade: {
    default: "Corporate Inspiring — orquestra leve, confiança",
    fitness: "Power Anthem — batida forte, empoderamento",
  },
  engajamento: {
    default: "Upbeat Trendy — lo-fi / trap leve, trending TikTok",
    pet: "Cute Playful — ukulele, xilofone, tom leve",
  },
};

// ── TEMPLATES POR NICHO ──────────────────────────────────────
export const CAPCUT_TEMPLATES: CapCutTemplate[] = [
  {
    id: "tpl-emagrecimento",
    label: "🥗 Emagrecimento",
    nicho: "emagrecimento",
    corPrincipal: "#22c55e",
    fonteSugerida: "Montserrat Bold",
    efeitoSugerido: "Zoom In lento + Flash no CTA",
    musicaBase: "Motivational Piano — tom inspirador, esperança",
    dicasEdicao: [
      "Use antes/depois com transição de deslizar",
      "Texto grande no gancho (primeiros 2s)",
      "Cor verde para resultados positivos",
      "CTA com fundo vermelho urgente",
    ],
  },
  {
    id: "tpl-renda",
    label: "💰 Renda Extra",
    nicho: "renda_extra",
    corPrincipal: "#f59e0b",
    fonteSugerida: "Inter Black",
    efeitoSugerido: "Shake + Zoom rápido nos números",
    musicaBase: "Trap Motivacional — bass pesado, confiança",
    dicasEdicao: [
      "Mostre valores em R$ com animação de contagem",
      "Use capturas de tela de resultados",
      "Fundo escuro com texto amarelo/dourado",
      "Urgência: 'Vagas limitadas' no final",
    ],
  },
  {
    id: "tpl-pet",
    label: "🐶 Pet",
    nicho: "pet",
    corPrincipal: "#f97316",
    fonteSugerida: "Poppins SemiBold",
    efeitoSugerido: "Transição suave + coração animado",
    musicaBase: "Cute Playful — ukulele + xilofone, tom leve",
    dicasEdicao: [
      "Comece com close do pet (gera empatia)",
      "Use emojis de patinha 🐾 nas legendas",
      "Tom emocional: preocupação → solução → alívio",
      "CTA suave: 'Cuide do seu pet hoje'",
    ],
  },
  {
    id: "tpl-autoridade",
    label: "👤 Autoridade",
    nicho: "autoridade",
    corPrincipal: "#7b2fff",
    fonteSugerida: "Space Grotesk Bold",
    efeitoSugerido: "Fade in elegante + Lower Third",
    musicaBase: "Corporate Inspiring — orquestra suave, confiança",
    dicasEdicao: [
      "Use sua foto ou logo nos primeiros 2s",
      "Fonte clean e minimalista",
      "Fundo escuro com destaques em roxo",
      "Finalize com 'Siga para mais conteúdo'",
    ],
  },
  {
    id: "tpl-fitness",
    label: "🏋️ Fitness",
    nicho: "fitness",
    corPrincipal: "#ef4444",
    fonteSugerida: "Bebas Neue",
    efeitoSugerido: "Speed Ramp + Glitch no gancho",
    musicaBase: "Power Anthem — batida forte, empoderamento",
    dicasEdicao: [
      "Comece com ação intensa (exercício forte)",
      "Use câmera lenta no momento de impacto",
      "Texto em caixa alta, fonte bold",
      "CTA: 'Comece seu treino agora'",
    ],
  },
  {
    id: "tpl-beleza",
    label: "💄 Estética / Beleza",
    nicho: "beleza",
    corPrincipal: "#ec4899",
    fonteSugerida: "Playfair Display",
    efeitoSugerido: "Glow suave + transição de blur",
    musicaBase: "Soft Lo-fi — piano suave, som relaxante",
    dicasEdicao: [
      "Iluminação quente no rosto",
      "Antes/depois com wipe transition",
      "Tons rosa e dourado nas legendas",
      "CTA: 'Descubra o segredo'",
    ],
  },
];

export function resolveTemplate(niche: string): CapCutTemplate {
  const key = niche?.toLowerCase() || "";
  return (
    CAPCUT_TEMPLATES.find((t) => key.includes(t.nicho)) ||
    CAPCUT_TEMPLATES.find((t) => t.nicho === "autoridade")!
  );
}

function parseDuration(dur: string): number {
  if (dur.includes("min")) return parseInt(dur) * 60;
  return parseInt(dur) || 30;
}

export function generateCapCutKit(job: JobData, videoUrl: string | null): CapCutKit {
  // 1. Resolve script lines
  const nichoKey = Object.keys(COPY_BANK).find((k) => job.niche?.toLowerCase().includes(k));
  let lines: string[];

  if (job.copy_base && job.copy_base.trim().length > 20) {
    lines = job.copy_base
      .split(/\n|(?<=\.)\s+/)
      .map((l) => l.trim())
      .filter((l) => l.length > 5);
    if (lines.length < 3) lines = COPY_BANK[nichoKey || ""] || COPY_BANK.pet;
  } else {
    lines = COPY_BANK[nichoKey || ""] || COPY_BANK.pet;
  }

  // 2. Generate synced subtitles
  const totalSec = parseDuration(job.duration);
  const avgPerLine = totalSec / lines.length;
  let cursor = 0;
  const legendas = lines.map((text) => {
    const start = Math.round(cursor * 10) / 10;
    const end = Math.round((cursor + avgPerLine) * 10) / 10;
    cursor += avgPerLine;
    return { start, end, text };
  });

  // 3. Music suggestion
  const objMap = MUSIC_MAP[job.objective] || MUSIC_MAP.vendas;
  const musicaSugerida = objMap[nichoKey || ""] || objMap.default;

  // 4. Style
  const estiloMap: Record<string, string> = {
    tiktok: "tiktok_high_conversion",
    reels: "instagram_reels_viral",
    shorts: "youtube_shorts_hook",
    stories: "stories_fast_swipe",
    feed: "feed_premium_square",
    youtube: "youtube_cinematic",
  };
  const estilo = estiloMap[job.platform] || "tiktok_high_conversion";

  // 5. Template by niche
  const template = resolveTemplate(job.niche);

  // 6. Instructions
  const instrucoes = [
    "📥 1. Importe o vídeo baixado no CapCut",
    "📝 2. Vá em 'Texto' e cole o roteiro (arquivo .txt)",
    "⏱️ 3. Sincronize com as legendas (arquivo .json)",
    `🎵 4. Adicione música: "${template.musicaBase}"`,
    `🎨 5. Use a fonte ${template.fonteSugerida} com cor ${template.corPrincipal}`,
    `✨ 6. Aplique efeito: ${template.efeitoSugerido}`,
    `🎯 7. CTA final: "${job.cta || "Clique no link da bio"}"`,
    "🚀 8. Exporte em 1080x1920 (9:16) e publique!",
  ];

  return {
    videoUrl,
    roteiro: lines.join("\n\n"),
    legendas,
    musicaSugerida,
    estilo,
    cta: job.cta || "Clique no link da bio",
    instrucoes,
    template,
  };
}

/** Download a text string as a file */
export function downloadTextFile(content: string, filename: string, type = "text/plain") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
