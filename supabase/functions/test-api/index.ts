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
    const url = new URL(req.url);
    const platform = (url.searchParams.get("platform") || "").trim();
    console.log("Test API ping", { platform, method: req.method });

    return new Response(
      JSON.stringify({ success: true, status: "conectado", platform: platform || "all" }),
      {
        status: 200,
        headers,
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 200,
        headers,
      },
    );
  }
});
