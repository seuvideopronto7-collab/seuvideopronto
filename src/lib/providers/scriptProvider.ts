import type { Provider, ScriptInput, ScriptOutput, ProviderResult } from "./types";

const EMOTION_FLOW = ["curiosidade", "tensão", "solução", "urgência"];

const buildScriptFromTemplate = (input: ScriptInput): ScriptOutput => {
  const { title, niche, audience, objective, cta, copyBase, mode } = input;
  const base = copyBase || title;

  const modeTemplates: Record<string, { hook: string; problema: string; amplificacao: string; solucao: string; prova: string; ctaText: string }> = {
    comercial: {
      hook: `Você ainda não conhece ${base}? Isso pode mudar tudo.`,
      problema: `Se você é ${audience} e atua com ${niche}, sabe como é difícil se destacar.`,
      amplificacao: `A maioria tenta de tudo e continua invisível. Perde tempo, dinheiro e energia.`,
      solucao: `${base} resolve isso de forma direta — com resultado comprovado.`,
      prova: `Milhares já usam e o retorno fala por si.`,
      ctaText: cta || `Clique agora e comece hoje.`,
    },
    autoridade: {
      hook: `O que os melhores de ${niche} fazem diferente?`,
      problema: `${audience} precisa de resultados — não de mais conteúdo genérico.`,
      amplificacao: `Enquanto outros copiam tendências, os líderes constroem autoridade real.`,
      solucao: `${base} é o caminho que os top 1% seguem.`,
      prova: `Veja os resultados de quem já aplica.`,
      ctaText: cta || `Siga para aprender mais.`,
    },
    viral: {
      hook: `PARA TUDO! 🚨 Você precisa ver isso sobre ${niche}.`,
      problema: `Todo mundo fala, ninguém mostra na prática.`,
      amplificacao: `Se você não agir agora, vai continuar no mesmo lugar.`,
      solucao: `${base} é a prova de que funciona.`,
      prova: `Os números não mentem.`,
      ctaText: cta || `Compartilhe com quem precisa ver isso.`,
    },
    dark: {
      hook: `Eles não querem que ${audience} saiba disso sobre ${niche}...`,
      problema: `O sistema foi feito para te manter preso no ciclo.`,
      amplificacao: `Enquanto você duvida, outros estão lucrando calados.`,
      solucao: `${base} é a brecha que poucos encontraram.`,
      prova: `Os resultados estão aí para quem quer ver.`,
      ctaText: cta || `Toque no link antes que derrubem.`,
    },
  };

  const tpl = modeTemplates[mode] || modeTemplates.comercial;
  const fullScript = [tpl.hook, tpl.problema, tpl.amplificacao, tpl.solucao, tpl.prova, tpl.ctaText].join(" ");

  const parts = [tpl.hook, tpl.problema, tpl.amplificacao, tpl.solucao, tpl.prova, tpl.ctaText];
  const sceneDuration = Math.max(3, Math.floor(parseInt(input.duration) / parts.length) || 5);

  const scenes = parts.map((texto, i) => ({
    texto,
    visual: `Cena ${i + 1}: ${niche}, ${EMOTION_FLOW[Math.min(i, EMOTION_FLOW.length - 1)]}, cinematic dark premium`,
    emocao: EMOTION_FLOW[Math.min(i, EMOTION_FLOW.length - 1)],
    duracao: `${sceneDuration}s`,
  }));

  return {
    hook: tpl.hook,
    problema: tpl.problema,
    amplificacao: tpl.amplificacao,
    solucao: tpl.solucao,
    prova: tpl.prova,
    cta: tpl.ctaText,
    fullScript,
    scenes,
  };
};

export const internalScriptProvider: Provider<ScriptInput, ScriptOutput> = {
  name: "internal",
  async generate(input): Promise<ProviderResult<ScriptOutput>> {
    try {
      const result = buildScriptFromTemplate(input);
      return { ok: true, data: result, provider: "internal" };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Erro ao gerar roteiro", provider: "internal" };
    }
  },
};
