import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// ── Rate limiting (5 req/min per user) ──
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60_000;

const isRateLimited = (userId: string): boolean => {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(userId) || []).filter(t => now - t < RATE_WINDOW_MS);
  if (timestamps.length >= RATE_LIMIT) return true;
  timestamps.push(now);
  rateLimitMap.set(userId, timestamps);
  return false;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    // ── Auth ──
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data, error } = await supabase.auth.getClaims(token);
    if (error || !data?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = data.claims.sub as string;

    // ── Rate limit ──
    if (isRateLimited(userId)) return json({ error: "Rate limit excedido. Tente novamente em 1 minuto." }, 429);

    const { fileUrl, videoLink, modo, produto, nicho, publico, dor, beneficio, link } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const contentSource = fileUrl
      ? `URL do arquivo enviado: ${fileUrl}`
      : `Link do vídeo: ${videoLink}`;

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

    const systemPrompt = `Você é um diretor criativo de vídeos virais e especialista em marketing digital. Analise conteúdo existente e recrie versões otimizadas para viralização e vendas. Sempre responda em JSON válido.`;

    const userPrompt = `Analise este conteúdo e recrie uma versão otimizada:

CONTEÚDO ORIGINAL:
${contentSource}

CONTEXTO DO PRODUTO:
${context}

MODO DE GERAÇÃO: ${modoDescricao[modo] || modoDescricao.viral}

Retorne EXATAMENTE este formato JSON:
{
  "analise": {
    "tema": "tema identificado",
    "estilo": "estilo do conteúdo",
    "emocao": "emoção dominante",
    "padrao_viral": "padrão viral identificado",
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
    {"cena": 1, "descricao": "descrição visual", "duracao": "Xs", "texto_tela": "texto overlay"},
    {"cena": 2, "descricao": "descrição visual", "duracao": "Xs", "texto_tela": "texto overlay"},
    {"cena": 3, "descricao": "descrição visual", "duracao": "Xs", "texto_tela": "texto overlay"},
    {"cena": 4, "descricao": "descrição visual", "duracao": "Xs", "texto_tela": "texto overlay"},
    {"cena": 5, "descricao": "descrição visual", "duracao": "Xs", "texto_tela": "texto overlay"}
  ],
  "nova_copy": {
    "headline": "headline principal",
    "subheadline": "subheadline",
    "bullet_points": ["benefício 1", "benefício 2", "benefício 3"],
    "cta_texto": "texto do CTA"
  },
  "seo": {
    "titulos": ["título 1", "título 2", "título 3"],
    "hashtags": ["#hash1", "#hash2", "#hash3", "#hash4", "#hash5", "#hash6", "#hash7", "#hash8", "#hash9", "#hash10"],
    "descricao_youtube": "descrição otimizada YouTube",
    "descricao_tiktok": "legenda otimizada TikTok",
    "tags": "tag1, tag2, tag3, tag4, tag5"
  },
  "melhorias": ["melhoria 1 vs original", "melhoria 2 vs original", "melhoria 3 vs original"]
}`;

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
        tools: [{
          type: "function",
          function: {
            name: "analyze_and_recreate",
            description: "Analyze content and generate optimized viral version",
            parameters: {
              type: "object",
              properties: { result: { type: "object" } },
              required: ["result"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "analyze_and_recreate" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return json({ error: "Rate limit excedido. Tente novamente em alguns segundos." }, 429);
      if (response.status === 402) return json({ error: "Créditos insuficientes." }, 402);
      const text = await response.text();
      console.error("AI error:", response.status, text);
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

    return json(result);
  } catch (e) {
    console.error("Error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
