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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data, error } = await supabase.auth.getClaims(token);
    if (error || !data?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = data.claims.sub as string;

    if (isRateLimited(userId)) return json({ error: "Rate limit excedido. Tente novamente em 1 minuto." }, 429);

    const body = await req.json();
    const { imageUrl, objetivo, formato, duracao, produtoNome, nicho } = body;

    if (!imageUrl) return json({ error: "imageUrl é obrigatório" }, 400);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const objetivoMap: Record<string, string> = {
      vendas: "Vídeo de VENDAS agressivo: conversão máxima, escassez, urgência, CTA forte, prova social",
      autoridade: "Vídeo de AUTORIDADE: educativo, posicionamento expert, confiança, profissionalismo",
      engajamento: "Vídeo de ENGAJAMENTO: viral, emocional, compartilhável, hook irresistível, loop perfeito",
    };

    const formatoMap: Record<string, { ratio: string; res: string }> = {
      tiktok: { ratio: "9:16", res: "1080x1920" },
      shorts: { ratio: "9:16", res: "1080x1920" },
      instagram_feed: { ratio: "1:1", res: "1080x1080" },
      stories: { ratio: "9:16", res: "1080x1920" },
      landscape: { ratio: "16:9", res: "1920x1080" },
    };

    const fmt = formatoMap[formato] || formatoMap.tiktok;
    const duracaoLabel = duracao || "60s";

    const systemPrompt = `Você é um diretor criativo de vídeos comerciais premium. Você analisa imagens de produtos e cria roteiros cinematográficos com estrutura de copywriting. Sempre responda usando a função fornecida.`;

    const userPrompt = `Analise esta imagem de produto e crie um roteiro comercial completo.

IMAGEM DO PRODUTO: ${imageUrl}

CONFIGURAÇÕES:
- Objetivo: ${objetivoMap[objetivo] || objetivoMap.vendas}
- Formato: ${formato} (${fmt.ratio})
- Duração alvo: ${duracaoLabel}
- Produto: ${produtoNome || "Não especificado"}
- Nicho: ${nicho || "Não especificado"}

ESTRUTURA OBRIGATÓRIA DO ROTEIRO:
1. GANCHO (0-3s): Frase que para o scroll imediatamente
2. DOR (3-8s): Identificar o problema do público
3. PROMESSA (8-15s): O que o produto resolve
4. PROVA (15-25s): Elemento de credibilidade
5. SOLUÇÃO (25-40s): Mostrar o produto em ação
6. CTA (últimos 5s): Chamada irresistível para ação

Para cada cena, defina:
- Tipo de movimento de câmera (zoom_in, zoom_out, pan, crop_inteligente, reveal, before_after)
- Texto overlay na tela
- Narração
- Efeito visual (cinematic_glow, particles, blur_bg, color_grade, split_screen)
- Emoção dominante`;

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
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        tools: [{
          type: "function",
          function: {
            name: "generate_commercial_script",
            description: "Generate a commercial video script from product image analysis",
            parameters: {
              type: "object",
              properties: {
                analise_imagem: {
                  type: "object",
                  properties: {
                    produto_detectado: { type: "string" },
                    nicho_detectado: { type: "string" },
                    cores_dominantes: { type: "array", items: { type: "string" } },
                    contexto: { type: "string" },
                    tem_rosto: { type: "boolean" },
                    estilo_sugerido: { type: "string" },
                  },
                  required: ["produto_detectado", "nicho_detectado", "contexto", "estilo_sugerido"],
                },
                roteiro: {
                  type: "object",
                  properties: {
                    titulo: { type: "string" },
                    gancho: { type: "string" },
                    dor: { type: "string" },
                    promessa: { type: "string" },
                    prova: { type: "string" },
                    solucao: { type: "string" },
                    cta: { type: "string" },
                    narracao_completa: { type: "string" },
                  },
                  required: ["titulo", "gancho", "dor", "promessa", "prova", "solucao", "cta", "narracao_completa"],
                },
                cenas: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      numero: { type: "number" },
                      etapa: { type: "string", enum: ["gancho", "dor", "promessa", "prova", "solucao", "cta"] },
                      duracao: { type: "string" },
                      movimento_camera: { type: "string", enum: ["zoom_in", "zoom_out", "pan", "crop_inteligente", "reveal", "before_after", "static"] },
                      texto_tela: { type: "string" },
                      narracao: { type: "string" },
                      efeito_visual: { type: "string", enum: ["cinematic_glow", "particles", "blur_bg", "color_grade", "split_screen", "none"] },
                      emocao: { type: "string" },
                      prompt_imagem: { type: "string" },
                    },
                    required: ["numero", "etapa", "duracao", "movimento_camera", "texto_tela", "narracao", "efeito_visual", "emocao", "prompt_imagem"],
                  },
                },
                copy: {
                  type: "object",
                  properties: {
                    headline: { type: "string" },
                    subheadline: { type: "string" },
                    bullet_points: { type: "array", items: { type: "string" } },
                    hashtags: { type: "array", items: { type: "string" } },
                  },
                  required: ["headline", "subheadline", "bullet_points", "hashtags"],
                },
                config_video: {
                  type: "object",
                  properties: {
                    aspect_ratio: { type: "string" },
                    resolucao: { type: "string" },
                    duracao_total: { type: "string" },
                    estilo_edicao: { type: "string" },
                    voz_sugerida: { type: "string", enum: ["masculina", "feminina"] },
                  },
                  required: ["aspect_ratio", "resolucao", "duracao_total", "estilo_edicao", "voz_sugerida"],
                },
              },
              required: ["analise_imagem", "roteiro", "cenas", "copy", "config_video"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "generate_commercial_script" } },
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

    // Save job to database
    const { data: job, error: jobError } = await supabase
      .from("video_jobs")
      .insert({
        user_id: userId,
        status: "script_ready",
        progress: 30,
        image_url: imageUrl,
        prompt: JSON.stringify({ objetivo, formato, duracao }),
        scenes: result.cenas || [],
        caption_text: result.roteiro?.narracao_completa || "",
      })
      .select("id")
      .single();

    if (jobError) console.error("Job insert error:", jobError);

    return json({
      ...result,
      jobId: job?.id || null,
    });
  } catch (e) {
    console.error("Error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
