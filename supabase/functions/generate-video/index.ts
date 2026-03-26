import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// ── Rate limiting (5 req/min per user) ──
const rateLimitMap = new Map<string, number[]>();
const isRateLimited = (userId: string): boolean => {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(userId) || []).filter(t => now - t < 60_000);
  if (timestamps.length >= 5) return true;
  timestamps.push(now);
  rateLimitMap.set(userId, timestamps);
  return false;
};

const getNextResetDate = () => {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
  return next.toISOString();
};

const resolvePlanConfig = (plan?: string) => {
  const normalized = (plan || "free").toLowerCase();
  if (normalized === "premium") {
    return { plan: "premium", limit: null, priority: 3 };
  }
  if (normalized === "pro") {
    return { plan: "pro", limit: 20, priority: 2 };
  }
  return { plan: "free", limit: 2, priority: 1 };
};

// ── helpers ──────────────────────────────────────────────────────────────────

const updateJob = async (
  admin: ReturnType<typeof createClient>,
  jobId: string,
  fields: Record<string, unknown>,
) => {
  await admin.from("video_jobs").update(fields).eq("id", jobId);
};

// ── Step 1: Generate script via Lovable AI ──────────────────────────────────

const generateScript = async (prompt: string, productInfo: string): Promise<string> => {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content:
            "Você é um roteirista publicitário premium. Crie roteiros curtos (máx 60 palavras) para vídeos comerciais cinematográficos de produtos. O roteiro deve ter: gancho forte na primeira frase, 2-3 benefícios impactantes e CTA final. Tom: premium, confiante, direto. Responda APENAS com o texto do roteiro, sem formatação.",
        },
        {
          role: "user",
          content: `Crie um roteiro cinematográfico de venda para: ${productInfo}. Contexto adicional: ${prompt}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    console.error("Lovable AI error:", res.status, t);
    throw new Error(`AI script generation failed: ${res.status}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "Descubra o produto que vai transformar sua rotina.";
};

// ── Step 2: Generate voiceover via ElevenLabs ───────────────────────────────

const generateVoiceover = async (script: string): Promise<ArrayBuffer | null> => {
  const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
  if (!apiKey) {
    console.warn("ELEVENLABS_API_KEY not set, skipping voiceover");
    return null;
  }

  const voiceId = "onwK4e9ZLuTAKqWW03F9"; // Daniel - commercial male voice
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: script,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.6,
          similarity_boost: 0.8,
          style: 0.4,
          use_speaker_boost: true,
        },
      }),
    },
  );

  if (!res.ok) {
    const t = await res.text();
    console.error("ElevenLabs error:", res.status, t);
    return null;
  }

  return await res.arrayBuffer();
};

// ── Step 3: Generate video via Runway ───────────────────────────────────────

const generateRunwayVideo = async (imageUrl: string, prompt: string): Promise<string | null> => {
  const apiKey = Deno.env.get("RUNWAY_API_KEY");
  const apiUrl = Deno.env.get("RUNWAY_API_URL") || "https://api.dev.runwayml.com/v1/image_to_video";
  if (!apiKey) {
    console.warn("RUNWAY_API_KEY not set, skipping video generation");
    return null;
  }

  // Create task
  const createRes = await fetch(apiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "X-Runway-Version": "2024-11-06",
    },
    body: JSON.stringify({
      promptImage: imageUrl,
      promptText: `ultra cinematic commercial, premium lighting, product focus, depth of field, ${prompt}`,
      duration: 5,
      ratio: "16:9",
    }),
  });

  if (!createRes.ok) {
    const t = await createRes.text();
    console.error("Runway create error:", createRes.status, t);
    return null;
  }

  const task = await createRes.json();
  const taskId = task.id;
  if (!taskId) {
    console.error("Runway: no task ID returned", task);
    return null;
  }

  // Poll for completion (max 120s)
  const pollUrl = Deno.env.get("RUNWAY_API_URL")
    ? `${Deno.env.get("RUNWAY_API_URL")}/${taskId}`
    : `https://api.dev.runwayml.com/v1/tasks/${taskId}`;

  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 3000));

    const pollRes = await fetch(pollUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "X-Runway-Version": "2024-11-06",
      },
    });

    if (!pollRes.ok) continue;

    const status = await pollRes.json();
    if (status.status === "SUCCEEDED") {
      return status.output?.[0] || status.output?.url || null;
    }
    if (status.status === "FAILED") {
      console.error("Runway task failed:", status.failure);
      return null;
    }
  }

  console.error("Runway: polling timeout");
  return null;
};

// ── Main handler ────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json();
    const {
      imageUrl,
      image,
      prompt,
      estilo,
      movimento,
      duracao,
      conteudoRelacionado,
      textoNaTela,
      narracao,
      createJob,
      productType,
      style,
    } = body;

    const resolvedImageUrl = imageUrl || image;

    if (conteudoRelacionado === false) {
      return json({ error: "Conteudo nao relacionado. Geracao bloqueada." }, 422);
    }
    if (!resolvedImageUrl) {
      return json({ error: "imageUrl requerido" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";

    const wantsJob = Boolean(createJob);
    let jobId: string | null = null;
    let adminClient: ReturnType<typeof createClient> | null = null;

    // ── Auth & create job ─────────────────────────────────────────────────
    if (wantsJob) {
      if (!supabaseUrl || !serviceRoleKey) {
        return json({ error: "Supabase env not configured" }, 500);
      }

      const authHeader = req.headers.get("Authorization") || "";
      if (!authHeader) return json({ error: "Unauthorized" }, 401);

      const userClient = createClient(supabaseUrl, anonKey, {
        auth: { persistSession: false },
        global: { headers: { Authorization: authHeader } },
      });
      const { data: authData, error: authError } = await userClient.auth.getUser();
      if (authError || !authData?.user) return json({ error: "Unauthorized" }, 401);

      adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

      const { data: existingSub, error: subError } = await adminClient
        .from("subscriptions")
        .select("id, plan, videos_limit, videos_used, reset_date, status")
        .eq("user_id", authData.user.id)
        .maybeSingle();

      if (subError) throw subError;

      const planConfig = resolvePlanConfig(existingSub?.plan || "free");
      let subscription = existingSub;

      if (!subscription) {
        const { data: created, error: createSubError } = await adminClient
          .from("subscriptions")
          .insert({
            user_id: authData.user.id,
            plan: planConfig.plan,
            videos_limit: planConfig.limit,
            videos_used: 0,
            reset_date: getNextResetDate(),
            status: "active",
          })
          .select("id, plan, videos_limit, videos_used, reset_date, status")
          .single();
        if (createSubError) throw createSubError;
        subscription = created;
      }

      if (subscription?.reset_date && new Date(subscription.reset_date).getTime() <= Date.now()) {
        const { data: resetSub, error: resetError } = await adminClient
          .from("subscriptions")
          .update({ videos_used: 0, reset_date: getNextResetDate() })
          .eq("user_id", authData.user.id)
          .select("id, plan, videos_limit, videos_used, reset_date, status")
          .single();
        if (resetError) throw resetError;
        subscription = resetSub;
      }

      const resolvedLimit = subscription?.videos_limit ?? planConfig.limit;
      if (resolvedLimit !== null && subscription && subscription.videos_used >= resolvedLimit) {
        return json({ error: "Limite diário de vídeos atingido.", code: "PLAN_LIMIT" }, 429);
      }

      if (subscription) {
        const { error: consumeError } = await adminClient
          .from("subscriptions")
          .update({ videos_used: (subscription.videos_used || 0) + 1 })
          .eq("user_id", authData.user.id);
        if (consumeError) throw consumeError;
      }
      const { data: job, error: jobError } = await adminClient
        .from("video_jobs")
        .insert({
          user_id: authData.user.id,
          status: "started",
          prompt: prompt || null,
          image_url: resolvedImageUrl,
          progress: 5,
          priority: resolvePlanConfig(subscription?.plan || "free").priority,
        })
        .select("id")
        .single();

      if (jobError) throw jobError;
      jobId = job.id;
    }

    const productInfo = productType || estilo || "produto premium";
    const promptText = prompt || `Vídeo cinematográfico para ${productInfo}`;

    // ── Pipeline: Script → Voice → Video ──────────────────────────────────

    // Step 1: Generate script
    if (wantsJob && adminClient && jobId) {
      await updateJob(adminClient, jobId, { progress: 15, status: "generating_script" });
    }

    let script: string;
    try {
      script = await generateScript(promptText, productInfo);
    } catch (e) {
      console.error("Script generation failed, using fallback:", e);
      script = narracao || "Descubra o produto que vai revolucionar sua rotina. Qualidade premium, resultado imediato. Garanta o seu agora.";
    }

    // Step 2: Generate voiceover
    if (wantsJob && adminClient && jobId) {
      await updateJob(adminClient, jobId, {
        progress: 35,
        status: "generating_voice",
        caption_text: script,
      });
    }

    let audioUrl: string | null = null;
    try {
      const audioBuffer = await generateVoiceover(script);
      if (audioBuffer && adminClient) {
        // Upload audio to storage
        const audioPath = `voiceovers/${jobId || Date.now()}.mp3`;
        const { error: uploadErr } = await adminClient.storage
          .from("audio")
          .upload(audioPath, audioBuffer, { contentType: "audio/mpeg", upsert: true });

        if (!uploadErr) {
          const { data: urlData } = adminClient.storage.from("audio").getPublicUrl(audioPath);
          audioUrl = urlData.publicUrl;
        }
      }
    } catch (e) {
      console.error("Voiceover generation failed:", e);
    }

    // Step 3: Generate video
    if (wantsJob && adminClient && jobId) {
      await updateJob(adminClient, jobId, {
        progress: 55,
        status: "generating_video",
        audio_url: audioUrl,
      });
    }

    let videoUrl: string | null = null;
    try {
      videoUrl = await generateRunwayVideo(resolvedImageUrl, promptText);
    } catch (e) {
      console.error("Video generation failed:", e);
    }

    // ── Fallback if no video ──────────────────────────────────────────────
    if (!videoUrl) {
      const fallbackUrl = "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4";
      if (wantsJob && adminClient && jobId) {
        await updateJob(adminClient, jobId, {
          status: "fallback",
          progress: 100,
          video_url: fallbackUrl,
          audio_url: audioUrl,
          caption_text: script,
          error: "Video provider unavailable, fallback applied",
        });
      }
      return json({
        videoUrl: fallbackUrl,
        audioUrl,
        script,
        provider: "fallback",
        error: "Video provider unavailable",
        jobId,
      });
    }

    // ── Success ───────────────────────────────────────────────────────────
    if (wantsJob && adminClient && jobId) {
      await updateJob(adminClient, jobId, {
        status: "completed",
        progress: 100,
        video_url: videoUrl,
        audio_url: audioUrl,
        caption_text: script,
        error: null,
      });
    }

    return json({
      videoUrl,
      audioUrl,
      script,
      provider: "runway",
      jobId,
    });
  } catch (e) {
    console.error("Error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
