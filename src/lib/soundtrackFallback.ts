// Trilhas online (CDN Pixabay) — sem MP3 local. Sempre disponíveis.
// Mapa por OBJETIVO e por NICHO comum.

export type ObjetivoTrilha = "vendas" | "autoridade" | "viral";

const TRILHAS_CDN: Record<ObjetivoTrilha, string> = {
  vendas: "https://cdn.pixabay.com/download/audio/2022/03/15/audio_115b9b6c4c.mp3",
  autoridade: "https://cdn.pixabay.com/download/audio/2022/10/25/audio_946f5e7c6e.mp3",
  viral: "https://cdn.pixabay.com/download/audio/2023/03/20/audio_5f1b64fcb7.mp3",
};

const TRILHAS_BY_NICHO: Record<string, string> = {
  saude: TRILHAS_CDN.autoridade,
  pet: TRILHAS_CDN.viral,
  emagrecimento: TRILHAS_CDN.vendas,
  beleza: TRILHAS_CDN.viral,
  fitness: TRILHAS_CDN.vendas,
  financas: TRILHAS_CDN.autoridade,
};

/** Retorna URL de trilha CDN (sempre disponível) por objetivo. */
export function getTrilhaLocal(objetivo: ObjetivoTrilha = "vendas"): string {
  return TRILHAS_CDN[objetivo] || TRILHAS_CDN.vendas;
}

/** Retorna trilha CDN considerando nicho > objetivo. */
export function pickTrilha(objetivo?: string, nicho?: string): string {
  if (nicho && TRILHAS_BY_NICHO[nicho.toLowerCase()]) {
    return TRILHAS_BY_NICHO[nicho.toLowerCase()];
  }
  return getTrilhaLocal((objetivo as ObjetivoTrilha) ?? "vendas");
}

/** Verifica acessibilidade (HEAD request) — útil pra evitar 404 silencioso. */
export async function trilhaLocalDisponivel(objetivo: ObjetivoTrilha = "vendas"): Promise<boolean> {
  try {
    const res = await fetch(getTrilhaLocal(objetivo), { method: "HEAD" });
    return res.ok;
  } catch {
    return false;
  }
}
