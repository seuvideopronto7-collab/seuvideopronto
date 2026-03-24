import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { produto, nicho, publico, dor, beneficio, link, checkout, landing, tipo, marca, objetivo, plataforma, modo, imageUrl, videoUrl } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    let systemPrompt = "";
    let userPrompt = "";

    const context = `
Produto: ${produto}
Nicho: ${nicho}
Público-alvo: ${publico}
Dor principal: ${dor}
Benefício principal: ${beneficio}
 Link: ${link}
 Checkout: ${checkout}
 Landing: ${landing}
 Marca: ${marca}
 Objetivo: ${objetivo}
 Plataforma principal: ${plataforma}
 Modo: ${modo}
`;

    if (tipo === "roteiro") {
      systemPrompt = `Você é um roteirista de vídeos virais para YouTube e TikTok. Crie conteúdo agressivo, que prende atenção nos primeiros 3 segundos. Sempre responda em JSON válido.`;
      userPrompt = `Com base neste produto, gere um roteiro viral completo em JSON:
${context}

Retorne EXATAMENTE este formato JSON:
{
  "angulos_virais": ["ângulo 1", "ângulo 2", "ângulo 3", "ângulo 4", "ângulo 5"],
  "roteiro": {
    "hook": "texto do hook (0-3 segundos, extremamente agressivo)",
    "curiosidade": "elemento de curiosidade",
    "conexao_tendencia": "como conecta com tendência viral",
    "insercao_produto": "como o produto entra naturalmente",
    "prova": "elemento de prova social ou resultado",
    "cta": "chamada para ação"
  },
  "roteiro_completo": "roteiro narrado completo para o vídeo (30-60 segundos)"
}`;
    } else if (tipo === "seo") {
      systemPrompt = `Você é um especialista em SEO para YouTube e TikTok. Crie conteúdo otimizado para máxima viralização. Sempre responda em JSON válido.`;
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
      systemPrompt = `Você gera variações criativas de hooks virais para vídeos. Cada variação deve ter um ângulo emocional diferente. Sempre responda em JSON válido.`;
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
      systemPrompt = `Você é um estrategista de conteúdo para redes sociais. Gere um calendário de 30 dias com roteiros curtos, legendas e hashtags. Sempre responda em JSON válido.`;
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
      systemPrompt = `Você é um especialista em copywriting agressivo, design de posts dark e roteiros virais. Crie conteúdo no estilo Dark Flow. Sempre responda em JSON válido.`;
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
      systemPrompt = `Você é um diretor criativo de vídeos virais. Gere uma entrega completa pronta para publicação. Sempre responda em JSON válido.`;
      userPrompt = `Transforme a imagem em um vídeo viral completo com narração, música, legendas e copy de alta conversão.
${context}
Imagem: ${imageUrl || ""}
Video: ${videoUrl || ""}

Retorne EXATAMENTE este formato JSON:
{
  "narracao": "texto narrado completo (30-60s, voz masculina suave e persuasiva)",
  "musica": {
    "estilo": "motivacional + leve suspense",
    "volume": "baixo",
    "crescimento": "progressivo"
  },
  "legendas": ["🔥 ALIVIO RAPIDO", "💥 RESULTADO REAL", "⚡ TECNOLOGIA OZONIZADA"],
  "copy": {
    "gancho": "gancho forte (0-3s)",
    "quebra_padrao": "quebra de padrão",
    "curiosidade": "curiosidade",
    "cta": "Clique no link e garanta o seu agora"
  },
  "formatos": ["9:16 Reels/TikTok/Shorts", "1:1 Feed", "16:9 YouTube"],
  "cta_link": "Clique no link e garanta o seu agora",
  "assets": {
    "video_style": "cinematografico",
    "movimento": "Ken Burns + parallax leve",
    "iluminacao": "premium",
    "qualidade": "4K"
  }
}`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
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
