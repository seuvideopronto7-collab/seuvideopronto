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

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") || "";
  const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY") || "";
  const SHOTSTACK_API_KEY = Deno.env.get("SHOTSTACK_API_KEY") || "";

  if (!supabaseUrl || !serviceRoleKey) return json({ error: "Server config missing" }, 500);

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const updateJob = async (jobId: string, fields: Record<string, unknown>) => {
    await admin.from("video_jobs").update(fields).eq("id", jobId);
  };

  try {
    // ── Auth ──
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const { jobId, imageUrl, script, scenes } = body as {
      jobId: string;
      imageUrl: string;
      script: string;
      scenes: Array<{ texto: string; visual: string; emocao: string; prompt_imagem: string }>;
    };

    if (!jobId || !imageUrl) return json({ error: "jobId e imageUrl são obrigatórios" }, 400);

    // Verify job ownership
    const { data: job } = await admin.from("video_jobs").select("user_id").eq("id", jobId).maybeSingle();
    if (!job) return json({ error: "Job não encontrado" }, 404);
    if (job.user_id !== user.id) {
      const { data: adminRole } = await admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      if (!adminRole) return json({ error: "Forbidden" }, 403);
    }

    const sceneList = scenes?.length ? scenes : [
      { texto: script || "Produto premium cinematográfico", visual: "product shot", emocao: "curiosidade", prompt_imagem: "cinematic product shot, dark lighting, 9:16" },
    ];

    // ═══════════════════════════════════════════════════
    // STEP 1: GENERATE IMAGES (Lovable AI / Gemini)
    // ═══════════════════════════════════════════════════
    await updateJob(jobId, { status: "generating_images", progress: 10, scenes: sceneList });

    const imageUrls: string[] = [];

    if (LOVABLE_API_KEY) {
      for (let i = 0; i < sceneList.length; i++) {
        const scene = sceneList[i];
        const scenePrompt = `Generate a cinematic 9:16 vertical marketing image. Style: dark luxury, high contrast, dramatic lighting, ultra realistic 4k. Scene: ${scene.prompt_imagem || scene.visual}. Emotion: ${scene.emocao}. On a clean background`;

        try {
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

          if (!res.ok) {
            console.error(`Image gen scene ${i} failed:`, res.status);
            imageUrls.push(imageUrl); // fallback to original
            continue;
          }

          const data = await res.json();
          const base64Url = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

          if (base64Url) {
            // Upload to storage
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
              console.error(`Upload scene ${i} failed:`, uploadErr);
              imageUrls.push(imageUrl);
            }
          } else {
            imageUrls.push(imageUrl);
          }
        } catch (e) {
          console.error(`Scene ${i} image error:`, e);
          imageUrls.push(imageUrl);
        }

        const imgProgress = 10 + Math.round(((i + 1) / sceneList.length) * 30);
        await updateJob(jobId, { progress: imgProgress, images: imageUrls });
      }
    } else {
      // No AI key – use original image for all scenes
      for (let i = 0; i < sceneList.length; i++) imageUrls.push(imageUrl);
      await updateJob(jobId, { progress: 40, images: imageUrls });
    }

    // ═══════════════════════════════════════════════════
    // STEP 2: GENERATE AUDIO (ElevenLabs)
    // ═══════════════════════════════════════════════════
    await updateJob(jobId, { status: "generating_audio", progress: 45 });

    let audioUrl: string | null = null;
    const narrationText = script || sceneList.map((s) => s.texto).join(". ");

    if (ELEVENLABS_API_KEY && narrationText.trim()) {
      try {
        const voiceId = "onwK4e9ZLuTAKqWW03F9"; // Daniel - PT-BR
        const res = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
          {
            method: "POST",
            headers: {
              "xi-api-key": ELEVENLABS_API_KEY,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              text: narrationText,
              model_id: "eleven_multilingual_v2",
              voice_settings: {
                stability: 0.6,
                similarity_boost: 0.8,
                style: 0.4,
                use_speaker_boost: true,
              },
            }),
          }
        );

        if (res.ok) {
          const audioBuffer = await res.arrayBuffer();
          const audioPath = `voiceovers/${jobId}.mp3`;
          const { error: uploadErr } = await admin.storage
            .from("audio")
            .upload(audioPath, audioBuffer, { contentType: "audio/mpeg", upsert: true });
          if (!uploadErr) {
            const { data: urlData } = admin.storage.from("audio").getPublicUrl(audioPath);
            audioUrl = urlData.publicUrl;
          }
        } else {
          console.error("ElevenLabs error:", res.status, await res.text());
        }
      } catch (e) {
        console.error("Audio generation error:", e);
      }
    }

    await updateJob(jobId, { progress: 55, audio_url: audioUrl, caption_text: narrationText });

    // ═══════════════════════════════════════════════════
    // STEP 3: RENDER VIDEO (Shotstack)
    // ═══════════════════════════════════════════════════
    if (!SHOTSTACK_API_KEY) {
      console.warn("SHOTSTACK_API_KEY not set — marking as error (no fallback fake)");
      await updateJob(jobId, {
        status: "error",
        progress: 100,
        video_url: null,
        images: imageUrls,
        error: "Renderizador indisponível — aguardando reprocessamento",
      });
      return json({ jobId, status: "error", images: imageUrls, audioUrl });
    }

    await updateJob(jobId, { status: "rendering", progress: 65 });

    const sceneDuration = 3;
    const totalDuration = sceneList.length * sceneDuration;

    // Build Shotstack timeline
    const imageClips = imageUrls.map((url, i) => ({
      asset: { type: "image", src: url },
      start: i * sceneDuration,
      length: sceneDuration,
      fit: "cover" as const,
      transition: { in: "fade", out: "fade" },
    }));

    // Caption clips (TikTok style)
    const captionClips = sceneList.map((scene, i) => ({
      asset: {
        type: "html",
        html: `<p style="font-family:Montserrat;font-size:42px;color:#fff;text-align:center;text-shadow:2px 2px 8px rgba(0,0,0,0.9);font-weight:800;line-height:1.3">${scene.texto.slice(0, 80)}</p>`,
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

    if (audioUrl) {
      tracks.push({
        clips: [
          {
            asset: { type: "audio", src: audioUrl, volume: 1 },
            start: 0,
            length: totalDuration,
          },
        ],
      });
    }

    const shotstackPayload = {
      timeline: {
        background: "#000000",
        tracks,
      },
      output: {
        format: "mp4",
        aspectRatio: "9:16",
        size: { width: 1080, height: 1920 },
        fps: 30,
      },
    };

    const renderRes = await fetch("https://api.shotstack.io/edit/stage/render", {
      method: "POST",
      headers: {
        "x-api-key": SHOTSTACK_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(shotstackPayload),
    });

    if (!renderRes.ok) {
      const errText = await renderRes.text();
      console.error("Shotstack render error:", renderRes.status, errText);
      await updateJob(jobId, {
        status: "error",
        progress: 100,
        video_url: null,
        error: `Shotstack render failed: ${renderRes.status}`,
      });
      return json({ jobId, status: "error", images: imageUrls, audioUrl });
    }

    const renderData = await renderRes.json();
    const renderId = renderData?.response?.id;

    if (!renderId) {
      await updateJob(jobId, { status: "error", progress: 100, error: "Shotstack não retornou renderId" });
      return json({ jobId, status: "error", error: "No renderId" }, 500);
    }

    await updateJob(jobId, { progress: 70 });

    // ── Polling Shotstack ──
    let videoUrl: string | null = null;
    for (let i = 0; i < 60; i++) {
      await delay(5000);

      const pollRes = await fetch(`https://api.shotstack.io/edit/stage/render/${renderId}`, {
        headers: { "x-api-key": SHOTSTACK_API_KEY },
      });

      if (!pollRes.ok) continue;

      const pollData = await pollRes.json();
      const renderStatus = pollData?.response?.status;

      const pollProgress = 70 + Math.min(25, Math.round(i * 0.8));
      await updateJob(jobId, { progress: pollProgress });

      if (renderStatus === "done") {
        videoUrl = pollData?.response?.url || null;
        break;
      }
      if (renderStatus === "failed") {
        console.error("Shotstack render failed:", pollData?.response?.error);
        break;
      }
    }

    if (!videoUrl) {
      await updateJob(jobId, {
        status: "error",
        progress: 100,
        error: "Render timeout ou falha no Shotstack",
      });
      return json({ jobId, status: "error", error: "Render failed" }, 500);
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
            console.log(`[pipeline] ✅ persisted ${storagePath}`);
          }
        }
      }
    } catch (e) {
      console.error("[pipeline] persist failed, keeping original URL:", e);
    }

    // ── SUCCESS ──
    await updateJob(jobId, {
      status: "completed",
      progress: 100,
      video_url: finalVideoUrl,
      error: null,
    });

    return json({ jobId, status: "completed", videoUrl: finalVideoUrl, audioUrl, images: imageUrls });
  } catch (e) {
    console.error("Pipeline error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
