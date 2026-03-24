import { DarkFlowEngine, DarkFlowInput, DarkFlowOutput } from "./DarkFlowEngine";
import { createDarkFlowState } from "./DarkFlowState";

export const executarFluxoCompleto = (input: DarkFlowInput): DarkFlowOutput => {
  const state = createDarkFlowState();
  const engine = new DarkFlowEngine(state);
  return engine.iniciarFluxo(input);
};
