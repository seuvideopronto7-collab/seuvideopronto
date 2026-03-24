export type DarkFlowState = {
  etapa: "roteiro" | "produto" | "publicacao";
  progresso: number;
  dados: Record<string, unknown>;
  erros: string[];
};

export const createDarkFlowState = (): DarkFlowState => ({
  etapa: "roteiro",
  progresso: 0,
  dados: {},
  erros: []
});
