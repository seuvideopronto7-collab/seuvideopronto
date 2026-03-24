import { navegar } from "../navigation/navigationService";

const executarPublicacao = () => {
  console.log("Publicando conteudo...");
};

const salvarDistribuir = () => {
  console.log("Salvo e distribuido");
};

const executarFluxoCompleto = () => {
  console.log("Executando fluxo completo...");
};

const abrirProjeto = (id?: string) => {
  console.log("Abrindo projeto", id);
};

export const actionRegistry: Record<string, (...args: any[]) => void> = {
  "/auth": () => navegar("/auth"),
  "/perfil": () => navegar("/perfil"),
  "/admin": () => navegar("/admin"),
  "/infoproduto": () => navegar("/infoproduto"),
  "/produtos-prontos": () => navegar("/produtos-prontos"),
  "/planos": () => navegar("/planos"),
  "/apis": () => navegar("/apis"),
  "postar-agora": () => executarPublicacao(),
  "salvar-distribuir": () => salvarDistribuir(),
  "gerar-infoproduto": () => executarFluxoCompleto(),
  "abrir-projeto": (id?: string) => abrirProjeto(id)
};

export const executarAcao = (nome: string, ...args: any[]) => {
  const action = actionRegistry[nome];
  if (!action) {
    console.warn("Acao nao encontrada:", nome);
    alert("Essa funcao ainda nao esta ativa.");
    return;
  }
  action(...args);
};
