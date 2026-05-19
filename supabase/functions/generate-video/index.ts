import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

declare const EdgeRuntime: { waitUntil: (promise: Promise<unknown>) => void };

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

// ── helpers ──────────────────────────────────────────────────────────────────

const updateJob = async (
  admin: ReturnType<typeof createClient>,
  jobId: string,
  fields: Record<string, unknown>,
) => {
  await admin.from("video_jobs").update(fields).eq("id", jobId);
};

/**
 * Downloads a video from an external URL and uploads it to Supabase Storage.
 * Returns the public URL or null on failure.
 */
const persistVideoToStorage = async (
  admin: ReturnType<typeof createClient>,
  jobId: string,
  externalUrl: string,
): Promise<string | null> => {
  try {
    const res = await fetch(externalUrl);
    if (!res.ok) {
      console.error(`[persistVideo] fetch failed: ${res.status}`);
      return null;
    }
    const buffer = await res.arrayBuffer();
    if (buffer.byteLength < 1000) {
      console.error(`[persistVideo] file too small: ${buffer.byteLength}`);
      return null;
    }
    const storagePath = `generated/${jobId}.mp4`;
    const { error: uploadErr } = await admin.storage
      .from("videos")
      .upload(storagePath, buffer, { contentType: "video/mp4", upsert: true });
    if (uploadErr) {
      console.error("[persistVideo] upload error:", uploadErr);
      return null;
    }
    const { data } = admin.storage.from("videos").getPublicUrl(storagePath);
    console.log(`[persistVideo] ✅ saved ${storagePath} (${buffer.byteLength} bytes)`);
    return data.publicUrl;
  } catch (e) {
    console.error("[persistVideo] exception:", e);
    return null;
  }
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

  const voiceId = "onwK4e9ZLuTAKqWW03F9"; // Daniel
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";

    // ── Auth ──
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const isServiceRole = authHeader.includes(serviceRoleKey);

    let callerUserId = "service_role";

    if (!isServiceRole) {
      const authClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error: authError } = await authClient.auth.getUser();
      if (authError || !user) return json({ error: "Unauthorized" }, 401);
      callerUserId = user.id;

      if (isRateLimited(callerUserId)) {
        return json({ error: "Rate limit excedido. Tente novamente em 1 minuto." }, 429);
      }

      // ── Subscription limit check ──
      const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
      const { data: sub } = await adminClient.from("subscriptions").select("videos_used, videos_limit, plan").eq("user_id", callerUserId).maybeSingle();
      if (sub && sub.videos_limit !== null && sub.videos_used >= sub.videos_limit) {
        return json({ error: "LIMIT_REACHED", message: `Limite de ${sub.videos_limit} vídeos do plano ${sub.plan} atingido. Faça upgrade.` }, 403);
      }
    }

    let body: Record<string, any> = {};
    try {
      body = await req.json();
    } catch (error) {
      console.error("generate-video invalid json", error);
      return json({ error: "JSON inválido", message: "Envie um body JSON válido." }, 400);
    }

    const {
      imageUrl,
      image,
      prompt,
      narracao,
      createJob = false,
      productType = "produto premium",
      style = "cinematografico",
      duration = 5,
      format = "16:9",
    } = body;

    const resolvedImageUrl =
      typeof imageUrl === "string" && imageUrl.trim()
        ? imageUrl
        : typeof image === "string" && image.trim()
          ? image
          : null;

    console.log("generate-video request", {
      hasImage: Boolean(resolvedImageUrl),
      hasPrompt: Boolean(prompt),
      createJob: Boolean(createJob),
      productType,
      style,
      duration,
      format,
    });

    if (!resolvedImageUrl && !prompt && !narracao) {
      return json({ error: "prompt ou imageUrl obrigatório", message: "Envie uma imagem ou um prompt para iniciar a geração." }, 400);
    }

    const wantsJob = Boolean(createJob);
    let jobId: string | null = null;
    let adminClient: ReturnType<typeof createClient> | null = null;

    // ── Create job ──
    if (wantsJob && callerUserId !== "service_role") {
      if (!supabaseUrl || !serviceRoleKey) return json({ error: "Supabase env not configured" }, 500);

      adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

      // Check plan limits using usuarios_planos table
      const { data: planRow } = await adminClient
        .from("usuarios_planos")
        .select("plano, uso_hoje_json, limite_diario_json, reset_at")
        .eq("user_id", callerUserId)
        .maybeSingle();

      if (planRow) {
        const limites = (planRow.limite_diario_json || {}) as Record<string, number>;
        const uso = (planRow.uso_hoje_json || {}) as Record<string, number>;
        const videoLimit = limites.videos_dia;
        const videosUsed = uso.videos_dia || 0;

        // Reset if needed
        if (planRow.reset_at && new Date(planRow.reset_at).getTime() <= Date.now()) {
          await adminClient
            .from("usuarios_planos")
            .update({
              uso_hoje_json: {},
              reset_at: new Date(Date.now() + 86400000).toISOString(),
            })
            .eq("user_id", callerUserId);
        } else if (typeof videoLimit === "number" && videosUsed >= videoLimit) {
          return json({ error: "Limite diário de vídeos atingido.", code: "PLAN_LIMIT" }, 429);
        }

        // Increment usage
        await adminClient
          .from("usuarios_planos")
          .update({
            uso_hoje_json: { ...uso, videos_dia: videosUsed + 1 },
          })
          .eq("user_id", callerUserId);
      }

      const { data: job, error: jobError } = await adminClient
        .from("video_jobs")
        .insert({
          user_id: callerUserId,
          status: "pending",
          prompt: prompt || null,
          image_url: resolvedImageUrl,
          video_url: null,
          error: null,
          provider: "native",
          render_mode: "native_pipeline",
          progress: 0,
          metadata: { pipeline_lock: false, requested_by: "generate-video", requested_at: new Date().toISOString() },
        })
        .select("id")
        .single();

      if (jobError) throw jobError;
      jobId = job.id;

      EdgeRuntime.waitUntil(fetch(`${supabaseUrl}/functions/v1/process-video-job`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          "x-pipeline-secret": Deno.env.get("PIPELINE_SECRET") || serviceRoleKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ jobId, imageUrl: resolvedImageUrl, prompt, source: "generate-video" }),
      }));

      return json({ jobId, status: "pending", accepted: true }, 202);
    }

    // Ensure adminClient exists for storage operations
    if (!adminClient && supabaseUrl && serviceRoleKey) {
      adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    }

    const productInfo = productType || style || "produto premium";
    const promptText = prompt || `Vídeo cinematográfico para ${productInfo}`;

    // ── Pipeline: Script → Voice → Video ──

    // Step 1: Script
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

    // Step 2: Voice
    if (wantsJob && adminClient && jobId) {
      await updateJob(adminClient, jobId, { progress: 35, status: "generating_voice", caption_text: script });
    }

    let audioUrl: string | null = null;
    try {
      const audioBuffer = await generateVoiceover(script);
      if (audioBuffer && adminClient) {
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

    // Step 3: Video (only if image provided)
    if (wantsJob && adminClient && jobId) {
      await updateJob(adminClient, jobId, { progress: 55, status: "generating_video", audio_url: audioUrl });
    }

    let videoUrl: string | null = null;
    if (resolvedImageUrl) {
      try {
        videoUrl = await generateRunwayVideo(resolvedImageUrl, promptText);
      } catch (e) {
        console.error("Video generation failed:", e);
      }
    }

    // ── PERSIST VIDEO TO STORAGE (OBRIGATÓRIO) ──
    if (videoUrl && adminClient && jobId) {
      const persistedUrl = await persistVideoToStorage(adminClient, jobId, videoUrl);
      if (persistedUrl) {
        videoUrl = persistedUrl; // Use the storage URL instead of external
      }
    }

    // ── Result ──
    if (!videoUrl) {
      // NO FALLBACK FAKE — mark as error so auto-heal can retry later
      if (wantsJob && adminClient && jobId) {
        await updateJob(adminClient, jobId, {
          status: "error",
          progress: 100,
          video_url: null,
          audio_url: audioUrl,
          caption_text: script,
          error: "Geração de vídeo falhou — aguardando reprocessamento",
        });
      }
      return json({ videoUrl: null, audioUrl, script, provider: "none", jobId, status: "error" });
    }

    // ── Success ──
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

    // ── Increment videos_used ──
    if (callerUserId !== "service_role") {
      const adminInc = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
      await adminInc.rpc("increment_videos_used", { _user_id: callerUserId }).maybeSingle();
    }

    return json({ videoUrl, audioUrl, script, provider: "runway", jobId });
  } catch (e) {
    console.error("Error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
