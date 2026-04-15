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

// ── Scene count by duration ──
const sceneCountByDuration: Record<string, number> = {
  "5s": 2,
  "15s": 4,
  "30s": 6,
  "60s": 8,
  "2min": 10,
  "4min": 12,
};

// ── Voice IDs (ElevenLabs) ──
const voiceIds: Record<string, string> = {
  masculina: "onwK4e9ZLuTAKqWW03F9",   // Daniel
  feminina: "EXAVITQu4vr4xnSDxMaL",     // Sarah
};

const hasMeaningfulText = (value: unknown): value is string =>
  typeof value === "string" && value.replace(/[\s.,;:!?-]+/g, "").length >= 8;

const buildNarrationText = (script: unknown, scenes: any[], produtoNome: string, nicho: string) => {
  if (hasMeaningfulText(script)) return script.trim();

  const sceneNarration = scenes
    .flatMap((scene) => [scene?.narracao, scene?.texto_tela])
    .filter(hasMeaningfulText)
    .map((text) => text.trim());

  if (sceneNarration.length > 0) {
    return sceneNarration.join(". ");
  }

  const productLabel = hasMeaningfulText(produtoNome) ? produtoNome.trim() : "seu produto";
  const nicheLabel = hasMeaningfulText(nicho) ? nicho.trim() : "seu nicho";

  return `Descubra agora como ${productLabel} pode transformar seus resultados em ${nicheLabel}. Veja os benefícios, gere desejo e avance para a próxima etapa agora.`;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
  const SHOTSTACK_API_KEY = Deno.env.get("SHOTSTACK_API_KEY");

  if (!supabaseUrl || !serviceRoleKey) return json({ error: "Server config missing" }, 500);

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const updateJob = async (jobId: string, fields: Record<string, unknown>) => {
    await admin.from("video_jobs").update(fields).eq("id", jobId);
  };

  try {
    // ── Auth ──
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized", message: "Token de autenticação ausente." }, 401);

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized", message: "Usuário não autenticado." }, 401);
    if (isRateLimited(user.id)) return json({ error: "Rate limit excedido. Tente novamente em 1 minuto.", message: "Muitas tentativas em sequência." }, 429);

    // ── Subscription limit check ──
    const { data: sub } = await admin.from("subscriptions").select("videos_used, videos_limit, plan").eq("user_id", user.id).maybeSingle();
    if (sub && sub.videos_limit !== null && sub.videos_used >= sub.videos_limit) {
      return json({ error: "LIMIT_REACHED", message: `Você atingiu o limite de ${sub.videos_limit} vídeos do plano ${sub.plan}. Faça upgrade para continuar.` }, 403);
    }

    let body: Record<string, any> = {};
    try {
      body = await req.json();
    } catch (error) {
      console.error("generate-commercial-video invalid json", error);
      return json({ error: "JSON inválido", message: "Envie um body JSON válido." }, 400);
    }

    const {
      imageUrl = "",
      objetivo = "vendas",
      formato = "tiktok",
      duracao = "60s",
      produtoNome = "",
      nicho = "",
      step = "analyze",
      intensidade = "agressivo",
      avatar = "",
      estiloCta = "urgencia",
    } = body;

    console.log("generate-commercial-video request", {
      step,
      hasImageUrl: Boolean(imageUrl),
      objetivo,
      formato,
      duracao,
      intensidade,
      avatar,
      estiloCta,
      hasJobId: Boolean(body.jobId),
    });

    if (!imageUrl || typeof imageUrl !== "string") {
      return json({ error: "imageUrl é obrigatório", message: "Envie uma URL pública da imagem." }, 400);
    }

    if (!LOVABLE_API_KEY) return json({ error: "AI não configurada", message: "A IA do backend não está configurada." }, 500);

    // ═══════════════════════════════════════
    // STEP 1: ANALYZE + GENERATE SCRIPT
    // ═══════════════════════════════════════
    if (!step || step === "analyze") {
      const sceneCount = sceneCountByDuration[duracao] || 6;

      const objetivoMap: Record<string, string> = {
        vendas: "Vídeo de VENDAS agressivo: conversão máxima, escassez, urgência, CTA forte, prova social, gatilhos mentais",
        autoridade: "Vídeo de AUTORIDADE: educativo, posicionamento expert, confiança, profissionalismo, branding pessoal",
        engajamento: "Vídeo de ENGAJAMENTO: viral, emocional, compartilhável, hook irresistível, loop perfeito, alto retention",
      };

      const intensidadeMap: Record<string, string> = {
        suave: "Tom suave e educativo. Copy leve, sem pressão. Foco em informar e gerar curiosidade. Sem urgência extrema.",
        medio: "Tom equilibrado. Copy persuasiva mas não agressiva. Urgência moderada. Foco em benefícios claros.",
        agressivo: "Tom AGRESSIVO de vendas. Gatilhos mentais fortes: escassez, medo de perder, prova social com números específicos. Ganchos que PARAM O SCROLL. Frases curtas e impactantes. Dor emocional intensa. CTA com urgência real (últimas unidades, só hoje, tempo limitado).",
        black: "MODO BLACK: Nível MÁXIMO de persuasão. Copy estilo anúncio de 7 dígitos. Gancho EXTREMAMENTE provocador e polêmico (sem ser ofensivo). Quebra de padrão total na primeira frase. Dor VISCERAL e emocional. Promessa AUDACIOSA mas crível. Prova com números ESPECÍFICOS (ex: 10.327 pessoas). CTA com MÚLTIPLAS camadas de urgência (escassez + tempo + exclusividade). Cada frase deve ser um gatilho mental.",
      };

      const avatarMap: Record<string, string> = {
        "mulher_pos_gravidez": "Público: mulher pós-gravidez, 25-40 anos. Dores: corpo mudou, autoestima baixa, quer voltar ao corpo anterior, cansada, sem tempo. Linguagem: empática, maternal mas empoderada.",
        "mulher_30": "Público: mulher 30+. Dores: metabolismo lento, roupas não servem, frustração com dietas. Linguagem: direta, confiante, 'mulher que resolve'.",
        "homem": "Público: homem adulto. Dores: barriga, falta de disposição, quer definição. Linguagem: objetiva, sem rodeios, foco em resultado e performance.",
        "jovem": "Público: jovem 18-25. Dores: insegurança, pressão social, quer se sentir bem. Linguagem: informal, trending, relatable.",
        "empreendedor": "Público: empreendedor digital. Dores: falta de tempo, precisa de energia e foco. Linguagem: pragmática, ROI, produtividade.",
      };

      const estiloCtaMap: Record<string, string> = {
        urgencia: "CTA com URGÊNCIA: 'Últimas unidades', '50% OFF só hoje', 'Oferta expira em X horas'. Criar sensação de perda iminente.",
        escassez: "CTA com ESCASSEZ: 'Apenas X unidades restantes', 'Lote quase esgotado', 'Vagas limitadas'. Número específico de estoque.",
        exclusividade: "CTA com EXCLUSIVIDADE: 'Acesso VIP', 'Oferta exclusiva para quem viu este vídeo', 'Disponível só aqui'.",
        social: "CTA com PROVA SOCIAL: 'Junte-se a X.XXX pessoas', 'Todo mundo está comprando', 'A mais vendida do Brasil'.",
        garantia: "CTA com GARANTIA: 'Satisfação garantida ou dinheiro de volta', 'Teste sem risco por 30 dias', 'Zero risco'.",
      };

      const formatoMap: Record<string, { ratio: string }> = {
        tiktok: { ratio: "9:16" },
        shorts: { ratio: "9:16" },
        instagram_feed: { ratio: "1:1" },
        stories: { ratio: "9:16" },
      };

      const fmt = formatoMap[formato] || formatoMap.tiktok;

      const intensidadeInstr = intensidadeMap[intensidade] || intensidadeMap.agressivo;
      const avatarInstr = avatarMap[avatar] || "";
      const ctaInstr = estiloCtaMap[estiloCta] || estiloCtaMap.urgencia;

      const systemPrompt = `Você é o MELHOR copywriter de vídeos de vendas do Brasil — nível 7 dígitos. Você cria roteiros que PARAM O SCROLL, criam DOR EMOCIONAL REAL e FECHAM A VENDA com urgência irresistível.

REGRAS ABSOLUTAS:
1. GANCHO: A primeira frase DEVE ser provocadora, polêmica ou revelar uma verdade inconveniente. NUNCA use ganchos genéricos como "pare de lutar" ou "descubra o segredo". Use padrões como: "Você NÃO está [problema]... você está [causa real]", "O que ninguém te conta sobre [tema]", "[Número específico] pessoas já [resultado] — e você?"
2. DOR: Descreva a dor com EMOÇÃO e ESPECIFICIDADE. Não diga "você quer emagrecer" — diga "aquela calça que ficou no fundo do armário porque não fecha mais".
3. PROMESSA: Seja ESPECÍFICO. Não diga "resultados rápidos" — diga "diferença visível em 7 dias".
4. PROVA: Use NÚMEROS ESPECÍFICOS (ex: "10.327 pessoas", não "milhares"). Mencione "primeira semana" ao invés de "poucos dias".
5. CTA: NUNCA use "clique no link da bio" sozinho. Sempre combine com urgência, escassez ou exclusividade.
6. Cada texto_tela deve ter NO MÁXIMO 6 palavras — impactantes e legíveis em 2 segundos.
7. A narração deve soar NATURAL e EMOCIONAL — como se estivesse falando direto com UMA pessoa.

Use a função fornecida para retornar os dados estruturados.`;

      const userPrompt = `Analise esta imagem de produto e crie um roteiro comercial ALTAMENTE VENDEDOR com EXATAMENTE ${sceneCount} cenas.

IMAGEM DO PRODUTO: ${imageUrl}

CONFIGURAÇÕES:
- Objetivo: ${objetivoMap[objetivo] || objetivoMap.vendas}
- Formato: ${formato} (${fmt.ratio})
- Duração alvo: ${duracao}
- Produto: ${produtoNome || "Detectar automaticamente pela imagem"}
- Nicho: ${nicho || "Detectar automaticamente pela imagem"}

NÍVEL DE INTENSIDADE DA COPY:
${intensidadeInstr}

${avatarInstr ? `AVATAR DO PÚBLICO-ALVO:\n${avatarInstr}\n` : ""}ESTILO DO CTA:
${ctaInstr}

ESTRUTURA OBRIGATÓRIA (adaptar ${sceneCount} cenas a estas etapas):
1. GANCHO (primeira cena): Frase PROVOCADORA que para o scroll. Usar padrão de quebra de crença ou revelação. NUNCA genérico.
2. DOR (1-2 cenas): Descrever a dor com EMOÇÃO VISCERAL. Roupas que não servem, olhar no espelho com tristeza, frustração real.
3. PROMESSA (1-2 cenas): Resultado ESPECÍFICO e TANGÍVEL. Com prazo ("em X dias"), com métrica visual ("desinchar visivelmente").
4. PROVA (1-2 cenas): Números ESPECÍFICOS (ex: "10.327 mulheres"). Mencionar "primeira semana". Depoimentos implícitos.
5. SOLUÇÃO (1-2 cenas): Mostrar o produto como A RESPOSTA. Posicionar como protocolo/sistema, não como "mais um produto".
6. CTA (última cena): Combinar URGÊNCIA + ESCASSEZ + AÇÃO CLARA. Nunca apenas "clique no link".

Para cada cena, defina:
- Movimento de câmera: zoom_in, zoom_out, pan, crop_inteligente, reveal, before_after, static
- Texto overlay curto (MÁXIMO 6 palavras — scroll-stopping)
- Narração completa (o que será FALADO — natural, emocional, conversacional)
- Efeito visual: cinematic_glow, particles, blur_bg, color_grade, split_screen, none
- Emoção dominante: choque, dor, esperança, confiança, urgência, desejo, empoderamento
- Prompt de imagem para geração (detalhado, cinematográfico, vertical 9:16, dark luxury)

A narração_completa deve ser o script COMPLETO que será falado — fluido, emocional e persuasivo.
Gere também 3 VARIAÇÕES de gancho alternativas no campo ganchos_alternativos da copy.`;

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
              description: "Generate a complete commercial video script from product image analysis",
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
                        etapa: { type: "string" },
                        duracao: { type: "string" },
                        movimento_camera: { type: "string" },
                        texto_tela: { type: "string" },
                        narracao: { type: "string" },
                        efeito_visual: { type: "string" },
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
                      ganchos_alternativos: {
                        type: "array",
                        items: { type: "string" },
                        description: "3 variações alternativas do gancho principal para teste A/B",
                      },
                    },
                    required: ["headline", "subheadline", "bullet_points", "hashtags", "ganchos_alternativos"],
                  },
                  config_video: {
                    type: "object",
                    properties: {
                      aspect_ratio: { type: "string" },
                      resolucao: { type: "string" },
                      duracao_total: { type: "string" },
                      estilo_edicao: { type: "string" },
                      voz_sugerida: { type: "string" },
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

      if (!aiResponse.ok) {
        if (aiResponse.status === 429) return json({ error: "Rate limit excedido. Tente novamente em alguns segundos." }, 429);
        const errText = await aiResponse.text();
        console.error("AI error:", aiResponse.status, errText);
        // Fallback: generate a basic script locally instead of blocking
        console.warn("[generate-commercial-video] AI indisponível, usando roteiro fallback");
        const fallbackResult = {
          analise_imagem: { produto: "Produto Premium", cores: ["#000"], sentimento: "profissional", categoria: "geral" },
          roteiro: {
            gancho: "Descubra o que está revolucionando o mercado.",
            problema: "Você está cansado de resultados mediocres?",
            solucao: "Este produto foi feito para quem quer resultado real.",
            prova: "Milhares de pessoas já transformaram sua rotina.",
            cta: "Garanta o seu agora antes que acabe!",
            texto_completo: "Descubra o que está revolucionando o mercado. Você está cansado de resultados mediocres? Este produto foi feito para quem quer resultado real. Milhares de pessoas já transformaram sua rotina. Garanta o seu agora antes que acabe!"
          },
          cenas: [
            { tipo: "gancho", texto: "Descubra o que está revolucionando o mercado.", movimento: "zoom_in", duracao: "3s" },
            { tipo: "problema", texto: "Cansado de resultados mediocres?", movimento: "pan_left", duracao: "3s" },
            { tipo: "solucao", texto: "Resultado real para quem exige qualidade.", movimento: "zoom_out", duracao: "3s" },
            { tipo: "cta", texto: "Garanta o seu agora!", movimento: "zoom_in", duracao: "3s" }
          ],
          copy: { headline: "Produto Premium", sub: "Transforme sua rotina hoje", cta_text: "Compre Agora", hashtags: ["#premium", "#resultado"] },
          config_video: { aspect_ratio: formato === "tiktok" || formato === "reels" ? "9:16" : "1:1", resolucao: "1080p", duracao_total: duracao, estilo_edicao: "cinematografico", voz_sugerida: "masculina" }
        };

        // Create job with fallback data
        const { data: fjob, error: fjobErr } = await admin
          .from("video_jobs")
          .insert({
            user_id: user.id,
            status: "script_ready",
            progress: 25,
            image_url: imageUrl,
            prompt: JSON.stringify({ objetivo, formato, duracao }),
            scenes: fallbackResult.cenas,
            caption_text: fallbackResult.roteiro.texto_completo,
          })
          .select("id")
          .single();

        if (fjobErr) throw fjobErr;

        return json({
          success: true,
          jobId: fjob.id,
          ...fallbackResult,
          provider: "fallback",
        });
      }

      const aiData = await aiResponse.json();
      let result;
      const toolCalls = aiData.choices?.[0]?.message?.tool_calls;
      if (toolCalls && toolCalls.length > 0) {
        result = JSON.parse(toolCalls[0].function.arguments);
      } else {
        const content = aiData.choices?.[0]?.message?.content || "";
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        result = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      }

      if (!result) return json({ error: "Failed to parse AI response" }, 500);

      // Create job in DB
      const { data: job, error: jobError } = await admin
        .from("video_jobs")
        .insert({
          user_id: user.id,
          status: "script_ready",
          progress: 25,
          image_url: imageUrl,
          prompt: JSON.stringify({ objetivo, formato, duracao }),
          scenes: result.cenas || [],
          caption_text: result.roteiro?.narracao_completa || "",
        })
        .select("id")
        .single();

      if (jobError) {
        console.error("Job insert error:", jobError);
        return json({ error: "Falha ao salvar job" }, 500);
      }

      return json({ step: "analyze", message: "Roteiro gerado com sucesso", ...result, jobId: job.id });
    }

    // ═══════════════════════════════════════
    // STEP 2: RENDER (images + voice + video)
    // ═══════════════════════════════════════
    if (step === "render") {
      const { jobId, scenes, script, voz } = body;
      if (!jobId) return json({ error: "jobId obrigatório" }, 400);

      // Verify ownership
      const { data: job } = await admin.from("video_jobs").select("user_id, image_url, caption_text, prompt").eq("id", jobId).maybeSingle();
      if (!job) return json({ error: "Job não encontrado" }, 404);
      if (job.user_id !== user.id) {
        const { data: adminRole } = await admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
        if (!adminRole) return json({ error: "Forbidden" }, 403);
      }

      const sourceImage = job.image_url || imageUrl;
      const sceneList = Array.isArray(scenes) ? scenes : [];
      const narration = buildNarrationText(script || job.caption_text, sceneList, produtoNome, nicho);

      console.log("[commercial] narration prepared", {
        jobId,
        length: narration.length,
        preview: narration.slice(0, 120),
      });

      // ── 2a. Generate scene images ──
      await updateJob(jobId, { status: "generating_images", progress: 30 });
      const imageUrls: string[] = [];

      for (let i = 0; i < sceneList.length; i++) {
        const scene = sceneList[i];
        try {
          const scenePrompt = `Generate a cinematic 9:16 vertical marketing image. Style: dark luxury, high contrast, dramatic lighting, ultra realistic 4k. Scene: ${scene.prompt_imagem || scene.visual || scene.texto_tela}. Emotion: ${scene.emocao}. On a clean background`;

          const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-image",
              messages: [{ role: "user", content: scenePrompt }],
              modalities: ["image", "text"],
            }),
          });

          if (res.ok) {
            const data = await res.json();
            const base64Url = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
            if (base64Url) {
              const base64Data = base64Url.replace(/^data:image\/\w+;base64,/, "");
              const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
              const path = `scenes/${jobId}/scene-${i}.png`;
              const { error: uploadErr } = await admin.storage
                .from("images")
                .upload(path, binaryData, { contentType: "image/png", upsert: true });
              if (!uploadErr) {
                const { data: urlData } = admin.storage.from("images").getPublicUrl(path);
                imageUrls.push(urlData.publicUrl);
              } else {
                imageUrls.push(sourceImage);
              }
            } else {
              imageUrls.push(sourceImage);
            }
          } else {
            imageUrls.push(sourceImage);
          }
        } catch {
          imageUrls.push(sourceImage);
        }

        const imgProgress = 30 + Math.round(((i + 1) / sceneList.length) * 20);
        await updateJob(jobId, { progress: imgProgress, images: imageUrls });
      }

      // ── 2b. Generate voiceover ──
      await updateJob(jobId, { status: "generating_audio", progress: 55 });
      let audioUrl: string | null = null;

      if (ELEVENLABS_API_KEY && hasMeaningfulText(narration)) {
        try {
          const voiceId = voiceIds[voz || "masculina"] || voiceIds.masculina;
          const res = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
            {
              method: "POST",
              headers: { "xi-api-key": ELEVENLABS_API_KEY, "Content-Type": "application/json" },
              body: JSON.stringify({
                text: narration,
                model_id: "eleven_multilingual_v2",
                voice_settings: { stability: 0.6, similarity_boost: 0.8, style: 0.4, use_speaker_boost: true },
              }),
            }
          );

          if (res.ok) {
            const audioBuffer = await res.arrayBuffer();
            if (audioBuffer.byteLength >= 5000) {
              const audioPath = `voiceovers/${jobId}.mp3`;
              const { error: uploadErr } = await admin.storage
                .from("audio")
                .upload(audioPath, audioBuffer, { contentType: "audio/mpeg", upsert: true });
              if (!uploadErr) {
                const { data: urlData } = admin.storage.from("audio").getPublicUrl(audioPath);
                audioUrl = urlData.publicUrl;
              } else {
                console.error("Audio upload error:", uploadErr);
              }
            } else {
              console.error("[commercial] audio too small, discarded:", audioBuffer.byteLength);
            }
          } else {
            console.error("ElevenLabs error:", res.status, await res.text());
          }
        } catch (e) {
          console.error("Audio gen error:", e);
        }
      } else {
        console.warn("[commercial] narration skipped: no meaningful text available");
      }

      await updateJob(jobId, { progress: 60, audio_url: audioUrl, caption_text: narration });

      // ── 2b2. Generate Soundtrack (ElevenLabs Music) ──
      let soundtrackUrl: string | null = null;
      if (ELEVENLABS_API_KEY) {
        try {
          await updateJob(jobId, { status: "generating_soundtrack", progress: 62 });
          const musicPrompt = "Cinematic dark ambient background music for product commercial video. Dramatic, luxury feel, subtle bass, modern and professional. No vocals.";
          const musicRes = await fetch("https://api.elevenlabs.io/v1/music", {
            method: "POST",
            headers: {
              "xi-api-key": ELEVENLABS_API_KEY,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              prompt: musicPrompt,
              duration_seconds: Math.min(120, (parseInt(duracao) || 60) + 5),
            }),
          });

          if (musicRes.ok) {
            const musicBuffer = await musicRes.arrayBuffer();
            const musicPath = `soundtracks/${jobId}.mp3`;
            const { error: upErr } = await admin.storage
              .from("audio")
              .upload(musicPath, musicBuffer, { contentType: "audio/mpeg", upsert: true });
            if (!upErr) {
              const { data: urlData } = admin.storage.from("audio").getPublicUrl(musicPath);
              soundtrackUrl = urlData.publicUrl;
              console.log("[commercial] ✅ Soundtrack generated");
            }
          } else {
            console.error("[commercial] Music gen failed:", musicRes.status);
          }
        } catch (e) {
          console.error("[commercial] Soundtrack error:", e);
        }
      }

      // ── 2c. Render video with Shotstack ──
      if (!SHOTSTACK_API_KEY) {
        await updateJob(jobId, {
          status: "error", progress: 100,
          video_url: null, images: imageUrls,
          error: "Renderizador indisponível — aguardando reprocessamento",
        });
        return json({ jobId, status: "error", message: "Renderizador indisponível", images: imageUrls, audioUrl });
      }

      await updateJob(jobId, { status: "rendering", progress: 65 });

      const sceneDuration = Math.max(2, Math.round(
        (parseInt(duracao) || 60) / sceneList.length
      ));

      const totalDurationCalc = sceneList.length * sceneDuration;

      const imageClips = imageUrls.map((url: string, i: number) => ({
        asset: { type: "image", src: url },
        start: i * sceneDuration,
        length: sceneDuration,
        fit: "cover",
        transition: { in: "fade", out: "fade" },
      }));

      const captionClips = sceneList.map((scene: any, i: number) => ({
        asset: {
          type: "html",
          html: `<p style="font-family:Montserrat;font-size:42px;color:#fff;text-align:center;text-shadow:2px 2px 8px rgba(0,0,0,0.9);font-weight:800;line-height:1.3">${(scene.texto_tela || "").slice(0, 80)}</p>`,
          width: 720,
          height: 200,
        },
        start: i * sceneDuration,
        length: sceneDuration,
        position: "bottom",
        offset: { y: 0.12 },
        transition: { in: "fade", out: "fade" },
      }));

      const tracks: any[] = [
        { clips: captionClips },
        { clips: imageClips },
      ];

      // Add voiceover
      if (audioUrl) {
        tracks.push({
          clips: [{
            asset: { type: "audio", src: audioUrl, volume: 1 },
            start: 0,
            length: totalDurationCalc,
          }],
        });
      }

      // Add soundtrack (lower volume behind voice)
      if (soundtrackUrl) {
        tracks.push({
          clips: [{
            asset: { type: "audio", src: soundtrackUrl, volume: 0.15 },
            start: 0,
            length: totalDurationCalc,
          }],
        });
      }

      const aspectMap: Record<string, string> = {
        tiktok: "9:16", shorts: "9:16", stories: "9:16", instagram_feed: "1:1",
      };
      const sizeMap: Record<string, { width: number; height: number }> = {
        "9:16": { width: 1080, height: 1920 },
        "1:1": { width: 1080, height: 1080 },
        "16:9": { width: 1920, height: 1080 },
      };
      const ratio = aspectMap[formato] || "9:16";

      const renderRes = await fetch("https://api.shotstack.io/edit/stage/render", {
        method: "POST",
        headers: { "x-api-key": SHOTSTACK_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          timeline: { background: "#000000", tracks },
          output: {
            format: "mp4",
            aspectRatio: ratio,
            size: sizeMap[ratio] || sizeMap["9:16"],
            fps: 30,
          },
        }),
      });

      if (!renderRes.ok) {
        const errText = await renderRes.text();
        console.error("Shotstack render error:", renderRes.status, errText);
        await updateJob(jobId, { status: "error", progress: 100, video_url: null, error: `Render failed: ${renderRes.status}` });
        return json({ jobId, status: "error", message: "Falha na renderização", images: imageUrls, audioUrl });
      }

      const renderData = await renderRes.json();
      const renderId = renderData?.response?.id;
      if (!renderId) {
        await updateJob(jobId, { status: "error", progress: 100, error: "No renderId" });
        return json({ jobId, status: "error", message: "Falha ao iniciar render", error: "No renderId" }, 500);
      }

      await updateJob(jobId, { progress: 70 });

      // Poll Shotstack
      let videoUrl: string | null = null;
      const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
      for (let i = 0; i < 60; i++) {
        await delay(5000);
        const pollRes = await fetch(`https://api.shotstack.io/edit/stage/render/${renderId}`, {
          headers: { "x-api-key": SHOTSTACK_API_KEY },
        });
        if (!pollRes.ok) continue;
        const pollData = await pollRes.json();
        const renderStatus = pollData?.response?.status;
        await updateJob(jobId, { progress: 70 + Math.min(25, Math.round(i * 0.8)) });
        if (renderStatus === "done") { videoUrl = pollData?.response?.url || null; break; }
        if (renderStatus === "failed") { console.error("Render failed:", pollData?.response?.error); break; }
      }

      if (!videoUrl) {
        await updateJob(jobId, { status: "error", progress: 100, error: "Render timeout" });
        return json({ jobId, status: "error", message: "Tempo limite na renderização", error: "Render timeout" }, 500);
      }

      // ── PERSIST VIDEO TO STORAGE ──
      let finalVideoUrl = videoUrl;
      try {
        const vRes = await fetch(videoUrl);
        if (vRes.ok) {
          const buffer = await vRes.arrayBuffer();
          if (buffer.byteLength > 1000) {
            const storagePath = `generated/${jobId}.mp4`;
            const { error: upErr } = await admin.storage
              .from("videos")
              .upload(storagePath, buffer, { contentType: "video/mp4", upsert: true });
            if (!upErr) {
              const { data: pubData } = admin.storage.from("videos").getPublicUrl(storagePath);
              finalVideoUrl = pubData.publicUrl;
            }
          }
        }
      } catch (e) {
        console.error("[commercial] persist failed:", e);
      }

      await updateJob(jobId, { status: "completed", progress: 100, video_url: finalVideoUrl, error: null });
      return json({ jobId, status: "completed", message: "Vídeo renderizado com sucesso", videoUrl: finalVideoUrl, audioUrl, images: imageUrls });
    }

    return json({ error: "step inválido", message: "Use step analyze ou render" }, 400);
  } catch (e) {
    console.error("Error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error", message: "Falha interna ao processar vídeo" }, 500);
  }
});
