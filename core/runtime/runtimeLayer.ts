import { executarFluxoCompleto } from "../darkflow/DarkFlowRunner";

type RuntimePayload = Record<string, unknown> | string | undefined;

export async function executarAcaoReal(nome: string, payload?: RuntimePayload) {
  console.log("Executando acao real:", nome);

  try {
    if (nome.startsWith("/")) {
      return navegarReal(nome);
    }

    if (nome === "navegar") {
      return navegarReal(payload as string | undefined);
    }

    if (["salvar", "salvar-distribuir", "salvar-material"].includes(nome)) {
      return salvarReal(payload as Record<string, unknown> | undefined);
    }

    if (["gerar", "ativar-maquina", "publicar-infoproduto"].includes(nome)) {
      return gerarReal(payload as Record<string, unknown> | undefined);
    }

    if (nome === "postar-agora") {
      return publicarReal(payload as Record<string, unknown> | undefined);
    }

    console.warn("Acao nao mapeada:", nome);
  } catch (err) {
    console.error("Erro na acao:", nome, err);
  }
}

function navegarReal(rota?: string) {
  if (!rota) return;
  window.location.href = rota;
}

function salvarReal(dados?: Record<string, unknown>) {
  if (!dados) return;
  localStorage.setItem("projeto_atual", JSON.stringify(dados));
  console.log("Salvo localmente");
}

function gerarReal(input?: Record<string, unknown>) {
  if (!input) return;
  return executarFluxoCompleto(input as never);
}

async function publicarReal(dados?: Record<string, unknown>) {
  if (!dados) return;
  console.log("Preparando publicacao...");

  const pacote = {
    titulo: dados.titulo,
    descricao: dados.descricao,
    video: dados.video,
    hashtags: dados.hashtags,
    links: dados.links
  };

  const fila = JSON.parse(localStorage.getItem("fila_post") || "[]");
  fila.push(pacote);
  localStorage.setItem("fila_post", JSON.stringify(fila));

  console.log("Conteudo salvo para publicacao futura");
}

export function inicializarRuntimeLayer() {
  document.addEventListener("click", (event) => {
    const target = (event.target as HTMLElement | null)?.closest("[data-action]") as
      | HTMLElement
      | null;
    if (!target) return;

    const acao = target.dataset.action;
    if (!acao) return;

    const payload = target.dataset.route || undefined;
    executarAcaoReal(acao, payload);
  });

  console.log("Runtime ativo ✔");
}
