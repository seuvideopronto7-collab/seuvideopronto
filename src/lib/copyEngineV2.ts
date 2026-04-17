// Cliente do Copy Engine V2 — chama a edge function generate-script-v2 com fallback.
// Sempre retorna roteiro estruturado (HOOK→PROBLEMA→AGITAÇÃO→SOLUÇÃO→PROVA→CTA), nunca falha.

import { supabase } from "@/integrations/supabase/client";
import { gerarRoteiroFallback, roteiroToFullScript, type EstiloCopy, type RoteiroEstruturado } from "./copyTemplates";

export interface CopyV2Result {
  estilo: EstiloCopy;
  roteiro: RoteiroEstruturado;
  fallback_used: boolean;
  fullScript: string;
}

export interface CopyV2Input {
  produto: string;
  nicho: string;
  objetivo?: "vendas" | "autoridade" | "engajamento";
  estilo?: EstiloCopy;
  variacoes?: 1 | 2 | 3;
}

export async function gerarRoteiroV2(input: CopyV2Input): Promise<CopyV2Result[]> {
  try {
    const { data, error } = await supabase.functions.invoke("generate-script-v2", {
      body: {
        produto: input.produto,
        nicho: input.nicho,
        objetivo: input.objetivo || "vendas",
        estilo: input.estilo || "vsl_agressivo",
        variacoes: input.variacoes || 1,
      },
    });
    if (error) throw error;
    if (!data?.ok || !Array.isArray(data?.results)) throw new Error("Invalid response");
    return data.results as CopyV2Result[];
  } catch (e) {
    console.warn("[copyEngineV2] edge falhou, usando fallback estático:", e);
    const estilo = input.estilo || "vsl_agressivo";
    const roteiro = gerarRoteiroFallback(input.produto, input.nicho, estilo);
    return [
      {
        estilo,
        roteiro,
        fallback_used: true,
        fullScript: roteiroToFullScript(roteiro),
      },
    ];
  }
}
