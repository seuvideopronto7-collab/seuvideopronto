// Copy Engine V2 — gera roteiro estruturado HOOK→PROBLEMA→AGITAÇÃO→SOLUÇÃO→PROVA→CTA
// em 3 estilos (vsl_agressivo / storytelling / direct_response) usando Lovable AI Gateway.
// Fallback estático por nicho se a IA falhar (402/429/timeout).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

type Estilo = "vsl_agressivo" | "storytelling" | "direct_response";

// ---------- Fallback estático por nicho ----------
const NICHOS_FALLBACK: Record<string, { dor: string; desejo: string; prova: string }> = {
  pet: {
    dor: "Seu pet sofre com problemas que você nem percebe — e isso pode estar reduzindo a vida dele.",
    desejo: "Um pet saudável, ativo e feliz por anos a mais ao seu lado.",
    prova: "Mais de 12.000 tutores já transformaram a rotina dos seus pets.",
  },
  saude: {
    dor: "Cansaço, inchaço, baixa autoestima — você sente isso todo dia e ninguém te explica o porquê.",
    desejo: "Acordar com energia, se olhar no espelho e amar o que vê.",
    prova: "Mais de 10.327 pessoas relataram resultados em até 21 dias.",
  },
  financas: {
    dor: "Você trabalha o mês inteiro e o dinheiro some sem você entender pra onde foi.",
    desejo: "Liberdade pra decidir, viajar e parar de viver pelo boleto.",
    prova: "Milhares de brasileiros já saíram do vermelho usando esse método.",
  },
  beleza: {
    dor: "Aquela ruga, aquela mancha, aquele cabelo que não cresce — e nenhum produto resolve.",
    desejo: "Pele firme, cabelo brilhante, autoestima lá em cima.",
    prova: "Aprovado por mais de 8.493 mulheres em todo o Brasil.",
  },
  fitness: {
    dor: "Você treina, faz dieta, e mesmo assim a barriga não some.",
    desejo: "Corpo definido, roupa caindo bem, sem precisar passar fome.",
    prova: "Mais de 15.000 pessoas conquistaram resultados visíveis em 30 dias.",
  },
  default: {
    dor: "Você já tentou de tudo e nada funcionou de verdade.",
    desejo: "Um resultado real, rápido e definitivo.",
    prova: "Milhares de pessoas já transformaram suas vidas com esse método.",
  },
};

const getNichoData = (n: string) => {
  const k = (n || "").toLowerCase();
  if (k.includes("pet") || k.includes("cachorro") || k.includes("gato")) return NICHOS_FALLBACK.pet;
  if (k.includes("saude") || k.includes("saúde") || k.includes("emagre")) return NICHOS_FALLBACK.saude;
  if (k.includes("finan") || k.includes("dinheiro") || k.includes("renda")) return NICHOS_FALLBACK.financas;
  if (k.includes("beleza") || k.includes("pele") || k.includes("cabelo")) return NICHOS_FALLBACK.beleza;
  if (k.includes("fit") || k.includes("treino") || k.includes("musculo")) return NICHOS_FALLBACK.fitness;
  return NICHOS_FALLBACK.default;
};

const fallbackEstatico = (produto: string, nicho: string, estilo: Estilo) => {
  const n = getNichoData(nicho);
  const base = {
    hook: `⚠️ Pare tudo. Se você usa ${produto}, precisa ouvir isso AGORA.`,
    problema: n.dor,
    agitacao: `E o pior: quanto mais tempo você ignora, mais difícil fica reverter. Cada dia perdido é uma chance que escapa.`,
    solucao: `Foi por isso que ${produto} foi criado — para resolver exatamente esse problema, sem complicação.`,
    prova: n.prova,
    cta: `👉 Clique no link agora e garanta o seu — últimas unidades com 50% OFF.`,
  };
  if (estilo === "storytelling") {
    base.hook = `Eu também já passei por isso. E foi quando descobri ${produto}...`;
    base.cta = `Hoje quero compartilhar isso com você. Toque no link e mude sua história também.`;
  } else if (estilo === "direct_response") {
    base.hook = `${produto}: o que ninguém te contou.`;
    base.cta = `Garanta o seu agora. Clique no botão abaixo.`;
  }
  return base;
};

// ---------- Lovable AI ----------
async function callLovableAI(produto: string, nicho: string, estilo: Estilo, objetivo: string) {
  const KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!KEY) throw new Error("LOVABLE_API_KEY missing");

  const systemPrompt = `Você é um copywriter de anúncios de alta conversão (Meta/TikTok Ads).
Gere um roteiro de vídeo curto (15-30s) em pt-BR seguindo rigorosamente a estrutura:
HOOK → PROBLEMA → AGITAÇÃO → SOLUÇÃO → PROVA → CTA.

Estilo solicitado: "${estilo}".
- vsl_agressivo: linguagem direta, dor amplificada, urgência forte, CTA imperativo.
- storytelling: narrativa em 1ª pessoa, vulnerabilidade, jornada do herói.
- direct_response: claro, objetivo, sem firulas, foco no benefício.

Cada bloco deve ter NO MÁXIMO 2 frases curtas. Use emoji só no HOOK e CTA.`;

  const userPrompt = `Produto: ${produto}
Nicho: ${nicho}
Objetivo: ${objetivo}

Gere o roteiro estruturado.`;

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 20_000);

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      signal: ctrl.signal,
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "deliver_script",
              description: "Entrega o roteiro estruturado",
              parameters: {
                type: "object",
                properties: {
                  hook: { type: "string" },
                  problema: { type: "string" },
                  agitacao: { type: "string" },
                  solucao: { type: "string" },
                  prova: { type: "string" },
                  cta: { type: "string" },
                },
                required: ["hook", "problema", "agitacao", "solucao", "prova", "cta"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "deliver_script" } },
      }),
    });

    clearTimeout(timeout);

    if (res.status === 429) throw new Error("RATE_LIMIT");
    if (res.status === 402) throw new Error("PAYMENT_REQUIRED");
    if (!res.ok) throw new Error(`AI_HTTP_${res.status}`);

    const data = await res.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("NO_TOOL_CALL");
    const args = JSON.parse(toolCall.function.arguments);
    return args;
  } finally {
    clearTimeout(timeout);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const produto = String(body?.produto || body?.product || "").trim();
    const nicho = String(body?.nicho || body?.niche || "").trim();
    const objetivo = String(body?.objetivo || body?.objective || "vendas").trim();
    const estilo = (String(body?.estilo || body?.style || "vsl_agressivo") as Estilo);
    const variacoes = Math.max(1, Math.min(3, Number(body?.variacoes) || 1));

    if (!produto) return json({ error: "produto requerido" }, 400);

    const estilos: Estilo[] =
      variacoes === 3
        ? ["vsl_agressivo", "storytelling", "direct_response"]
        : variacoes === 2
          ? [estilo, estilo === "vsl_agressivo" ? "storytelling" : "vsl_agressivo"]
          : [estilo];

    const results: Array<{ estilo: Estilo; roteiro: any; fallback_used: boolean; fullScript: string }> = [];

    for (const e of estilos) {
      let roteiro: any;
      let fallback_used = false;
      try {
        roteiro = await callLovableAI(produto, nicho, e, objetivo);
      } catch (err) {
        console.error("[generate-script-v2] AI failed, using fallback:", err);
        roteiro = fallbackEstatico(produto, nicho, e);
        fallback_used = true;
      }
      const fullScript = [
        roteiro.hook,
        roteiro.problema,
        roteiro.agitacao,
        roteiro.solucao,
        roteiro.prova,
        roteiro.cta,
      ].join(" ");
      results.push({ estilo: e, roteiro, fallback_used, fullScript });
    }

    return json({ ok: true, produto, nicho, objetivo, results });
  } catch (e) {
    console.error("[generate-script-v2] error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
