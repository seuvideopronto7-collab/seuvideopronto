// Caption Engine — divide o script em palavras com timing estimado pela duração do áudio.
// Estilo TikTok: palavra atual destacada, 1-3 palavras visíveis simultaneamente.

export interface CaptionWord {
  word: string;
  start: number; // segundos
  end: number;   // segundos
}

/**
 * Distribui as palavras proporcionalmente ao tamanho de cada uma (palavras maiores = mais tempo).
 * Total = audioDuration. Garante mínimo de 0.18s por palavra.
 */
export function buildCaptions(script: string, audioDuration: number): CaptionWord[] {
  const clean = script.replace(/\s+/g, " ").trim();
  if (!clean || audioDuration <= 0) return [];

  const tokens = clean.split(" ").filter(Boolean);
  if (!tokens.length) return [];

  // Peso = quantidade de caracteres (proxy razoável de duração de fala)
  const weights = tokens.map((w) => Math.max(1, w.length));
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  // Reserva ~3% no início e 3% no fim como respiro
  const usable = audioDuration * 0.94;
  const offset = audioDuration * 0.03;

  const minDur = 0.18;
  const result: CaptionWord[] = [];
  let cursor = offset;

  for (let i = 0; i < tokens.length; i++) {
    let dur = (weights[i] / totalWeight) * usable;
    if (dur < minDur) dur = minDur;
    const start = cursor;
    const end = Math.min(audioDuration, cursor + dur);
    result.push({ word: tokens[i], start, end });
    cursor = end;
  }

  return result;
}

/**
 * Retorna as palavras "ativas" no instante t (janela de 1-3 palavras estilo TikTok).
 * - currentIndex: palavra exata sendo falada
 * - chunk: até 3 palavras (anterior + atual + próxima) para contexto
 */
export function captionAt(
  captions: CaptionWord[],
  t: number,
): { current: CaptionWord | null; chunk: CaptionWord[]; index: number } {
  if (!captions.length) return { current: null, chunk: [], index: -1 };

  let idx = captions.findIndex((c) => t >= c.start && t < c.end);
  if (idx === -1) {
    if (t < captions[0].start) idx = 0;
    else idx = captions.length - 1;
  }

  const start = Math.max(0, idx - 1);
  const end = Math.min(captions.length, idx + 2); // pega current + próxima
  const chunk = captions.slice(start, end);

  return { current: captions[idx], chunk, index: idx };
}
