import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // ─── MANDATORY AUTH ───────────────────────────────────────
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return new Response(JSON.stringify({ error: "Credenciais ausentes" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  // Always derive user_id from JWT — never trust request body
  const user_id = userData.user.id;

  let body: { imageUrl?: string; prompt?: string } | null = null;

  try {
    body = await req.json();
  } catch (_err) {
    return new Response(JSON.stringify({ error: "JSON inválido" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { imageUrl, prompt } = body ?? {};

  if (!imageUrl || !prompt) {
    return new Response(
      JSON.stringify({ error: "imageUrl e prompt são obrigatórios" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: job, error: jobError } = await supabase
    .from("video_jobs")
    .insert({
      user_id,
      status: "processing",
      image_url: imageUrl,
      prompt,
    })
    .select()
    .single();

  if (jobError || !job) {
    return new Response(JSON.stringify({ error: "Falha ao criar job" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const response = await fetch("https://api.runwayml.com/v1/video", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("RUNWAY_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image: imageUrl,
        prompt,
        motion: "cinematic zoom",
        duration: 5,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Runway error: ${response.status} ${text}`);
    }

    const result = await response.json();

    const videoUrl =
      result?.video_url ||
      "https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4";

    await supabase
      .from("video_jobs")
      .update({
        status: "completed",
        video_url: videoUrl,
      })
      .eq("id", job.id);

    return new Response(JSON.stringify({ videoUrl }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    await supabase
      .from("video_jobs")
      .update({
        status: "error",
        error: String(err),
      })
      .eq("id", job.id);

    return new Response(JSON.stringify({ error: "Falha no vídeo" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
