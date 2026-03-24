import type { InternalApiModel } from "./apiLearning";

export type FlowStep = {
  etapa: string;
  campos: string[];
  objetivo: string;
};

export type FlowBlueprint = {
  steps: FlowStep[];
  ctas: string[];
  sugestoesVsl: string[];
};

const extractFields = (bucket: Record<string, { name: string }[]>) => {
  const fields = new Set<string>();
  Object.values(bucket).forEach((group) => {
    group.forEach((field) => fields.add(field.name));
  });
  return Array.from(fields);
};

export const buildFlowBlueprint = (model: InternalApiModel): FlowBlueprint => {
  const produtoFields = extractFields(model.produto);
  const checkoutFields = extractFields(model.checkout);
  const paginaFields = extractFields(model.pagina_venda);
  const afiliacaoFields = extractFields(model.afiliacao);

  return {
    steps: [
      {
        etapa: "Produto",
        campos: produtoFields,
        objetivo: "Estruturar os dados essenciais do produto.",
      },
      {
        etapa: "Pagina de venda",
        campos: paginaFields,
        objetivo: "Montar a estrutura de pagina de vendas e copy.",
      },
      {
        etapa: "Checkout",
        campos: checkoutFields,
        objetivo: "Garantir campos obrigatorios e regras de pagamento.",
      },
      {
        etapa: "Afiliacao",
        campos: afiliacaoFields,
        objetivo: "Configurar regras e beneficios de afiliacao.",
      },
    ],
    ctas: ["Publicar produto", "Enviar para aprovacao", "Gerar campanha"],
    sugestoesVsl: [
      "Gancho inicial de 5 segundos",
      "Problema e promessa em 30 segundos",
      "Prova e beneficios em 60 segundos",
      "Oferta e chamada para acao",
    ],
  };
};
