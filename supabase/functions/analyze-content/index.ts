import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const rateLimitMap = new Map<string, number[]>();
const isRateLimited = (userId: string): boolean => {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(userId) || []).filter(t => now - t < 60_000);
  if (timestamps.length >= 5) return true;
  timestamps.push(now);
  rateLimitMap.set(userId, timestamps);
  return false;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const requestStart = Date.now();

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return json({ error: "Unauthorized" }, 401);

    if (isRateLimited(user.id)) return json({ error: "Rate limit excedido. Tente novamente em 1 minuto." }, 429);

    const { fileUrl, videoLink, modo, produto, nicho, publico, dor, beneficio, link } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const modoDescricao: Record<string, string> = {
      vendas: "Transformar em vídeo de VENDAS agressivo, focado em conversão, CTA forte, urgência, escassez",
      viral: "Transformar em vídeo VIRAL máximo, chocante, emocional, com hook irresistível e loop perfeito",
      autoridade: "Transformar em vídeo de AUTORIDADE, educativo, profissional, que posiciona como expert no nicho",
    };

    const context = `
Produto: ${produto || "Não especificado"}
Nicho: ${nicho || "Não especificado"}
Público-alvo: ${publico || "Não especificado"}
Dor principal: ${dor || "Não especificado"}
Benefício principal: ${beneficio || "Não especificado"}
Link: ${link || "Não especificado"}
`;

    const systemPrompt = `Você é um diretor criativo de vídeos virais e especialista em marketing digital com capacidade de análise visual (OCR). Quando uma imagem é enviada, analise-a profundamente: leia todo texto visível (OCR), identifique o produto, embalagem, cores, claims de marketing, público-alvo implícito e estilo visual. Use essas informações para criar roteiros de venda altamente persuasivos. Sempre responda em JSON válido.`;

    const userPrompt = `Analise este conteúdo e recrie uma versão otimizada para máxima conversão:

${fileUrl ? `IMAGEM DO PRODUTO (analise visualmente - leia textos, identifique produto, embalagem, cores, claims):` : `Link do vídeo: ${videoLink}`}

CONTEXTO DO PRODUTO:
${context}

MODO DE GERAÇÃO: ${modoDescricao[modo] || modoDescricao.vendas}

INSTRUÇÕES ESPECIAIS:
1. Se a imagem contém texto, extraia TODOS os textos visíveis (OCR completo)
2. Identifique o produto, marca, claims de marketing, ingredientes visíveis
3. Detecte o público-alvo ideal baseado no visual e posicionamento
4. Gere copy de venda AGRESSIVA baseada nos dados reais do produto

Retorne EXATAMENTE este formato JSON:
{
  "analise": {
    "tema": "tema/produto identificado",
    "estilo": "estilo visual detectado",
    "emocao": "emoção dominante para usar",
    "padrao_viral": "padrão viral recomendado",
    "textos_detectados": ["texto 1 da imagem", "texto 2"],
    "produto_detectado": "nome do produto real",
    "claims_detectados": ["claim 1", "claim 2"],
    "publico_detectado": "público-alvo ideal",
    "pontos_fortes": ["ponto 1", "ponto 2", "ponto 3"],
    "pontos_fracos": ["ponto 1", "ponto 2"]
  },
  "novo_roteiro": {
    "hook": "hook extremamente agressivo (0-3s)",
    "abertura": "abertura que prende (3-8s)",
    "desenvolvimento": "conteúdo principal com inserção do produto",
    "prova": "elemento de prova social",
    "cta": "chamada para ação irresistível",
    "roteiro_completo": "roteiro narrado completo (30-60s)"
  },
  "novas_cenas": [
    {"cena": 1, "descricao": "descrição visual detalhada", "duracao": "3s", "texto_tela": "texto overlay", "prompt_imagem": "prompt para gerar imagem da cena"},
    {"cena": 2, "descricao": "descrição visual", "duracao": "4s", "texto_tela": "texto overlay", "prompt_imagem": "prompt"},
    {"cena": 3, "descricao": "descrição visual", "duracao": "4s", "texto_tela": "texto overlay", "prompt_imagem": "prompt"},
    {"cena": 4, "descricao": "descrição visual", "duracao": "3s", "texto_tela": "texto overlay", "prompt_imagem": "prompt"},
    {"cena": 5, "descricao": "descrição visual com CTA", "duracao": "3s", "texto_tela": "CTA forte", "prompt_imagem": "prompt"}
  ],
  "nova_copy": {
    "headline": "headline principal",
    "subheadline": "subheadline",
    "bullet_points": ["benefício 1", "benefício 2", "benefício 3"],
    "cta_texto": "texto do CTA"
  },
  "seo": {
    "titulos": ["título 1", "título 2", "título 3"],
    "hashtags": ["#hash1", "#hash2", "#hash3", "#hash4", "#hash5"],
    "descricao_youtube": "descrição otimizada YouTube",
    "descricao_tiktok": "legenda otimizada TikTok",
    "tags": "tag1, tag2, tag3, tag4, tag5"
  },
  "melhorias": ["melhoria 1", "melhoria 2", "melhoria 3"]
}`;

    // Build messages - use multimodal (image + text) when fileUrl is available
    const userContent: any[] = [{ type: "text", text: userPrompt }];

    if (fileUrl) {
      userContent.push({
        type: "image_url",
        image_url: { url: fileUrl },
      });
    }

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ];

    console.log(`[analyze-content] START mode=${modo} hasImage=${!!fileUrl} user=${user.id}`);

    // Use Gemini Pro for vision analysis (best multimodal model)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: fileUrl ? "google/gemini-2.5-flash" : "google/gemini-3-flash-preview",
        messages,
        tools: [{
          type: "function",
          function: {
            name: "analyze_and_recreate",
            description: "Analyze content visually (OCR + product detection) and generate optimized viral sales version",
            parameters: {
              type: "object",
              properties: { result: { type: "object" } },
              required: ["result"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "analyze_and_recreate" } },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 429) return json({ error: "Rate limit excedido. Tente novamente em alguns segundos." }, 429);
      if (response.status === 402) return json({ error: "Créditos insuficientes." }, 402);
      const text = await response.text();
      console.error("[analyze-content] AI error:", response.status, text);
      throw new Error("AI gateway error");
    }

    const aiData = await response.json();
    let result;
    const toolCalls = aiData.choices?.[0]?.message?.tool_calls;
    if (toolCalls && toolCalls.length > 0) {
      const args = JSON.parse(toolCalls[0].function.arguments);
      result = args.result || args;
    } else {
      const content = aiData.choices?.[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : { error: "Failed to parse response" };
    }

    const elapsedMs = Date.now() - requestStart;
    console.log(`[analyze-content] DONE elapsed=${elapsedMs}ms hasAnalise=${!!result?.analise}`);

    return json(result);
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      console.error("[analyze-content] TIMEOUT after 30s");
      return json({ error: "Análise cancelada: timeout de 30s excedido" }, 504);
    }
    console.error("[analyze-content] Error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
