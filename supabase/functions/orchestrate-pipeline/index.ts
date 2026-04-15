import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";

const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

const log = async (jobId: string, stage: string, level: string, message: string, payload: Record<string, unknown> = {}) => {
  await admin.from("job_logs").insert({ job_id: jobId, stage, level, message, payload_json: payload });
};

const updateJob = async (jobId: string, updates: Record<string, unknown>) => {
  const { error } = await admin.from("pipeline_jobs").update(updates).eq("id", jobId);
  if (error) console.error("updateJob error:", error);
};

const withTimeout = async <T>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Timeout: ${label} excedeu ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeout]);
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método não permitido" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

  // ====== AUTH CHECK ======
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: jsonHeaders });
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: jsonHeaders });
  }

  try {
    const { jobId } = await req.json();
    if (!jobId) {
      return new Response(JSON.stringify({ error: "jobId obrigatório" }), { status: 400, headers: jsonHeaders });
    }

    // Fetch job
    const { data: job, error: jobErr } = await admin
      .from("pipeline_jobs")
      .select("*")
      .eq("id", jobId)
      .maybeSingle();

    if (jobErr || !job) {
      return new Response(JSON.stringify({ error: "Job não encontrado" }), { status: 404, headers: jsonHeaders });
    }

    // Verify ownership: user must own this job or be admin
    if (job.user_id !== user.id) {
      // Check admin role
      const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: jsonHeaders });
      }
    }

    // Idempotência: não reprocessar jobs já concluídos
    if (job.current_stage === "concluido" && job.status === "concluido") {
      return new Response(JSON.stringify({ ok: true, message: "Job já concluído" }), { headers: jsonHeaders });
    }

    const userId = job.user_id;

    // ====== ETAPA 1: ROTEIRO ======
    await updateJob(jobId, { current_stage: "roteiro", status: "processando", progress: 10 });
    await log(jobId, "roteiro", "info", "Iniciando geração de roteiro");

    try {
      const modeTemplates: Record<string, any> = {
        comercial: {
          hook: `Você ainda não conhece ${job.title}? Isso pode mudar tudo.`,
          problema: `Se você é ${job.audience || "empreendedor"} e atua com ${job.niche || "digital"}, sabe como é difícil se destacar.`,
          amplificacao: `A maioria tenta de tudo e continua invisível. Perde tempo, dinheiro e energia.`,
          solucao: `${job.title} resolve isso de forma direta — com resultado comprovado.`,
          prova: `Milhares já usam e o retorno fala por si.`,
          cta: job.cta || `Clique agora e comece hoje.`,
        },
        autoridade: {
          hook: `O que os melhores de ${job.niche || "marketing"} fazem diferente?`,
          problema: `${job.audience || "Profissionais"} precisam de resultados — não de mais conteúdo genérico.`,
          amplificacao: `Enquanto outros copiam tendências, os líderes constroem autoridade real.`,
          solucao: `${job.title} é o caminho que os top 1% seguem.`,
          prova: `Veja os resultados de quem já aplica.`,
          cta: job.cta || `Siga para aprender mais.`,
        },
        viral: {
          hook: `PARA TUDO! 🚨 Você precisa ver isso sobre ${job.niche || "internet"}.`,
          problema: `Todo mundo fala, ninguém mostra na prática.`,
          amplificacao: `Se você não agir agora, vai continuar no mesmo lugar.`,
          solucao: `${job.title} é a prova de que funciona.`,
          prova: `Os números não mentem.`,
          cta: job.cta || `Compartilhe com quem precisa ver isso.`,
        },
        dark: {
          hook: `Eles não querem que ${job.audience || "você"} saiba disso sobre ${job.niche || "o sistema"}...`,
          problema: `O sistema foi feito para te manter preso no ciclo.`,
          amplificacao: `Enquanto você duvida, outros estão lucrando calados.`,
          solucao: `${job.title} é a brecha que poucos encontraram.`,
          prova: `Os resultados estão aí para quem quer ver.`,
          cta: job.cta || `Toque no link antes que derrubem.`,
        },
      };

      const tpl = modeTemplates[job.script_mode] || modeTemplates.comercial;
      const fullScript = Object.values(tpl).join(" ");
      const scenes = Object.entries(tpl).map(([key, text], i) => ({
        texto: text,
        visual: `Cena ${i + 1}: ${job.niche || "negócios"}, cinematic dark premium`,
        emocao: ["curiosidade", "tensão", "solução", "urgência"][Math.min(i, 3)],
        duracao: "5s",
      }));

      await admin.from("job_assets").insert({
        job_id: jobId,
        type: "script",
        provider: "internal",
        meta_json: { fullScript, scenes, mode: job.script_mode },
      });

      await log(jobId, "roteiro", "info", "Roteiro gerado com sucesso", { scenesCount: scenes.length });
      await updateJob(jobId, { current_stage: "roteiro", status: "concluido", progress: 20 });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro desconhecido no roteiro";
      await log(jobId, "roteiro", "error", msg);
      await updateJob(jobId, { status: "erro", error_message: msg, progress: 10 });
      return new Response(JSON.stringify({ ok: false, error: msg, stage: "roteiro" }), { headers: jsonHeaders });
    }

    // ====== ETAPA 2: NARRAÇÃO ======
    if (job.voice !== "sem") {
      await updateJob(jobId, { current_stage: "narracao", status: "processando", progress: 30 });
      await log(jobId, "narracao", "info", "Iniciando narração");

      try {
        const { data: scriptAsset } = await admin
          .from("job_assets")
          .select("meta_json")
          .eq("job_id", jobId)
          .eq("type", "script")
          .maybeSingle();

        const fullScript = (scriptAsset?.meta_json as any)?.fullScript || job.title;
        const voiceId = job.voice === "masculina" ? "onwK4e9ZLuTAKqWW03F9" : "EXAVITQu4vr4xnSDxMaL";
        const elevenLabsKey = Deno.env.get("ELEVENLABS_API_KEY");

        let audioUrl: string | null = null;

        if (elevenLabsKey) {
          try {
            const ttsRes = await withTimeout(
              fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
                method: "POST",
                headers: { "xi-api-key": elevenLabsKey, "Content-Type": "application/json" },
                body: JSON.stringify({ text: fullScript, model_id: "eleven_multilingual_v2" }),
              }),
              15000,
              "ElevenLabs TTS"
            );

            if (ttsRes.ok) {
              const audioBuffer = await ttsRes.arrayBuffer();
              // Store under user-scoped path for RLS compatibility
              const path = `${userId}/voiceovers/${jobId}/${Date.now()}.mp3`;
              const { error: upErr } = await admin.storage
                .from("audio")
                .upload(path, audioBuffer, { contentType: "audio/mpeg", upsert: true });

              if (!upErr) {
                // Use signed URL instead of public URL (bucket is private)
                const { data: signedData } = await admin.storage
                  .from("audio")
                  .createSignedUrl(path, 86400); // 24h
                audioUrl = signedData?.signedUrl || null;
              }
            }
          } catch (ttsErr) {
            await log(jobId, "narracao", "warning", `ElevenLabs falhou: ${ttsErr instanceof Error ? ttsErr.message : "erro"}`);
          }
        }

        if (audioUrl) {
          await admin.from("job_assets").insert({
            job_id: jobId,
            type: "audio",
            provider: elevenLabsKey ? "elevenlabs" : "fallback",
            url: audioUrl,
            meta_json: { voiceId, voice: job.voice },
          });
        }

        await log(jobId, "narracao", "info", audioUrl ? "Narração gerada" : "Narração pulada (sem provider)", { audioUrl });
        await updateJob(jobId, { current_stage: "narracao", status: "concluido", progress: 45 });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Erro na narração";
        await log(jobId, "narracao", "error", msg);
        await updateJob(jobId, { status: "erro", error_message: msg, progress: 30 });
        return new Response(JSON.stringify({ ok: false, error: msg, stage: "narracao" }), { headers: jsonHeaders });
      }
    } else {
      await updateJob(jobId, { current_stage: "narracao", status: "concluido", progress: 45 });
      await log(jobId, "narracao", "info", "Sem narração (opção do usuário)");
    }

    // ====== ETAPA 3: IMAGENS ======
    await updateJob(jobId, { current_stage: "imagens", status: "processando", progress: 55 });
    await log(jobId, "imagens", "info", "Gerando imagens para cenas");

    try {
      const imageUrl = job.reference_image_url || null;

      const { data: scriptAsset } = await admin
        .from("job_assets")
        .select("meta_json")
        .eq("job_id", jobId)
        .eq("type", "script")
        .maybeSingle();

      const scenes = (scriptAsset?.meta_json as any)?.scenes || [];

      for (let i = 0; i < scenes.length; i++) {
        await admin.from("job_assets").insert({
          job_id: jobId,
          type: "image",
          scene_index: i,
          provider: "fallback",
          url: imageUrl,
          meta_json: { prompt: scenes[i]?.visual || "", fallback: true },
        });
      }

      await log(jobId, "imagens", "info", `${scenes.length} imagens registradas`, { fallback: true });
      await updateJob(jobId, { current_stage: "imagens", status: "concluido", progress: 70 });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro nas imagens";
      await log(jobId, "imagens", "error", msg);
      await updateJob(jobId, { status: "erro", error_message: msg, progress: 55 });
      return new Response(JSON.stringify({ ok: false, error: msg, stage: "imagens" }), { headers: jsonHeaders });
    }

    // ====== ETAPA 4: VÍDEO ======
    await updateJob(jobId, { current_stage: "video", status: "processando", progress: 80 });
    await log(jobId, "video", "info", "Iniciando renderização");

    try {
      const shotstackKey = Deno.env.get("SHOTSTACK_API_KEY");
      let videoUrl: string | null = null;

      if (shotstackKey) {
        await log(jobId, "video", "info", "Tentando render via Shotstack");
        await log(jobId, "video", "warning", "Shotstack render: aguardando implementação completa — usando fallback canvas no cliente");
      }

      if (!videoUrl) {
        await admin.from("job_assets").insert({
          job_id: jobId,
          type: "video",
          provider: "pending-canvas",
          meta_json: { needsClientRender: true, aspectRatio: job.aspect_ratio },
        });
      }

      await updateJob(jobId, { current_stage: "concluido", status: "concluido", progress: 100 });
      await log(jobId, "video", "info", "Pipeline concluído", { videoUrl });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro no render";
      await log(jobId, "video", "error", msg);
      await updateJob(jobId, { status: "erro", error_message: msg, progress: 80 });
      return new Response(JSON.stringify({ ok: false, error: msg, stage: "video" }), { headers: jsonHeaders });
    }

    return new Response(JSON.stringify({ ok: true, jobId, status: "concluido" }), { headers: jsonHeaders });
  } catch (e) {
    console.error("Pipeline error:", e);
    return new Response(JSON.stringify({ error: "Erro interno no pipeline" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
