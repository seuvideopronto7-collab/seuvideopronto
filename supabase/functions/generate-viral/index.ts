import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const rateLimitMap = new Map<string, number[]>();
const isRateLimited = (userId: string): boolean => {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(userId) || []).filter(t => now - t < 60_000);
  if (timestamps.length >= 5) return true;
  timestamps.push(now);
  rateLimitMap.set(userId, timestamps);
  return false;
};

const buildContextoMestre = (payload: {
  produto?: string;
  nicho?: string;
  publico?: string;
  dor?: string;
  objetivo?: string;
  contextoMestre?: { tema?: string; publico?: string; problema?: string; objetivo?: string };
}) => {
  const tema = (payload.contextoMestre?.tema || payload.nicho || payload.produto || "").trim();
  const publico = (payload.contextoMestre?.publico || payload.publico || "").trim();
  const problema = (payload.contextoMestre?.problema || payload.dor || "").trim();
  const objetivo = (payload.contextoMestre?.objetivo || payload.objetivo || "").trim();
  return {
    tema,
    publico,
    problema,
    objetivo,
    linguagem: "pt-BR",
    tom: "especialista",
  };
};

const requiresContext = (tipo: string) => !["dark_flow_niches"].includes(tipo);

const resolveTom = (payload: { tipo?: string; modo?: string }, objetivo?: string) => {
  const tipo = (payload.tipo || "").toLowerCase();
  const modo = (payload.modo || "").toLowerCase();
  if (modo === "viral") return "impacto";
  if (modo === "autoridade") return "especialista";
  if (modo === "vendas" || modo === "comercial") return "vendedor";
  if (tipo.includes("curso")) return "didatico";
  if (tipo.includes("vsl")) return "vendedor";
  if ((objetivo || "").toLowerCase().includes("autoridade")) return "especialista";
  return "especialista";
};

const buildNicheBank = (nicho?: string) => {
  const key = (nicho || "").toLowerCase();
  if (key.includes("fitness") || key.includes("emagrec")) {
    return ["emagrecimento", "treino rapido", "dieta pratica"];
  }
  if (key.includes("renda") || key.includes("afiliad") || key.includes("dinheiro")) {
    return ["ganhar dinheiro", "afiliados", "automacao"];
  }
  if (key.includes("saude") || key.includes("bem-estar") || key.includes("habito")) {
    return ["bem-estar", "energia", "habitos"];
  }
  return [];
};

const isGenericText = (text: string) => {
  const lowered = text.toLowerCase();
  return /big buck bunny|conteudo generico|imagem generica|video padrao|stock/i.test(lowered);
};

const includesContextAnchor = (text: string, anchors: string[]) => {
  const lowered = text.toLowerCase();
  return anchors.filter(Boolean).some((anchor) => lowered.includes(anchor.toLowerCase()));
};

const hasText = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;

const toStringArray = (value: unknown) => {
  if (!Array.isArray(value)) return [] as string[];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
};

const extractTextContent = (data: any) => {
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (typeof part?.text === "string") return part.text;
        return "";
      })
      .join("");
  }
  return "";
};

const cleanAndParseJson = (response: string) => {
  let cleaned = response.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const jsonStart = cleaned.search(/[\[{]/);
  if (jsonStart === -1) {
    throw new Error("No JSON object found in response");
  }

  const openChar = cleaned[jsonStart];
  const closeChar = openChar === "[" ? "]" : "}";
  const jsonEnd = cleaned.lastIndexOf(closeChar);
  if (jsonEnd === -1 || jsonEnd <= jsonStart) {
    throw new Error("Incomplete JSON returned by AI");
  }

  cleaned = cleaned.substring(jsonStart, jsonEnd + 1);

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    console.error("Initial JSON parse failed, attempting repair:", error);
    cleaned = cleaned
      .replace(/,\s*([}\]])/g, "$1")
      .replace(/[\x00-\x1F\x7F]/g, "");
    return JSON.parse(cleaned);
  }
};

const normalizeDarkFlowEngineResult = (result: any, contexto: ReturnType<typeof buildContextoMestre>, links: { checkout?: string; landing?: string; link?: string }) => {
  const tema = contexto.tema || "conteúdo dark";
  const publico = contexto.publico || "público digital";
  const lista = toStringArray(result?.lista);
  const cenas = toStringArray(result?.cenas);
  const videoAnimado = toStringArray(result?.video?.texto_animado);
  const roteiro = [result?.roteiro, result?.texto_falado, result?.video?.narracao].find(hasText) || `Hook forte sobre ${tema}, contexto direto, solução prática e CTA final.`;
  const vozes = [result?.vozes, [result?.voz?.estilo, result?.voz?.tom, result?.voz?.ritmo, result?.voz?.naturalidade].filter(Boolean).join(", ")]
    .find(hasText) || "Masculina brasileira, confiante, ritmo médio, natural";

  return {
    ...result,
    hook: hasText(result?.hook) ? result.hook : `Você está deixando resultado na mesa em ${tema}.`,
    contexto: hasText(result?.contexto) ? result.contexto : `Estratégia direta para ${publico} com foco em ${contexto.objetivo || "vendas"}.`,
    tese: hasText(result?.tese) ? result.tese : hasText(result?.contexto) ? result.contexto : `${tema} precisa de copy específica e CTA imediato para converter.`,
    lista: lista.length ? lista : [
      `Erro central que trava ${tema}`,
      "Promessa sem prova real",
      "CTA sem urgência clara",
    ],
    solucao: hasText(result?.solucao) ? result.solucao : `Reposicione a oferta com promessa, prova e CTA ligados a ${tema}.`,
    cta: hasText(result?.cta) ? result.cta : "LINK NA BIO",
    legenda: hasText(result?.legenda) ? result.legenda : `Ajuste sua mensagem em ${tema} para destravar conversão.`,
    hashtags: toStringArray(result?.hashtags).length ? toStringArray(result?.hashtags) : ["#darkflow", "#marketing", "#vendas", `#${tema.replace(/[^a-z0-9]/gi, "")}`.toLowerCase()],
    roteiro,
    texto_falado: hasText(result?.texto_falado) ? result.texto_falado : roteiro,
    vozes,
    cenas: cenas.length ? cenas : videoAnimado.length ? videoAnimado.map((item) => `Cena com texto animado: ${item}`) : [
      `Abrir com alerta visual sobre ${tema}`,
      `Mostrar o erro principal de ${tema}`,
      "Apresentar a solução com prova e CTA",
    ],
    design: {
      fundo: "#000000",
      texto: "#FFFFFF",
      destaque: "#FF0000",
      check: "#00FF7F",
      tipografia: "BOLD, CAIXA ALTA, ALTA LEGIBILIDADE",
      efeitos: ["glow vermelho leve", "sombra leve", "centralizado"],
      ...(result?.design || {}),
    },
    imagem: {
      prompt: `Imagem dark com destaque central para ${tema}`,
      elementos: ["texto central", "destaque vermelho", "check verde"],
      formato: "9:16",
      ...(result?.imagem || {}),
    },
    video: {
      narracao: hasText(result?.video?.narracao) ? result.video.narracao : roteiro,
      texto_animado: videoAnimado.length ? videoAnimado : ["HOOK", "PROVA", "CTA"],
      fundo_dinamico: "texturas dark + motion blur",
      musica: "leve e tensa",
      formatos: ["9:16", "1:1"],
      ...(result?.video || {}),
    },
    voz: {
      estilo: "Masculina brasileira",
      tom: "confiante",
      ritmo: "medio",
      naturalidade: "natural",
      ...(result?.voz || {}),
    },
    links: {
      checkout: links.checkout || links.link || "",
      landing: links.landing || links.link || "",
      ...(result?.links || {}),
    },
  };
};

const validateResult = (tipo: string, result: any, contexto: ReturnType<typeof buildContextoMestre>) => {
  const anchors = [contexto.tema, contexto.publico, contexto.problema, contexto.objetivo].filter(Boolean);
  if (!anchors.length) return { ok: false, reason: "contexto_incompleto" };

  if (tipo === "roteiro") {
    const roteiro = result?.roteiro;
    const full = roteiro?.roteiro_completo || "";
    const combined = [roteiro?.hook, roteiro?.dor, roteiro?.identificacao, roteiro?.quebra_crenca, roteiro?.solucao, roteiro?.cta, full]
      .filter(Boolean)
      .join(" ");
    if (!roteiro?.hook || !roteiro?.cta || !full) return { ok: false, reason: "roteiro_incompleto" };
    if (isGenericText(combined)) return { ok: false, reason: "conteudo_generico" };
    if (!includesContextAnchor(combined, anchors)) return { ok: false, reason: "roteiro_sem_contexto" };
  }

  if (tipo === "viral_video") {
    const narracao = result?.narracao || "";
    const imagens = result?.imagens || [];
    const combined = [narracao, ...(result?.legendas || []), result?.copy?.gancho, result?.copy?.cta].filter(Boolean).join(" ");
    if (!narracao || !result?.legendas?.length) return { ok: false, reason: "viral_incompleto" };
    if (isGenericText(combined)) return { ok: false, reason: "conteudo_generico" };
    if (!includesContextAnchor(combined, anchors)) return { ok: false, reason: "viral_sem_contexto" };
    if (Array.isArray(imagens) && imagens.some((img) => isGenericText(JSON.stringify(img)))) {
      return { ok: false, reason: "imagem_irrelevante" };
    }
  }

  if (tipo === "dark_flow_engine") {
    const combined = [
      result?.hook,
      result?.contexto,
      result?.tese,
      result?.solucao,
      result?.cta,
      result?.roteiro,
      ...(result?.cenas || []),
    ]
      .filter(Boolean)
      .join(" ");

    if (!result?.hook || !result?.contexto || !result?.tese || !result?.solucao || !result?.cta || !result?.roteiro || !result?.vozes || !result?.cenas?.length) {
      return { ok: false, reason: "dark_flow_incompleto" };
    }
    if (isGenericText(combined)) return { ok: false, reason: "conteudo_generico" };
    if (!includesContextAnchor(combined, anchors)) return { ok: false, reason: "dark_flow_sem_contexto" };
  }

  return { ok: true };
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    // ── Auth ──
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = user.id;
    if (isRateLimited(userId)) {
      return new Response(JSON.stringify({ error: "Rate limit excedido. Tente novamente em 1 minuto." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { produto, nicho, publico, dor, beneficio, link, checkout, landing, tipo, marca, objetivo, plataforma, modo, imageUrl, videoUrl, contextoMestre } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const blockedMediaPatterns = [/big[_-]?buck[_-]?bunny/i, /\bdefault\b/i];
    const isBlockedMedia = (value?: string) =>
      Boolean(value && blockedMediaPatterns.some((pattern) => pattern.test(value)));

    if (isBlockedMedia(imageUrl) || isBlockedMedia(videoUrl)) {
      return new Response(JSON.stringify({ success: false, error: "Midia bloqueada. Envie conteudo real relacionado ao produto." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contexto = buildContextoMestre({ produto, nicho, publico, dor, objetivo, contextoMestre: { ...contextoMestre, tema: contextoMestre?.tema || nicho || produto || marca || `${objetivo || "vendas"} para ${plataforma || "redes sociais"}` } });
    if (requiresContext(tipo) && !contexto.tema) {
      return new Response(JSON.stringify({ error: "contexto_obrigatorio", reason: "Tema nao informado" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const tomAjustado = resolveTom({ tipo, modo }, objetivo);
    const bancoNicho = buildNicheBank(nicho);

    let systemPrompt = "";
    let userPrompt = "";

    const context = `
Contexto Mestre:
- tema: ${contexto.tema}
- publico: ${contexto.publico}
- problema: ${contexto.problema}
- objetivo: ${contexto.objetivo}
- linguagem: ${contexto.linguagem}
- tom: ${contexto.tom}

Produto: ${produto}
Nicho: ${nicho}
Publico-alvo: ${publico}
Dor principal: ${dor}
Beneficio principal: ${beneficio}
Link: ${link}
Checkout: ${checkout}
Landing: ${landing}
Marca: ${marca}
Objetivo: ${objetivo}
Plataforma principal: ${plataforma}
Modo: ${modo}
Tom ajustado: ${tomAjustado}
Banco de prompts do nicho: ${bancoNicho.join(", ")}
`;

    if (tipo === "roteiro") {
      systemPrompt = `Você é um roteirista especialista. Gere roteiros 100% alinhados ao Contexto Mestre, sem frases genericas. Estrutura profissional obrigatoria. Sempre responda em JSON valido.`;
      userPrompt = `Com base neste contexto, gere um roteiro inteligente:
${context}

Estrutura obrigatoria do roteiro:
1) Hook (chamada forte)
2) Dor (problema real do publico)
3) Identificacao
4) Quebra de crenca
5) Solucao
6) CTA

Retorne EXATAMENTE este formato JSON:
{
  "angulos_virais": ["angulo 1", "angulo 2", "angulo 3", "angulo 4", "angulo 5"],
  "roteiro": {
    "hook": "texto do hook (0-3 segundos, forte)",
    "dor": "dor real do publico",
    "identificacao": "frase que gera identificacao",
    "quebra_crenca": "quebra de crenca",
    "solucao": "solucao direta ligada ao produto",
    "cta": "chamada para acao"
  },
  "roteiro_completo": "roteiro narrado completo para o video (30-60 segundos)",
  "cenas": ["descricao objetiva da cena 1", "descricao objetiva da cena 2", "descricao objetiva da cena 3", "descricao objetiva da cena 4", "descricao objetiva da cena 5"]
}`;
    } else if (tipo === "seo") {
      systemPrompt = `Você é um especialista em SEO para YouTube e TikTok. Crie conteúdo otimizado e alinhado ao Contexto Mestre. Sempre responda em JSON válido.`;
      userPrompt = `Gere SEO completo para este produto viral:
${context}

Retorne EXATAMENTE este formato JSON:
{
  "titulos": ["título 1", "título 2", "título 3", "título 4", "título 5"],
  "hashtags": ["#hash1", "#hash2", "#hash3", "#hash4", "#hash5", "#hash6", "#hash7", "#hash8", "#hash9", "#hash10"],
  "descricao_youtube": "descrição otimizada completa para YouTube (com emojis, links, timestamps)",
  "descricao_tiktok": "legenda otimizada para TikTok (curta, viral)",
  "palavras_chave": ["palavra1", "palavra2", "palavra3", "palavra4", "palavra5"],
  "tags_youtube": "tag1, tag2, tag3, tag4, tag5, tag6, tag7, tag8",
  "thumbnail_prompt": "prompt detalhado para gerar a thumbnail ideal",
  "seo_score": 92
}`;
    } else if (tipo === "variacoes") {
      systemPrompt = `Você gera variações criativas de hooks virais para vídeos. Cada variação deve ter um angulo emocional diferente e estar alinhada ao Contexto Mestre. Sempre responda em JSON válido.`;
      userPrompt = `Gere 10 variações de hooks virais para este produto:
${context}

Retorne EXATAMENTE este formato JSON:
{
  "variacoes": [
    {"numero": 1, "hook": "texto do hook", "emocao": "tipo de emoção", "tendencia": "tendência usada"},
    {"numero": 2, "hook": "texto do hook", "emocao": "tipo de emoção", "tendencia": "tendência usada"}
  ]
}
Gere exatamente 10 variações.`;
    } else if (tipo === "calendario_30_dias") {
      systemPrompt = `Você é um estrategista de conteúdo para redes sociais. Gere um calendario de 30 dias com roteiros curtos, legendas e hashtags. Sempre responda em JSON válido.`;
      userPrompt = `Crie 30 conteúdos diários para TikTok, Instagram e YouTube Shorts. Distribua plataformas de forma equilibrada.
${context}

Retorne EXATAMENTE este formato JSON:
{
  "conteudos": [
    {
      "dia": 1,
      "plataforma": "TikTok",
      "objetivo": "Vendas/viral/autoridade",
      "roteiro": "roteiro curto com gancho e CTA",
      "legenda": "legenda pronta",
      "hashtags": ["#hash1", "#hash2"],
      "texto_falado": "texto falado do vídeo"
    }
  ]
}
Gere exatamente 30 itens.`;
    } else if (tipo === "dark_flow_niches") {
      systemPrompt = `Você é um analista de tendências para marketing digital. Identifique nichos quentes e temas com alto potencial viral. Sempre responda em JSON válido.`;
      userPrompt = `Detecte nichos quentes e temas sugeridos para conteúdo estilo Dark Flow.
${context}

Retorne EXATAMENTE este formato JSON:
{
  "nichos_quentes": ["nicho 1", "nicho 2", "nicho 3", "nicho 4", "nicho 5"],
  "temas_sugeridos": ["tema 1", "tema 2", "tema 3", "tema 4", "tema 5"]
}`;
    } else if (tipo === "dark_flow_engine") {
      systemPrompt = `Você é um especialista em copywriting agressivo, design de posts dark e roteiros virais. Crie conteúdo no estilo Dark Flow alinhado ao Contexto Mestre. Sempre responda em JSON válido.`;
      userPrompt = `Crie um pacote completo de conteúdo estilo Dark Flow seguindo esta estrutura:
1) HOOK agressivo e direto
2) CONTEXTO em 1 frase
3) LISTA com 3 a 5 erros/verdades
4) SOLUCAO apresentando o sistema/produto
5) CTA direto (link na bio, acesse agora, comece hoje)

Inclua:
- Design automatico: fundo #000, texto #FFF, destaque #FF0000, check #00FF7F, tipografia bold caixa alta, glow vermelho leve, sombra leve, centralizado
- Video: texto animado, narracao IA (voz masculina brasileira, tom confiante, ritmo medio, natural), fundo dinamico, musica leve, formatos 9:16 e 1:1
- Voz: perfil dark flow
- Avatar opcional: HeyGen/Runway ML, persona homem 30-40 profissional
- Links: checkout e landing page
- Pasta do afiliado: copies, scripts, prompts e specs

${context}

Retorne EXATAMENTE este formato JSON:
{
  "hook": "frase agressiva",
  "contexto": "explicacao curta em 1 frase",
  "tese": "ideia central que sustenta a copy",
  "lista": ["erro 1", "erro 2", "erro 3"],
  "solucao": "apresenta o sistema/produto",
  "cta": "LINK NA BIO",
  "titulo": "titulo viral do video",
  "legenda": "legenda curta e direta",
  "hashtags": ["#hash1", "#hash2", "#hash3", "#hash4", "#hash5"],
  "roteiro": "roteiro corrido completo para o video",
  "texto_falado": "texto falado do video",
  "vozes": "Masculina brasileira, confiante, ritmo medio, natural",
  "cenas": [
    {"tempo": "0-3s", "texto": "fala da cena", "visual": "descricao visual cinematografica", "emocao": "curiosidade", "prompt_imagem": "cinematic dark lighting prompt"},
    {"tempo": "3-7s", "texto": "fala da cena", "visual": "descricao visual", "emocao": "tensao", "prompt_imagem": "cinematic prompt"},
    {"tempo": "7-12s", "texto": "fala da cena", "visual": "descricao visual", "emocao": "solucao", "prompt_imagem": "cinematic prompt"},
    {"tempo": "12-15s", "texto": "fala do CTA", "visual": "descricao visual", "emocao": "urgencia", "prompt_imagem": "cinematic prompt"}
  ],
  "design": {
    "fundo": "#000000",
    "texto": "#FFFFFF",
    "destaque": "#FF0000",
    "check": "#00FF7F",
    "tipografia": "BOLD, CAIXA ALTA, ALTA LEGIBILIDADE",
    "efeitos": ["glow vermelho leve", "sombra leve", "centralizado"]
  },
  "imagem": {
    "prompt": "prompt para imagem dark",
    "elementos": ["texto central", "destaque vermelho", "check verde"],
    "formato": "9:16"
  },
  "video": {
    "narracao": "narracao IA completa",
    "texto_animado": ["HOOK", "PROVA", "CTA"],
    "fundo_dinamico": "texturas dark + motion blur",
    "musica": "leve e tensa",
    "formatos": ["9:16", "1:1"]
  },
  "voz": {
    "estilo": "Masculina brasileira",
    "tom": "confiante",
    "ritmo": "medio",
    "naturalidade": "natural"
  },
  "avatar": {
    "opcional": true,
    "servicos": ["HeyGen", "Runway ML"],
    "persona": "Homem 30-40 anos, aparencia profissional, comunicacao direta"
  },
  "links": {
    "checkout": "${checkout || link || ""}",
    "landing": "${landing || link || ""}"
  },
  "assets": {
    "copies": ["hook + contexto + lista + solucao + cta"],
    "scripts": ["roteiro completo"],
    "imagens": ["prompt de imagem"],
    "videos": ["spec de video"]
  }
}`;
    } else if (tipo === "viral_video") {
      systemPrompt = `Você é um diretor criativo de videos virais. Gere uma entrega completa pronta para publicacao, alinhada ao Contexto Mestre e sem conteudo generico. Sempre responda em JSON valido.`;
      userPrompt = `Transforme a imagem em um video viral completo com narracao, musica, legendas e copy de alta conversao.
${context}
Imagem: ${imageUrl || ""}
Video: ${videoUrl || ""}

Regras obrigatorias:
- Nenhuma imagem generica ou irrelevante.
- Toda cena deve refletir o tema, publico e problema.
- Legendas com destaque de palavras importantes.
- Narracao em pt-BR, tom especialista, ritmo medio, emocao leve e envolvente.

Retorne EXATAMENTE este formato JSON:
{
  "narracao": "texto narrado completo (30-60s)",
  "voz": {
    "idioma": "pt-BR",
    "voz": "natural",
    "tom": "especialista",
    "ritmo": "medio",
    "emocao": "leve e envolvente"
  },
  "musica": {
    "estilo": "motivacional + leve suspense",
    "volume": "baixo",
    "crescimento": "progressivo"
  },
  "legendas": ["texto 1", "texto 2", "texto 3"],
  "copy": {
    "gancho": "gancho forte (0-3s)",
    "quebra_padrao": "quebra de padrao",
    "curiosidade": "curiosidade",
    "cta": "CTA direto"
  },
  "cenas": ["descricao objetiva da cena 1", "descricao objetiva da cena 2", "descricao objetiva da cena 3", "descricao objetiva da cena 4", "descricao objetiva da cena 5"],
  "imagens": [
    {
      "descricao": "descricao visual alinhada ao contexto",
      "estilo": "realista cinematografico",
      "nicho": "${contexto.tema}"
    }
  ],
  "formatos": ["9:16 Reels/TikTok/Shorts", "1:1 Feed", "16:9 YouTube"],
  "cta_link": "Clique no link e garanta o seu agora",
  "assets": {
    "video_style": "cinematografico",
    "movimento": "Ken Burns + parallax leve",
    "iluminacao": "premium",
    "qualidade": "4K"
  },
  "montagem": {
    "cenas": "usar cenas acima",
    "imagens": "usar prompts acima",
    "audio": "usar narracao e musica",
    "legenda": "sincronizar com narracao"
  }
}`;
    } else if (tipo === "cinematografico") {
      systemPrompt = `Você é um DIRETOR DE CINEMA + COPYWRITER + ESTRATEGISTA DIGITAL de nível Hollywood.
Crie conteúdo de vídeo comercial EXTREMAMENTE ENVOLVENTE, no estilo Instagram Reels + TikTok + anúncio de alta conversão.
OBJETIVO: Gerar desejo, autoridade e conversão. Sempre responda em JSON válido.`;
      userPrompt = `Crie um vídeo comercial cinematográfico com base neste contexto:
${context}

ESTILO:
- Cinematográfico (nível Hollywood)
- Corte rápido
- Storytelling emocional
- Linguagem simples e direta
- Alta retenção (primeiros 3 segundos MATADORES)

ESTRUTURA:
1. GANCHO (0-3s) - Frase que pare o scroll imediatamente
2. QUEBRA DE PADRÃO - Algo inesperado ou curioso
3. PROMESSA FORTE - Resultado claro e desejável
4. DEMONSTRAÇÃO VISUAL - Simular uso do produto/sistema
5. PROVA / AUTORIDADE - Números, resultados ou percepção de valor
6. CTA - Levar para ação (comentário, link, WhatsApp)

Retorne EXATAMENTE este formato JSON:
{
  "roteiro_completo": "roteiro narrado completo (30-60s) com marcações de tempo",
  "falas": [
    {"tempo": "0-3s", "tipo": "GANCHO", "texto": "fala do gancho", "direcao": "tom de voz, emoção"},
    {"tempo": "3-8s", "tipo": "QUEBRA_PADRAO", "texto": "fala da quebra", "direcao": "tom de voz"},
    {"tempo": "8-18s", "tipo": "PROMESSA", "texto": "fala da promessa", "direcao": "tom de voz"},
    {"tempo": "18-28s", "tipo": "DEMONSTRACAO", "texto": "fala da demonstração", "direcao": "tom de voz"},
    {"tempo": "28-38s", "tipo": "PROVA", "texto": "fala da prova", "direcao": "tom de voz"},
    {"tempo": "38-45s", "tipo": "CTA", "texto": "fala do CTA", "direcao": "tom de voz, urgência"}
  ],
  "cenas": [
    {"cena": 1, "tempo": "0-3s", "descricao_visual": "descrição cinematográfica detalhada", "camera": "tipo de movimento de câmera", "iluminacao": "tipo de luz", "texto_tela": "texto overlay"},
    {"cena": 2, "tempo": "3-8s", "descricao_visual": "descrição", "camera": "movimento", "iluminacao": "luz", "texto_tela": "overlay"},
    {"cena": 3, "tempo": "8-18s", "descricao_visual": "descrição", "camera": "movimento", "iluminacao": "luz", "texto_tela": "overlay"},
    {"cena": 4, "tempo": "18-28s", "descricao_visual": "descrição", "camera": "movimento", "iluminacao": "luz", "texto_tela": "overlay"},
    {"cena": 5, "tempo": "28-38s", "descricao_visual": "descrição", "camera": "movimento", "iluminacao": "luz", "texto_tela": "overlay"},
    {"cena": 6, "tempo": "38-45s", "descricao_visual": "descrição", "camera": "movimento", "iluminacao": "luz", "texto_tela": "overlay"}
  ],
  "trilha_sonora": {
    "estilo": "estilo musical recomendado",
    "crescimento": "como a música evolui",
    "referencia": "artista ou música de referência",
    "bpm": "batidas por minuto sugeridas"
  },
  "edicao": {
    "estilo": "estilo de edição (ex: cortes rápidos, transições suaves)",
    "ritmo": "ritmo da edição",
    "efeitos": ["efeito 1", "efeito 2", "efeito 3"],
    "cor": "paleta de cores / color grading"
  },
  "ganchos_alternativos": [
    {"opcao": 1, "texto": "gancho alternativo 1", "angulo": "ângulo emocional"},
    {"opcao": 2, "texto": "gancho alternativo 2", "angulo": "ângulo emocional"},
    {"opcao": 3, "texto": "gancho alternativo 3", "angulo": "ângulo emocional"}
  ],
  "seo": {
    "titulos": ["título 1", "título 2", "título 3"],
    "hashtags": ["#hash1", "#hash2", "#hash3", "#hash4", "#hash5"],
    "descricao": "descrição otimizada para redes"
  }
}`;
    }

    if ((modo || "").toLowerCase() === "comercial") {
      systemPrompt += " Modo comercial: copy mais forte, emocao maior, CTA direto, ritmo mais rapido.";
    }

    const requestCompletion = async (extraSystem?: string) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 14000);
      let response: Response;

      try {
        response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: (extraSystem ? `${systemPrompt}\n${extraSystem}` : systemPrompt) + "\nIMPORTANT: Return ONLY valid JSON, no markdown fences." },
              { role: "user", content: userPrompt },
            ],
          }),
          signal: controller.signal,
        });
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          throw new Error("Timeout IA");
        }
        throw error;
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ success: false, error: "Rate limit excedido. Tente novamente em alguns segundos." }), {
            status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ success: false, error: "Créditos insuficientes. Adicione fundos em Settings > Workspace > Usage." }), {
            status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const text = await response.text();
        console.error("AI error:", response.status, text);
        throw new Error("AI gateway error");
      }

      const data = await response.json();
      const content = extractTextContent(data);
      console.log("Resposta IA:", content);
      const parsed = cleanAndParseJson(content);
      console.log("Resposta parseada:", parsed);
      return parsed;
    };

    const isVideoType = ["roteiro", "viral_video"].includes(tipo);
    const qualityBoost = `Priorize o Contexto Mestre, evite frases genericas e garanta alinhamento total com tema, publico e problema. Tom ajustado: ${tomAjustado}.`;

    let result = await requestCompletion();
    if (result instanceof Response) return result;
    if (tipo === "dark_flow_engine") {
      result = normalizeDarkFlowEngineResult(result, contexto, { checkout, landing, link });
    }
    const validation = validateResult(tipo, result, contexto);
    if (!validation.ok) {
      result = await requestCompletion(qualityBoost);
      if (result instanceof Response) return result;
      if (tipo === "dark_flow_engine") {
        result = normalizeDarkFlowEngineResult(result, contexto, { checkout, landing, link });
      }
      const retryValidation = validateResult(tipo, result, contexto);
      if (!retryValidation.ok && isVideoType) {
        return new Response(JSON.stringify({ success: false, error: "quality_blocked", reason: retryValidation.reason }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!retryValidation.ok) {
        result = { ...result, _quality_warning: true, _reason: retryValidation.reason };
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
