export interface VideoScene {
  tempo: string;
  texto: string;
  visual: string;
  emocao: string;
  prompt_imagem: string;
  audio?: string;
  legenda?: string;
}

export interface VideoTimeline {
  titulo: string;
  cenas: VideoScene[];
  voz: { estilo: string; ritmo: string };
  legenda: string;
  hashtags: string[];
  cta: string;
  duracao_total: string;
}

const EMOTIONS_FLOW = ["curiosidade", "tensão", "solução", "urgência"] as const;

export const buildVideoStructure = (
  roteiro: string,
  context: { tema: string; publico: string; objetivo: string; marca?: string },
): VideoScene[] => {
  if (!roteiro || !roteiro.trim()) return [];

  const sentences = roteiro
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 5);

  if (sentences.length === 0) return [];

  const targetScenes = Math.max(4, Math.min(8, Math.ceil(sentences.length / 2)));
  const chunkSize = Math.max(1, Math.ceil(sentences.length / targetScenes));
  const scenes: VideoScene[] = [];
  let timeOffset = 0;

  for (let i = 0; i < sentences.length; i += chunkSize) {
    const chunk = sentences.slice(i, i + chunkSize).join(". ") + ".";
    const sceneIndex = scenes.length;
    const duration = Math.min(5, Math.max(3, Math.ceil(chunk.length / 30)));
    const emotionIndex = Math.min(sceneIndex, EMOTIONS_FLOW.length - 1);

    scenes.push({
      tempo: `${timeOffset}s - ${timeOffset + duration}s`,
      texto: chunk,
      visual: generateVisualPrompt(chunk, context.tema, EMOTIONS_FLOW[emotionIndex]),
      emocao: EMOTIONS_FLOW[emotionIndex],
      prompt_imagem: generateVisualPrompt(chunk, context.tema, EMOTIONS_FLOW[emotionIndex]),
    });

    timeOffset += duration;
  }

  return scenes;
};

export const generateVisualPrompt = (
  sceneText: string,
  tema: string,
  emocao: string,
): string => {
  const baseStyle = "cinematic, dark lighting, ultra realistic, 4k, dramatic shadows, luxury mood";
  const emotionMap: Record<string, string> = {
    curiosidade: "mysterious atmosphere, intrigue, close-up details",
    tensão: "high contrast, tension, dramatic angles, red accents",
    solução: "bright highlights emerging from dark, relief, golden tones",
    urgência: "dynamic movement, bold text overlay space, energy, neon accents",
  };
  const emotionStyle = emotionMap[emocao] || "professional dark aesthetic";
  const contextHint = sceneText.slice(0, 60).replace(/[^a-zA-ZÀ-ÿ0-9 ]/g, "");

  return `${baseStyle}, ${emotionStyle}, related to ${tema}, scene: ${contextHint}`;
};

export const buildTimeline = (
  titulo: string,
  cenas: VideoScene[],
  voz: { estilo: string; ritmo: string },
  extras: { legenda?: string; hashtags?: string[]; cta?: string },
): VideoTimeline => {
  const lastScene = cenas[cenas.length - 1];
  const endMatch = lastScene?.tempo.match(/(\d+)s$/);
  const totalSeconds = endMatch ? parseInt(endMatch[1], 10) : cenas.length * 4;

  return {
    titulo,
    cenas,
    voz,
    legenda: extras.legenda || "",
    hashtags: extras.hashtags || [],
    cta: extras.cta || "",
    duracao_total: `${totalSeconds}s`,
  };
};

export type GenerationStage =
  | "idle"
  | "gerando_roteiro"
  | "criando_cenas"
  | "montando_video"
  | "finalizado"
  | "erro";

export const STAGE_LABELS: Record<GenerationStage, string> = {
  idle: "",
  gerando_roteiro: "Gerando roteiro com IA...",
  criando_cenas: "Criando cenas automaticamente...",
  montando_video: "Montando estrutura do vídeo...",
  finalizado: "Pronto!",
  erro: "Erro na geração",
};