import { supabase } from "@/integrations/supabase/client";
import { addSystemLog } from "@/lib/systemLog";

export type AiConteudoTipo = "roteiro" | "copy" | "descricao" | "legenda" | "narracao" | "seo" | "variacoes" | "calendario_30_dias";

type AiOptions = {
  modo?: string;
  timeoutMs?: number;
  contextoMestre?: Record<string, unknown>;
};

const withTimeout = async <T,>(promise: Promise<T>, ms: number, message: string) => {
  const timeout = new Promise<never>((_, reject) => {
    const id = setTimeout(() => {
      clearTimeout(id);
      reject(new Error(message));
    }, ms);
  });
  return Promise.race([promise, timeout]);
};

const buildFallback = (tipo: AiConteudoTipo, input: Record<string, unknown>, reason?: string) => {
  const produto = String(input.produto || input.nicho || "Seu produto");
  if (tipo === "roteiro") {
    return {
      roteiro: {
        hook: "Pare tudo e veja isso agora",
        abertura: `Em poucos segundos, você vai entender por que ${produto} está chamando atenção.`,
        desenvolvimento: `Mostre o benefício principal e como ${produto} resolve um problema real.`,
        prova: "Inclua um resultado ou depoimento curto.",
        cta: "Clique para saber mais.",
        roteiro_completo: "Hook forte, desenvolvimento direto e CTA claro.",
      },
      _fallback: true,
      _reason: reason || "Fallback aplicado",
    };
  }
  if (tipo === "copy") {
    return {
      headline: `${produto} em poucos passos`,
      subheadline: "Conteúdo otimizado para conversão com CTA direto.",
      cta: "Quero ver agora",
      _fallback: true,
      _reason: reason || "Fallback aplicado",
    };
  }
  if (tipo === "descricao") {
    return {
      descricao: `${produto} com promessa clara, linguagem objetiva e foco em resultado.`,
      _fallback: true,
      _reason: reason || "Fallback aplicado",
    };
  }
  if (tipo === "legenda") {
    return {
      legenda: `${produto} em destaque. Salve, compartilhe e clique no link.`,
      _fallback: true,
      _reason: reason || "Fallback aplicado",
    };
  }
  if (tipo === "narracao") {
    return {
      narracao: `Se você busca resultados com ${produto}, precisa ver isso agora.`,
      _fallback: true,
      _reason: reason || "Fallback aplicado",
    };
  }
  if (tipo === "seo") {
    return {
      seo: {
        titulos: [`${produto} em 3 passos`, `O que ninguém te contou sobre ${produto}`],
        hashtags: ["#viral", "#marketing", "#conteudo"],
        descricao_youtube: `${produto} com promessa clara e CTA direto.`,
        palavras_chave: [produto.toLowerCase(), "marketing", "conteudo"],
        tags_youtube: `${produto.toLowerCase()}, marketing, conteudo`,
        thumbnail_prompt: `Thumbnail com ${produto}, alto contraste e promessa clara.`,
        seo_score: 70,
      },
      _fallback: true,
      _reason: reason || "Fallback aplicado",
    };
  }
  if (tipo === "variacoes") {
    return {
      variacoes: ["Variação alternativa 1", "Variação alternativa 2", "Variação alternativa 3"],
      _fallback: true,
      _reason: reason || "Fallback aplicado",
    };
  }
  return {
    conteudos: [],
    _fallback: true,
    _reason: reason || "Fallback aplicado",
  };
};

export const gerarConteudoIA = async (
  tipo: AiConteudoTipo,
  input: Record<string, unknown>,
  options?: AiOptions,
) => {
  try {
    const { data, error } = await withTimeout(
      supabase.functions.invoke("generate-viral", {
        body: {
          ...input,
          tipo,
          modo: options?.modo,
          contextoMestre: options?.contextoMestre,
        },
      }),
      options?.timeoutMs ?? 5000,
      "Timeout IA",
    );
    if (error) throw error;
    if ((data as any)?.error) throw new Error((data as any).error);
    return { data, _fallback: false } as const;
  } catch (err: any) {
    addSystemLog({
      level: "warning",
      etapa: "IA",
      status: "fallback",
      motivo: err?.message || "Falha IA",
      meta: { tipo },
    });
    return { data: buildFallback(tipo, input, err?.message), _fallback: true } as const;
  }
};
