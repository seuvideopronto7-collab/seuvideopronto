import { DarkFlowState } from "./DarkFlowState";

export type DarkFlowInput = {
  nicho?: string;
  objetivo?: string;
  marca?: string;
  publico?: string;
  plataforma?: string;
  forcarFallbackSeo?: boolean;
};

export type DarkFlowOutput = {
  roteiro: string[];
  variacoes: {
    titulos: string[];
    descricoes: string[];
    hashtags: string[];
  };
  produto: {
    nome: string;
    oferta: string;
    promessa: string;
    vsl: string[];
  };
  seo: {
    palavrasChave: string[];
    titulo: string;
    descricao: string;
    status: "ok" | "fallback";
  };
};

export class DarkFlowEngine {
  state: DarkFlowState;

  constructor(state: DarkFlowState) {
    this.state = state;
  }

  iniciarFluxo(input: DarkFlowInput): DarkFlowOutput {
    this.state.etapa = "roteiro";
    this.state.progresso = 10;

    const roteiro = this.gerarRoteiro(input);
    const variacoes = this.gerarVariacoes(input);
    const produto = this.gerarProduto(input);
    const seo = this.gerarSeo(input, roteiro);

    this.state.etapa = "publicacao";
    this.state.progresso = 100;
    this.state.dados = { roteiro, variacoes, produto, seo };

    return { roteiro, variacoes, produto, seo };
  }

  gerarRoteiro(input: DarkFlowInput): string[] {
    const nicho = input.nicho || "conteudo";
    return [
      `Hook viral para ${nicho}`,
      "Storytelling com prova",
      "CTA direto para a oferta"
    ];
  }

  gerarVariacoes(input: DarkFlowInput): DarkFlowOutput["variacoes"] {
    const nicho = input.nicho || "seu nicho";
    return {
      titulos: Array.from({ length: 5 }, (_, i) => `Titulo ${i + 1} - ${nicho}`),
      descricoes: Array.from({ length: 5 }, (_, i) => `Descricao ${i + 1} sobre ${nicho}.`),
      hashtags: [
        `#${nicho.replace(/\s+/g, "")}`,
        "#fature",
        "#conteudo",
        "#viral",
        "#marketing"
      ]
    };
  }

  gerarProduto(input: DarkFlowInput): DarkFlowOutput["produto"] {
    const base = input.marca || "Produto";
    return {
      nome: `${base} - Metodo Turbo`,
      oferta: "Acesso imediato + bonus exclusivos",
      promessa: "Resultado perceptivel em 21 dias",
      vsl: ["Promessa", "Prova", "Oferta", "Garantia"]
    };
  }

  gerarSeo(input: DarkFlowInput, roteiro: string[]): DarkFlowOutput["seo"] {
    const nicho = input.nicho || "conteudo";
    if (input.forcarFallbackSeo) {
      return {
        palavrasChave: [nicho, "conteudo", "viral"],
        titulo: `Guia rapido de ${nicho}`,
        descricao: roteiro.join(" "),
        status: "fallback"
      };
    }
    return {
      palavrasChave: [nicho, "SEO", "ganhos"],
      titulo: `Como dominar ${nicho} com IA`,
      descricao: `Resumo estrategico para ${nicho}.`,
      status: "ok"
    };
  }
}
