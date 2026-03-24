import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageUrl, image, estilo, movimento, duracao } = await req.json();
    const resolvedImageUrl = imageUrl || image;
    if (!resolvedImageUrl) {
      return new Response(JSON.stringify({ error: "imageUrl requerido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const provider = (Deno.env.get("VIDEO_PROVIDER") || "").toLowerCase();
    const runwayUrl = Deno.env.get("RUNWAY_API_URL");
    const runwayKey = Deno.env.get("RUNWAY_API_KEY");
    const pikaUrl = Deno.env.get("PIKA_API_URL");
    const pikaKey = Deno.env.get("PIKA_API_KEY");

    if (provider === "runway" && runwayUrl && runwayKey) {
      const response = await fetch(runwayUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${runwayKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image_url: resolvedImageUrl,
          style: estilo || "cinematografico",
          motion: movimento || "leve zoom + parallax",
          duration: duracao || 5,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error("Runway error:", response.status, text);
      } else {
        const data = await response.json();
        const videoUrl = data?.videoUrl || data?.video_url || data?.output?.url;
        if (videoUrl) {
          return new Response(JSON.stringify({ videoUrl, provider: "runway" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    if (provider === "pika" && pikaUrl && pikaKey) {
      const response = await fetch(pikaUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${pikaKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image_url: resolvedImageUrl,
          style: estilo || "cinematografico",
          motion: movimento || "leve zoom + parallax",
          duration: duracao || 5,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error("Pika error:", response.status, text);
      } else {
        const data = await response.json();
        const videoUrl = data?.videoUrl || data?.video_url || data?.output?.url;
        if (videoUrl) {
          return new Response(JSON.stringify({ videoUrl, provider: "pika" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    const fallbackReason = provider
      ? "Falha ao gerar video com o provedor configurado"
      : "Nenhum provedor de video configurado";
    return new Response(JSON.stringify({ error: fallbackReason }), {
      status: 503,
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
