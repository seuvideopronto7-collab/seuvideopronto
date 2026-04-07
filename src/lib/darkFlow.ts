export type DarkFlowFormData = {
  produto: string;
  nicho: string;
  objetivo: string;
  marca: string;
  publico: string;
  plataforma: string;
  checkout: string;
  landing: string;
};

export interface DarkFlowResult {
  hook?: string;
  contexto?: string;
  tese?: string;
  lista?: string[];
  solucao?: string;
  cta?: string;
  titulo?: string;
  legenda?: string;
  hashtags?: string[];
  roteiro?: string;
  texto_falado?: string;
  vozes?: string;
  cenas?: string[] | Array<{ tempo?: string; texto?: string; visual?: string; emocao?: string; prompt_imagem?: string }>;
  design?: {
    fundo?: string;
    texto?: string;
    destaque?: string;
    check?: string;
    tipografia?: string;
    efeitos?: string[];
  };
  imagem?: {
    prompt?: string;
    elementos?: string[];
    formato?: string;
  };
  video?: {
    narracao?: string;
    texto_animado?: string[];
    fundo_dinamico?: string;
    musica?: string;
    formatos?: string[];
  };
  voz?: {
    estilo?: string;
    tom?: string;
    ritmo?: string;
    naturalidade?: string;
  };
  avatar?: {
    opcional?: boolean;
    servicos?: string[];
    persona?: string;
  };
  links?: {
    checkout?: string;
    landing?: string;
  };
  niches?: {
    nichos_quentes?: string[];
    temas_sugeridos?: string[];
  };
  assets?: {
    copies?: string[];
    scripts?: string[];
    imagens?: string[];
    videos?: string[];
  };
  _fallback?: boolean;
  _partial?: boolean;
  _reason?: string;
}

type DarkFlowInvokeResponse = {
  data?: unknown;
  error?: { message?: string } | null;
};

type DarkFlowGeneratorOptions = {
  invoke: (payload: Record<string, unknown>) => Promise<DarkFlowInvokeResponse>;
  timeoutMs?: number;
  logger?: Pick<Console, "log" | "warn" | "error">;
};

type DarkFlowGenerationOutcome = {
  result: DarkFlowResult;
  usedFallback: boolean;
  partial: boolean;
  missingFields: string[];
  error?: Error;
};

const REQUIRED_FIELDS = ["hook", "contexto", "tese", "solucao", "cta", "roteiro", "vozes", "cenas"] as const;

const hasText = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;

const firstText = (...values: Array<unknown>) => {
  for (const value of values) {
    if (hasText(value)) return value.trim();
  }
  return "";
};

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
};

const getPlatformLabel = (platform?: string) => {
  if (!platform) return "redes sociais";
  if (platform === "tiktok") return "TikTok";
  if (platform === "instagram") return "Instagram";
  if (platform === "youtube") return "YouTube Shorts";
  return platform;
};

export const buildDarkFlowContext = (form: Partial<DarkFlowFormData>) => {
  const tema = firstText(
    form.nicho,
    form.produto,
    form.marca,
    form.objetivo ? `${form.objetivo} para ${getPlatformLabel(form.plataforma)}` : "",
    "conteúdo dark",
  );

  return {
    tema,
    publico: firstText(form.publico, "público digital"),
    problema: "",
    objetivo: firstText(form.objetivo, "vendas"),
    linguagem: "pt-BR",
    tom: "especialista",
  };
};

export const buildFallbackDarkFlow = (payload: Partial<DarkFlowFormData>): DarkFlowResult => {
  const contexto = buildDarkFlowContext(payload);
  const temaBase = contexto.tema;
  const publicoBase = contexto.publico;
  const objetivoBase = contexto.objetivo;
  const marcaBase = firstText(payload.marca, "sua marca");
  const cleanHashtag = (value: string) => `#${value.replace(/[^a-z0-9]/gi, "")}`.toLowerCase();

  return {
    hook: `Você está perdendo ${objetivoBase} em ${temaBase} por um erro simples.`,
    contexto: `Estratégia direta para ${publicoBase} com foco em ${objetivoBase}.`,
    tese: `${temaBase} exige gancho forte, promessa clara e CTA imediato para converter.`,
    lista: [
      "Você comunica o benefício errado",
      "Seu gancho não cria urgência",
      "Seu CTA não deixa claro o próximo passo",
    ],
    solucao: `Reposicione a oferta de ${marcaBase} com uma copy mais específica e uma promessa acionável.`,
    cta: "LINK NA BIO",
    legenda: `Se ${temaBase} é prioridade, ajuste sua mensagem hoje.`,
    hashtags: [cleanHashtag(temaBase), "#darkflow", "#marketing", "#vendas", "#conteudoviral"],
    roteiro: `Hook: você está perdendo ${objetivoBase}. Contexto: o problema está na mensagem. Solução: ajuste promessa, prova e CTA. Fechamento: ${marcaBase} é o próximo passo.`,
    texto_falado: `Se você quer ${objetivoBase}, pare de publicar sem estratégia em ${temaBase}. Ajuste seu gancho, mostre a prova e chame para ação agora.`,
    vozes: "Masculina brasileira, confiante, ritmo médio, natural.",
    cenas: [
      `Abrir com alerta visual sobre ${temaBase}`,
      `Mostrar o erro principal que trava ${objetivoBase}`,
      `Apresentar a solução aplicada à oferta de ${marcaBase}`,
      "Fechar com CTA forte e destaque visual do próximo passo",
    ],
    design: {
      fundo: "#000000",
      texto: "#FFFFFF",
      destaque: "#FF0000",
      check: "#00FF7F",
      tipografia: "BOLD, CAIXA ALTA, ALTA LEGIBILIDADE",
      efeitos: ["glow vermelho leve", "sombra leve", "centralizado"],
    },
    imagem: {
      prompt: `Imagem dark com contraste alto sobre ${temaBase}, chamada central forte e destaque vermelho.`,
      elementos: ["texto central", "destaque vermelho", "check verde"],
      formato: "9:16",
    },
    video: {
      narracao: `Narracao direta para ${publicoBase}, com promessa clara, prova e CTA para ${marcaBase}.`,
      texto_animado: ["ERRO", "PROMESSA", "CTA"],
      fundo_dinamico: "texturas dark + motion blur",
      musica: "leve e tensa",
      formatos: ["9:16", "1:1"],
    },
    voz: {
      estilo: "Masculina brasileira",
      tom: "confiante",
      ritmo: "medio",
      naturalidade: "natural",
    },
    avatar: {
      opcional: true,
      servicos: ["HeyGen", "Runway ML"],
      persona: "Homem 30-40 anos, aparencia profissional, comunicacao direta",
    },
    links: {
      checkout: payload.checkout || "",
      landing: payload.landing || "",
    },
    assets: {
      copies: ["hook + contexto + tese + solucao + cta"],
      scripts: ["roteiro completo"],
      imagens: ["prompt de imagem"],
      videos: ["spec de video"],
    },
    _fallback: true,
  };
};

export const cleanAndParseDarkFlowResponse = (raw: unknown) => {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }

  if (!hasText(raw)) {
    throw new Error("Resposta IA vazia ou inválida");
  }

  const withoutFences = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const start = withoutFences.search(/[\[{]/);

  if (start === -1) {
    throw new Error("Nenhum JSON encontrado na resposta da IA");
  }

  const openChar = withoutFences[start];
  const closeChar = openChar === "[" ? "]" : "}";
  const end = withoutFences.lastIndexOf(closeChar);

  if (end === -1 || end <= start) {
    throw new Error("JSON incompleto na resposta da IA");
  }

  const candidate = withoutFences.slice(start, end + 1);

  try {
    return JSON.parse(candidate) as Record<string, unknown>;
  } catch (error) {
    const repaired = candidate
      .replace(/,\s*([}\]])/g, "$1")
      .replace(/[\x00-\x1F\x7F]/g, "");

    return JSON.parse(repaired) as Record<string, unknown>;
  }
};

export const normalizeDarkFlowResult = (raw: unknown, form: Partial<DarkFlowFormData>): DarkFlowResult => {
  const parsed = cleanAndParseDarkFlowResponse(raw);
  const fallback = buildFallbackDarkFlow(form);
  const typed = parsed as DarkFlowResult;

  const lista = toStringArray(typed.lista);
  const hashtags = toStringArray(typed.hashtags);
  const cenas = toStringArray(typed.cenas);
  const animacoes = toStringArray(typed.video?.texto_animado);
  const roteiro = firstText(typed.roteiro, typed.texto_falado, typed.video?.narracao, fallback.roteiro);
  const vozes = firstText(
    typed.vozes,
    [typed.voz?.estilo, typed.voz?.tom, typed.voz?.ritmo, typed.voz?.naturalidade].filter(Boolean).join(", "),
    fallback.vozes,
  );

  return {
    ...fallback,
    ...typed,
    hook: firstText(typed.hook, fallback.hook),
    contexto: firstText(typed.contexto, fallback.contexto),
    tese: firstText(typed.tese, typed.contexto, fallback.tese),
    lista: lista.length ? lista : fallback.lista,
    solucao: firstText(typed.solucao, fallback.solucao),
    cta: firstText(typed.cta, fallback.cta),
    legenda: firstText(typed.legenda, typed.contexto, fallback.legenda),
    hashtags: hashtags.length ? hashtags : fallback.hashtags,
    roteiro,
    texto_falado: firstText(typed.texto_falado, roteiro, fallback.texto_falado),
    vozes,
    cenas: cenas.length
      ? cenas
      : animacoes.length
        ? animacoes.map((item) => `Cena com texto animado: ${item}`)
        : fallback.cenas,
    design: {
      ...fallback.design,
      ...typed.design,
    },
    imagem: {
      ...fallback.imagem,
      ...typed.imagem,
    },
    video: {
      ...fallback.video,
      ...typed.video,
      narracao: firstText(typed.video?.narracao, roteiro, fallback.video?.narracao),
      texto_animado: animacoes.length ? animacoes : fallback.video?.texto_animado,
    },
    voz: {
      ...fallback.voz,
      ...typed.voz,
    },
    avatar: {
      ...fallback.avatar,
      ...typed.avatar,
    },
    links: {
      ...fallback.links,
      ...typed.links,
    },
    assets: {
      ...fallback.assets,
      ...typed.assets,
    },
  };
};

export const getMissingDarkFlowFields = (result: DarkFlowResult) =>
  REQUIRED_FIELDS.filter((field) => {
    if (field === "cenas") return !Array.isArray(result.cenas) || result.cenas.length === 0;
    return !hasText(result[field]);
  });

const getMissingDarkFlowFieldsFromRaw = (result: Record<string, unknown>) => {
  const roteiro = firstText(result.roteiro, result.texto_falado, (result.video as { narracao?: string } | undefined)?.narracao);
  const vozes = firstText(
    result.vozes,
    [
      (result.voz as { estilo?: string } | undefined)?.estilo,
      (result.voz as { tom?: string } | undefined)?.tom,
      (result.voz as { ritmo?: string } | undefined)?.ritmo,
      (result.voz as { naturalidade?: string } | undefined)?.naturalidade,
    ]
      .filter(Boolean)
      .join(", "),
  );

  return REQUIRED_FIELDS.filter((field) => {
    if (field === "roteiro") return !hasText(roteiro);
    if (field === "vozes") return !hasText(vozes);
    if (field === "cenas") return !toStringArray(result.cenas).length;
    return !hasText(result[field]);
  });
};

export const hasRenderableDarkFlowContent = (result: DarkFlowResult) =>
  Boolean(result.hook || result.contexto || result.solucao || result.roteiro || result.lista?.length);

const withTimeout = async <T,>(fn: () => Promise<T>, ms: number) => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("Timeout IA")), ms);
  });

  try {
    return await Promise.race([fn(), timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

export const createDarkFlowGenerator = ({
  invoke,
  timeoutMs = 5000,
  logger = console,
}: DarkFlowGeneratorOptions) => {
  return async (form: DarkFlowFormData): Promise<DarkFlowGenerationOutcome> => {
    const payload = {
      ...form,
      tipo: "dark_flow_engine",
      contextoMestre: buildDarkFlowContext(form),
    };

    let lastError: Error | undefined;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const { data, error } = await withTimeout(() => invoke(payload), timeoutMs);

        if (error) {
          throw new Error(error.message || "Falha ao invocar a engine dark");
        }

        logger.log("Resposta IA:", data);

        if (data == null) {
          throw new Error("Resposta vazia ao gerar conteúdo dark");
        }

        const rawParsed = cleanAndParseDarkFlowResponse(data) as Record<string, unknown>;
        const missingFieldsBeforeNormalization = getMissingDarkFlowFieldsFromRaw(rawParsed);
        const parsed = normalizeDarkFlowResult(rawParsed, form);
        logger.log("Resposta parseada:", parsed);

        if ((parsed as { error?: string; success?: boolean }).error || (parsed as { success?: boolean }).success === false) {
          throw new Error((parsed as { error?: string }).error || "Falha na engine");
        }

        if (!hasRenderableDarkFlowContent(parsed)) {
          throw new Error("Resposta sem conteúdo renderizável");
        }

        const missingFields = getMissingDarkFlowFields(parsed);
        if (missingFieldsBeforeNormalization.length && attempt === 0) {
          logger.warn("Resposta IA incompleta, tentando novamente:", missingFieldsBeforeNormalization);
          lastError = new Error(`Campos ausentes: ${missingFieldsBeforeNormalization.join(", ")}`);
          continue;
        }

        return {
          result: { ...parsed, _partial: missingFields.length > 0 },
          usedFallback: false,
          partial: missingFields.length > 0,
          missingFields,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("Falha desconhecida na engine dark");
        logger.error(`Erro real tentativa ${attempt + 1}:`, error);
      }
    }

    const fallback = buildFallbackDarkFlow(form);
    logger.warn("IA indisponível — gerando versão alternativa");

    return {
      result: fallback,
      usedFallback: true,
      partial: false,
      missingFields: [],
      error: lastError,
    };
  };
};