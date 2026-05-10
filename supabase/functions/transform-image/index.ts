import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // ─── MANDATORY AUTH ───────────────────────────────────────
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const body = await req.json();
    const {
      imageBase64,
      transformationType,
      style,
      format,
      objective,
      niche,
      audience,
      tone,
      withText,
      headline,
      subtitle,
      cta,
    } = body;

    if (!imageBase64 || !transformationType) {
      return new Response(JSON.stringify({ error: "imageBase64 and transformationType are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const formatMap: Record<string, string> = {
      "1080x1350": "portrait 4:5 ratio (1080x1350)",
      "1080x1080": "square 1:1 ratio (1080x1080)",
      "1080x1920": "vertical 9:16 ratio (1080x1920)",
      "1920x1080": "horizontal 16:9 ratio (1920x1080)",
    };

    const formatDesc = formatMap[format] || "square 1:1";

    let prompt = "";

    if (transformationType === "produto") {
      prompt = `Transform this product photo into a highly commercial, premium product image for advertising.
Style: ${style || "luxury e-commerce"}.
Format: ${formatDesc}.
Objective: ${objective || "sales conversion"}.
Niche: ${niche || "general"}.
Target audience: ${audience || "online shoppers"}.
Create a professional studio-quality composition with premium lighting, clean background, and desire-inducing visual composition.
The product must be the hero element, perfectly lit with soft shadows and professional color grading.`;
    } else if (transformationType === "autoridade") {
      prompt = `Transform this portrait photo into a cinematic authority portrait.
Style: ${style || "executive premium"}.
Format: ${formatDesc}.
Create a high-end professional headshot with cinematic lighting, shallow depth of field, and executive authority feel.
The person must look confident, trustworthy, and premium. Use professional color grading with warm tones.`;
    } else if (transformationType === "social") {
      prompt = `Transform this photo into a premium social media lifestyle image.
Style: ${style || "instagramável premium"}.
Format: ${formatDesc}.
Create a social-media-ready image that feels aspirational, lifestyle-oriented, and highly engaging.
Use trendy color grading, natural lighting feel, and modern composition.`;
    } else if (transformationType === "campanha") {
      prompt = `Transform this image into a premium advertising campaign creative.
Style: ${style || "launch campaign"}.
Format: ${formatDesc}.
Objective: ${objective || "brand awareness"}.
Create a high-impact advertising visual with bold composition, premium feel, and conversion-focused design.`;
    } else {
      prompt = `Transform this image into a premium commercial visual. Style: ${style || "premium"}. Format: ${formatDesc}.`;
    }

    if (withText && (headline || subtitle || cta)) {
      prompt += `\n\nIMPORTANT: Add text overlay on the image:`;
      if (headline) prompt += `\nHeadline: "${headline}" - large, bold, high contrast.`;
      if (subtitle) prompt += `\nSubtitle: "${subtitle}" - smaller, complementary.`;
      if (cta) prompt += `\nCTA button/text: "${cta}" - prominent, action-oriented.`;
      prompt += `\nText must be legible, well-positioned, and professionally designed.`;
    }

    prompt += `\nTone: ${tone || "professional and premium"}.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: { url: imageBase64.startsWith("data:") ? imageBase64 : `data:image/png;base64,${imageBase64}` },
              },
            ],
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted. Add funds in Settings > Workspace > Usage." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI generation failed");
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    const description = data.choices?.[0]?.message?.content || "";

    if (!imageUrl) {
      throw new Error("No image generated");
    }

    return new Response(JSON.stringify({ imageUrl, description }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("transform-image error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
