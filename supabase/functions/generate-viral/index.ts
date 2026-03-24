import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

  return { ok: true };
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { produto, nicho, publico, dor, beneficio, link, checkout, landing, tipo, marca, objetivo, plataforma, modo, imageUrl, videoUrl, contextoMestre } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const blockedMediaPatterns = [/big[_-]?buck[_-]?bunny/i, /\bdefault\b/i];
    const isBlockedMedia = (value?: string) =>
      Boolean(value && blockedMediaPatterns.some((pattern) => pattern.test(value)));

    if (isBlockedMedia(imageUrl) || isBlockedMedia(videoUrl)) {
      return new Response(JSON.stringify({ error: "Midia bloqueada. Envie conteudo real relacionado ao produto." }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contexto = buildContextoMestre({ produto, nicho, publico, dor, objetivo, contextoMestre });
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
  "lista": ["erro 1", "erro 2", "erro 3"],
  "solucao": "apresenta o sistema/produto",
  "cta": "LINK NA BIO",
  "legenda": "legenda curta e direta",
  "hashtags": ["#hash1", "#hash2", "#hash3", "#hash4", "#hash5"],
  "texto_falado": "texto falado do video",
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
    }

    if ((modo || "").toLowerCase() === "comercial") {
      systemPrompt += " Modo comercial: copy mais forte, emocao maior, CTA direto, ritmo mais rapido.";
    }

    const requestCompletion = async (extraSystem?: string) => {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: extraSystem ? `${systemPrompt}\n${extraSystem}` : systemPrompt },
            { role: "user", content: userPrompt },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "generate_content",
                description: "Generate viral content in structured format",
                parameters: {
                  type: "object",
                  properties: {
                    result: { type: "object" },
                  },
                  required: ["result"],
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "generate_content" } },
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit excedido. Tente novamente em alguns segundos." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione fundos em Settings > Workspace > Usage." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const text = await response.text();
        console.error("AI error:", response.status, text);
        throw new Error("AI gateway error");
      }

      const data = await response.json();
      let result;
      const toolCalls = data.choices?.[0]?.message?.tool_calls;
      if (toolCalls && toolCalls.length > 0) {
        const args = JSON.parse(toolCalls[0].function.arguments);
        result = args.result || args;
      } else {
        const content = data.choices?.[0]?.message?.content || "";
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        result = jsonMatch ? JSON.parse(jsonMatch[0]) : { error: "Failed to parse response" };
      }
      return result;
    };

    const isVideoType = ["roteiro", "viral_video"].includes(tipo);
    const qualityBoost = `Priorize o Contexto Mestre, evite frases genericas e garanta alinhamento total com tema, publico e problema. Tom ajustado: ${tomAjustado}.`;

    let result = await requestCompletion();
    if (result instanceof Response) return result;
    const validation = validateResult(tipo, result, contexto);
    if (!validation.ok) {
      result = await requestCompletion(qualityBoost);
      if (result instanceof Response) return result;
      const retryValidation = validateResult(tipo, result, contexto);
      if (!retryValidation.ok && isVideoType) {
        return new Response(JSON.stringify({ error: "quality_blocked", reason: retryValidation.reason }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
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
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
