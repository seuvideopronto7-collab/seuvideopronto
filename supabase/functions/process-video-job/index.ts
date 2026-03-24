import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false },
});

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const updateJob = async (jobId: string, updates: Record<string, unknown>) => {
  const { error } = await supabase.from("video_jobs").update(updates).eq("id", jobId);
  if (error) throw error;
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
    const { jobId, imageUrl, productType, style, useDarkflow, useViral } = await req.json();

    if (!jobId || !imageUrl) {
      return new Response(JSON.stringify({ error: "jobId e imageUrl sao obrigatorios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await updateJob(jobId, { status: "processing", progress: 5 });
    await delay(400);
    await updateJob(jobId, { status: "generating_prompt", progress: 15 });
    await delay(400);

    const response = await fetch(`${supabaseUrl}/functions/v1/generate-video`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseServiceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        imageUrl,
        estilo: useDarkflow ? "darkflow" : "cinematografico",
        movimento: useViral ? "cortes dinamicos" : "zoom cinematografico",
        duracao: 6,
        conteudoRelacionado: true,
        produto: productType,
        nicho: style,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("generate-video error:", response.status, text);
      await updateJob(jobId, { status: "fallback", progress: 100, video_url: null });
      return new Response(JSON.stringify({ id: jobId, status: "fallback" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const videoUrl = data?.videoUrl || data?.video_url || null;

    if (!videoUrl) {
      await updateJob(jobId, { status: "failed", progress: 100, video_url: null });
      return new Response(JSON.stringify({ id: jobId, status: "failed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await updateJob(jobId, { status: "completed", progress: 100, video_url: videoUrl });

    return new Response(JSON.stringify({ id: jobId, status: "completed", video_url: videoUrl }), {
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
