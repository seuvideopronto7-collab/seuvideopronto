import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const blockedMediaPatterns = [/big[_-]?buck[_-]?bunny/i, /\bdefault\b/i];
const isBlockedMedia = (value?: string) => Boolean(value && blockedMediaPatterns.some((pattern) => pattern.test(value)));

const runwayRequest = async (payload: Record<string, unknown>) => {
  const runwayUrl = Deno.env.get("RUNWAY_API_URL");
  const runwayKey = Deno.env.get("RUNWAY_API_KEY");
  if (!runwayUrl || !runwayKey) return null;
  const response = await fetch(runwayUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${runwayKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Runway error ${response.status}: ${text}`);
  }
  const data = await response.json();
  return data?.videoUrl || data?.video_url || data?.output?.url || null;
};

const pikaRequest = async (payload: Record<string, unknown>) => {
  const pikaUrl = Deno.env.get("PIKA_API_URL");
  const pikaKey = Deno.env.get("PIKA_API_KEY");
  if (!pikaUrl || !pikaKey) return null;
  const response = await fetch(pikaUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${pikaKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Pika error ${response.status}: ${text}`);
  }
  const data = await response.json();
  return data?.videoUrl || data?.video_url || data?.output?.url || null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Metodo nao permitido" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { imageUrl, image, estilo, movimento, duracao, conteudoRelacionado, prompt, textoNaTela, narracao, createJob } = body;
    const resolvedImageUrl = imageUrl || image;

    if (conteudoRelacionado === false) {
      return new Response(JSON.stringify({ error: "Conteudo nao relacionado. Geracao bloqueada." }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!resolvedImageUrl) {
      return new Response(JSON.stringify({ error: "imageUrl requerido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (isBlockedMedia(resolvedImageUrl)) {
      return new Response(JSON.stringify({ error: "Midia bloqueada. Envie conteudo real relacionado ao produto." }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";

    const wantsJob = Boolean(createJob);
    let jobId: string | null = null;
    let adminClient: ReturnType<typeof createClient> | null = null;

    if (wantsJob) {
      if (!supabaseUrl || !serviceRoleKey || !anonKey) {
        return new Response(JSON.stringify({ error: "Supabase env not configured." }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const authHeader = req.headers.get("Authorization") || "";
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const userClient = createClient(supabaseUrl, anonKey, {
        auth: { persistSession: false },
        global: { headers: { Authorization: authHeader } },
      });
      const { data: authData, error: authError } = await userClient.auth.getUser();
      if (authError || !authData?.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
      const { data: job, error: jobError } = await adminClient
        .from("video_jobs")
        .insert({
          user_id: authData.user.id,
          status: "processing",
          prompt: prompt || null,
          image_url: resolvedImageUrl,
          progress: 10,
        })
        .select("id")
        .single();

      if (jobError) throw jobError;
      jobId = job.id;
    }

    const payload = {
      image_url: resolvedImageUrl,
      style: estilo || "cinematografico",
      motion: movimento || "leve zoom + parallax",
      duration: duracao || 5,
      prompt,
      text_overlay: textoNaTela,
      narration: narracao,
    };

    const provider = (Deno.env.get("VIDEO_PROVIDER") || "").toLowerCase();
    const providers = provider ? [provider] : ["runway", "pika"];
    let providerUsed: string | null = null;
    let videoUrl: string | null = null;
    let providerError: string | null = null;

    for (const current of providers) {
      try {
        if (current === "runway") {
          videoUrl = await runwayRequest(payload);
        } else if (current === "pika") {
          videoUrl = await pikaRequest(payload);
        }
        if (videoUrl) {
          providerUsed = current;
          break;
        }
      } catch (err) {
        providerError = err instanceof Error ? err.message : "Falha no provedor";
      }
    }

    if (!videoUrl) {
      const fallbackUrl = "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4";
      const errorMessage =
        providerError || (provider ? "Falha ao gerar video com o provedor configurado" : "Nenhum provedor de video configurado");
      if (wantsJob && adminClient && jobId) {
        await adminClient
          .from("video_jobs")
          .update({ status: "fallback", progress: 100, video_url: fallbackUrl, error: errorMessage })
          .eq("id", jobId);
      }
      return new Response(
        JSON.stringify({ videoUrl: fallbackUrl, provider: "fallback", error: errorMessage, jobId }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (wantsJob && adminClient && jobId) {
      await adminClient
        .from("video_jobs")
        .update({ status: "completed", progress: 100, video_url: videoUrl, error: null })
        .eq("id", jobId);
    }

    return new Response(JSON.stringify({ videoUrl, provider: providerUsed, jobId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
