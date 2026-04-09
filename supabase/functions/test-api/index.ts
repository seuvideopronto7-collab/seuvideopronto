import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const headers = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    const apis = {
      elevenlabs: !!Deno.env.get("ELEVENLABS_API_KEY"),
      runway: !!Deno.env.get("RUNWAY_API_KEY"),
      shotstack: !!Deno.env.get("SHOTSTACK_API_KEY"),
    };

    return new Response(
      JSON.stringify({ success: true, apis }),
      { status: 200, headers },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 200, headers },
    );
  }
});
