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

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data, error } = await supabase.auth.getClaims(token);
    if (error || !data?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = data.claims.sub as string;
    if (isRateLimited(userId)) return json({ error: "Rate limit excedido. Tente novamente em 1 minuto." }, 429);

    const { etapa, nome, nicho, publico, problema, promessa, estrutura, tipo } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const context = `
 Nome do produto: ${nome || "a definir"}
 Nicho: ${nicho}
 Público-alvo: ${publico}
 Problema que resolve: ${problema}
 Promessa principal: ${promessa}
 Tipo de infoproduto: ${tipo || "não especificado"}
 `;

    let systemPrompt = "";
    let userPrompt = "";
    let schema: any = {};

    if (etapa === "estrutura") {
      systemPrompt = `Você é um estrategista de infoprodutos digitais de alto nível. Crie estruturas profissionais e vendáveis para cursos e ebooks. Seja específico e profundo.`;
      userPrompt = `Com base nessas informações, gere a ESTRUTURA COMPLETA de um infoproduto profissional:\n${context}\n\nGere um nome otimizado para vendas, subtítulo magnético, promessa irresistível, avatar detalhado do cliente ideal, lista de dores e desejos, e o mecanismo único do produto.`;
      schema = {
        name: "generate_structure",
        description: "Generate infoproduct structure",
        parameters: {
          type: "object",
          properties: {
            nome_otimizado: { type: "string" },
            subtitulo: { type: "string" },
            promessa_forte: { type: "string" },
            avatar: { type: "object", properties: { perfil: { type: "string" }, idade: { type: "string" }, situacao: { type: "string" }, frustracao: { type: "string" }, desejo: { type: "string" } }, required: ["perfil", "idade", "situacao", "frustracao", "desejo"] },
            dores: { type: "array", items: { type: "string" } },
            desejos: { type: "array", items: { type: "string" } },
            mecanismo_unico: { type: "string" },
          },
          required: ["nome_otimizado", "subtitulo", "promessa_forte", "avatar", "dores", "desejos", "mecanismo_unico"],
          additionalProperties: false,
        },
      };
    } else if (etapa === "conteudo") {
      systemPrompt = `Você é um criador de cursos online profissional. Crie estruturas de módulos e aulas com conteúdo APROFUNDADO, didático e prático.`;
      userPrompt = `Com base neste infoproduto, crie a ESTRUTURA COMPLETA DO CURSO:\n${context}\nEstrutura aprovada: ${JSON.stringify(estrutura || {})}\n\nCrie 5 módulos com 3-4 aulas cada.`;
      schema = {
        name: "generate_content",
        description: "Generate full course content",
        parameters: {
          type: "object",
          properties: {
            modulos: { type: "array", items: { type: "object", properties: { numero: { type: "number" }, titulo: { type: "string" }, descricao: { type: "string" }, aulas: { type: "array", items: { type: "object", properties: { numero: { type: "number" }, titulo: { type: "string" }, conteudo: { type: "string" }, exemplos: { type: "array", items: { type: "string" } }, exercicio: { type: "string" } }, required: ["numero", "titulo", "conteudo", "exemplos", "exercicio"] } } }, required: ["numero", "titulo", "descricao", "aulas"] } },
            ebook_sumario: { type: "array", items: { type: "string" } },
          },
          required: ["modulos", "ebook_sumario"],
          additionalProperties: false,
        },
      };
    } else if (etapa === "vsl") {
      systemPrompt = `Você é um copywriter expert em VSL. Crie roteiros de vendas que convertem.`;
      userPrompt = `Crie um VSL COMPLETO:\n${context}\nEstrutura: ${JSON.stringify(estrutura || {})}`;
      schema = {
        name: "generate_vsl",
        description: "Generate VSL script",
        parameters: {
          type: "object",
          properties: { hook: { type: "string" }, quebra_padrao: { type: "string" }, storytelling: { type: "string" }, dor_solucao: { type: "string" }, oferta: { type: "string" }, cta: { type: "string" }, roteiro_completo: { type: "string" } },
          required: ["hook", "quebra_padrao", "storytelling", "dor_solucao", "oferta", "cta", "roteiro_completo"],
          additionalProperties: false,
        },
      };
    } else if (etapa === "kit_vendas") {
      systemPrompt = `Você é um copywriter e designer de marketing digital. Crie kits de venda completos.`;
      userPrompt = `Crie o KIT COMPLETO DE VENDAS:\n${context}\nEstrutura: ${JSON.stringify(estrutura || {})}`;
      schema = {
        name: "generate_sales_kit",
        description: "Generate complete sales kit",
        parameters: {
          type: "object",
          properties: { headline: { type: "string" }, subheadline: { type: "string" }, bullets: { type: "array", items: { type: "string" } }, garantia: { type: "string" }, cta_principal: { type: "string" }, faq: { type: "array", items: { type: "object", properties: { pergunta: { type: "string" }, resposta: { type: "string" } }, required: ["pergunta", "resposta"] } }, landing_page: { type: "object", properties: { secoes: { type: "array", items: { type: "string" } }, estrutura: { type: "string" } }, required: ["secoes", "estrutura"] } },
          required: ["headline", "subheadline", "bullets", "garantia", "cta_principal", "faq", "landing_page"],
          additionalProperties: false,
        },
      };
    } else {
      return json({ error: "Etapa inválida" }, 400);
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
        tools: [{ type: "function", function: schema }],
        tool_choice: { type: "function", function: { name: schema.name } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return json({ error: "Rate limit excedido." }, 429);
      if (response.status === 402) return json({ error: "Créditos insuficientes." }, 402);
      const text = await response.text();
      console.error("AI error:", response.status, text);
      throw new Error("AI gateway error");
    }

    const aiData = await response.json();
    let result;
    const toolCalls = aiData.choices?.[0]?.message?.tool_calls;
    if (toolCalls && toolCalls.length > 0) {
      result = JSON.parse(toolCalls[0].function.arguments);
    } else {
      const content = aiData.choices?.[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : { error: "Failed to parse" };
    }

    return json(result);
  } catch (e) {
    console.error("Error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
