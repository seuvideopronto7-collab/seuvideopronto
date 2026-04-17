// Fallback de trilha sonora — quando a API de música falha (402/429/timeout),
// retorna uma URL de trilha local pré-gravada por objetivo.
// As trilhas vivem em /public/audio/ — se o arquivo não existir, retorna null
// e o consumidor decide se renderiza sem música (após avisar o usuário).

export type ObjetivoTrilha = "vendas" | "autoridade" | "viral";

const TRILHAS_LOCAIS: Record<ObjetivoTrilha, string> = {
  vendas: "/audio/trilha-vendas.mp3",
  autoridade: "/audio/trilha-autoridade.mp3",
  viral: "/audio/trilha-viral.mp3",
};

/**
 * Retorna a URL de trilha local para o objetivo informado.
 * Usuário deve garantir que esses arquivos existam em /public/audio/
 * (ou substituir pelo seu próprio acervo).
 */
export function getTrilhaLocal(objetivo: ObjetivoTrilha = "vendas"): string {
  return TRILHAS_LOCAIS[objetivo] || TRILHAS_LOCAIS.vendas;
}

/**
 * Verifica se a trilha local está acessível antes de tentar usá-la.
 * Útil pra evitar 404 no render.
 */
export async function trilhaLocalDisponivel(objetivo: ObjetivoTrilha = "vendas"): Promise<boolean> {
  try {
    const res = await fetch(getTrilhaLocal(objetivo), { method: "HEAD" });
    return res.ok;
  } catch {
    return false;
  }
}
