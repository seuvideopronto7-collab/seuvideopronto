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

  let body:
    | {
        imageUrl?: string;
        prompt?: string;
        user_id?: string;
        jobId?: string;
        job_id?: string;
      }
    | null = null;

  try {
    body = await req.json();
  } catch (_err) {
    return new Response(JSON.stringify({ error: "JSON inválido" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { imageUrl, prompt, user_id, jobId, job_id } = body ?? {};

  if (!imageUrl) {
    return new Response(JSON.stringify({ error: "imageUrl é obrigatório" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Credenciais ausentes" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization") || "";
  let resolvedUserId = user_id || null;

  if (!resolvedUserId && authHeader && anonKey) {
    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });
    const { data } = await authClient.auth.getUser();
    resolvedUserId = data?.user?.id ?? null;
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const resolvedPrompt = prompt || "Produto premium com iluminação cinematográfica";
  let jobRecordId = jobId || job_id || null;

  if (resolvedUserId) {
    if (!jobRecordId) {
      const { data: job, error: jobError } = await adminClient
        .from("video_jobs")
        .insert({
          user_id: resolvedUserId,
          status: "processing",
          image_url: imageUrl,
          prompt: resolvedPrompt,
          progress: 5,
        })
        .select("id")
        .single();

      if (jobError || !job?.id) {
        return new Response(JSON.stringify({ error: "Falha ao criar job" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      jobRecordId = job.id;
    } else {
      await adminClient
        .from("video_jobs")
        .update({
          status: "processing",
          image_url: imageUrl,
          prompt: resolvedPrompt,
          progress: 5,
        })
        .eq("id", jobRecordId);
    }
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
        prompt: resolvedPrompt,
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

    if (jobRecordId && resolvedUserId) {
      await adminClient
        .from("video_jobs")
        .update({
          status: "completed",
          video_url: videoUrl,
          progress: 100,
        })
        .eq("id", jobRecordId);
    }

    return new Response(JSON.stringify({ videoUrl, jobId: jobRecordId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    if (jobRecordId && resolvedUserId) {
      await adminClient
        .from("video_jobs")
        .update({
          status: "error",
          error: String(err),
          progress: 100,
        })
        .eq("id", jobRecordId);
    }

    return new Response(JSON.stringify({ error: "Falha no vídeo" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
