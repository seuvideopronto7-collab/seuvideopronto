/**
 * Viral Video Engine — Browser-based video generation
 * Supports: Web Speech (free) + ElevenLabs (pro) voice & soundtrack
 */

import { supabase } from "@/integrations/supabase/client";

export interface ViralVideoInput {
  imageBase: string;
  nicho: string;
  objetivo: "vendas" | "autoridade" | "engajamento";
  narrar?: boolean;
  vozIA?: boolean;       // use ElevenLabs TTS
  trilhaSonora?: boolean; // generate soundtrack
}

export interface ViralScene {
  texto: string;
  duracao: number;
}

// ─── Copy Engine by Niche ───────────────────────────────────────

const COPY_BANK: Record<string, string[]> = {
  pet: [
    "Você entende seu pet… ou só acha que entende?",
    "Ele tenta te mostrar todos os dias…",
    "Mas você nunca percebe os sinais.",
    "Isso pode estar custando a saúde dele.",
    "Descubra agora antes que seja tarde.",
  ],
  emagrecimento: [
    "Você está fazendo dieta errada.",
    "E o pior: ninguém te contou isso.",
    "Seu metabolismo está travado por um motivo.",
    "A solução é mais simples do que parece.",
    "Comece hoje e veja resultado em 7 dias.",
  ],
  renda_extra: [
    "Você trabalha o dia inteiro e não sobra nada?",
    "O problema não é quanto você ganha.",
    "É que ninguém te ensinou a multiplicar.",
    "Existe um método que funciona no automático.",
    "Comece agora com zero investimento.",
  ],
  beleza: [
    "Sua pele está envelhecendo mais rápido que deveria.",
    "E você nem percebeu os sinais.",
    "A indústria esconde um ingrediente poderoso.",
    "Quem descobriu, nunca mais voltou atrás.",
    "Experimente e veja a diferença em 48h.",
  ],
  tecnologia: [
    "Você ainda faz isso manualmente?",
    "Enquanto outros automatizam em segundos.",
    "A tecnologia já resolveu esse problema.",
    "Mas poucos sabem como usar.",
    "Descubra agora e ganhe horas do seu dia.",
  ],
  fitness: [
    "Treinar mais não é treinar melhor.",
    "Seu corpo está pedindo algo diferente.",
    "A ciência já provou o método certo.",
    "Resultado em metade do tempo.",
    "Comece o protocolo hoje.",
  ],
};

const COPY_DEFAULT: string[] = [
  "Você está fazendo isso errado…",
  "E ninguém te contou isso ainda.",
  "Isso muda completamente o jogo.",
  "Poucos sabem disso.",
  "Comece agora antes que seja tarde.",
];

const CTA_MAP: Record<string, string> = {
  vendas: "🔥 COMPRE AGORA",
  autoridade: "📲 SIGA PARA MAIS",
  engajamento: "💬 COMENTE SUA OPINIÃO",
};

export function gerarCopyViral(nicho: string, objetivo: string): string[] {
  const copy = COPY_BANK[nicho.toLowerCase()] || COPY_DEFAULT;
  const cta = CTA_MAP[objetivo] || "👉 SAIBA MAIS";
  return [...copy, cta];
}

// ─── Timeline ───────────────────────────────────────────────────

export function gerarTimeline(copy: string[]): ViralScene[] {
  return copy.map((texto, i) => ({
    texto,
    duracao: i === 0 ? 3 : i === copy.length - 1 ? 5 : 4,
  }));
}

// ─── ElevenLabs Voice (Edge Function) ───────────────────────────

export async function gerarVozIA(textos: string[]): Promise<string | null> {
  try {
    const fullText = textos.join(". ");
    const { data, error } = await supabase.functions.invoke("generate-voiceover", {
      body: { text: fullText },
    });
    if (error) throw error;
    return data?.audioUrl || null;
  } catch (e) {
    console.warn("[viralEngine] Voz IA falhou, usando fallback:", e);
    return null;
  }
}

// ─── ElevenLabs Soundtrack (Edge Function) ──────────────────────

export async function gerarTrilhaSonora(
  objetivo: string,
  duracaoSec: number,
): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke("generate-soundtrack", {
      body: { objective: objetivo, duration: duracaoSec },
    });
    if (error) throw error;
    if (data?.error) {
      console.warn("[viralEngine] Trilha erro:", data.error);
      return null;
    }
    return data?.audioUrl || null;
  } catch (e) {
    console.warn("[viralEngine] Trilha falhou:", e);
    return null;
  }
}

// ─── Image loader ───────────────────────────────────────────────

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Falha ao carregar imagem"));
    img.src = src;
  });
}

// ─── Audio loader ───────────────────────────────────────────────

async function loadAudio(url: string): Promise<HTMLAudioElement> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.crossOrigin = "anonymous";
    audio.oncanplaythrough = () => resolve(audio);
    audio.onerror = () => reject(new Error("Falha ao carregar áudio"));
    audio.src = url;
  });
}

// ─── Canvas Render Engine ───────────────────────────────────────

export async function renderViralVideo(
  imageBase: string,
  timeline: ViralScene[],
  options?: {
    vozUrl?: string | null;
    trilhaUrl?: string | null;
    narrarLocal?: boolean;
  },
  onProgress?: (ratio: number) => void,
): Promise<Blob> {
  const W = 1080;
  const H = 1920;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Set up audio context for mixing
  const audioCtx = new AudioContext();
  const destination = audioCtx.createMediaStreamDestination();

  // Canvas video stream
  const videoStream = canvas.captureStream(30);

  // Load and connect audio sources
  const audioSources: MediaElementAudioSourceNode[] = [];

  if (options?.vozUrl) {
    try {
      const vozAudio = await loadAudio(options.vozUrl);
      const source = audioCtx.createMediaElementSource(vozAudio);
      const gainNode = audioCtx.createGain();
      gainNode.gain.value = 1.0;
      source.connect(gainNode).connect(destination);
      audioSources.push(source);
      vozAudio.play().catch(() => {});
    } catch (e) {
      console.warn("[render] Voz IA não carregou:", e);
    }
  }

  if (options?.trilhaUrl) {
    try {
      const trilhaAudio = await loadAudio(options.trilhaUrl);
      const source = audioCtx.createMediaElementSource(trilhaAudio);
      const gainNode = audioCtx.createGain();
      gainNode.gain.value = 0.15; // baixo volume
      source.connect(gainNode).connect(destination);
      audioSources.push(source);
      trilhaAudio.play().catch(() => {});
    } catch (e) {
      console.warn("[render] Trilha não carregou:", e);
    }
  }

  // Combine video + audio streams
  const combinedStream = new MediaStream([
    ...videoStream.getVideoTracks(),
    ...(audioSources.length > 0 ? destination.stream.getAudioTracks() : []),
  ]);

  const recorder = new MediaRecorder(combinedStream, {
    mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus"
      : MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
        ? "video/webm;codecs=vp8,opus"
        : "video/webm",
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };

  const done = new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      audioCtx.close().catch(() => {});
      resolve(new Blob(chunks, { type: "video/webm" }));
    };
  });

  recorder.start();

  // Start local narration if no AI voice
  if (!options?.vozUrl && options?.narrarLocal && "speechSynthesis" in window) {
    const fullText = timeline.map((s) => s.texto).join(". ");
    const utterance = new SpeechSynthesisUtterance(fullText);
    utterance.lang = "pt-BR";
    utterance.rate = 0.9;
    const voices = speechSynthesis.getVoices();
    const ptVoice = voices.find((v) => v.lang.startsWith("pt"));
    if (ptVoice) utterance.voice = ptVoice;
    speechSynthesis.speak(utterance);
  }

  let img: HTMLImageElement | null = null;
  try {
    img = await loadImage(imageBase);
  } catch {
    img = null;
  }

  const totalDuration = timeline.reduce((s, t) => s + t.duracao, 0);
  let elapsed = 0;

  for (let i = 0; i < timeline.length; i++) {
    const scene = timeline[i];
    const sceneDurationMs = scene.duracao * 1000;
    const frameMs = 33;
    let sceneElapsed = 0;

    while (sceneElapsed < sceneDurationMs) {
      const progress = sceneElapsed / sceneDurationMs;

      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, "#0a0a1a");
      grad.addColorStop(1, "#1a0a2e");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Image with ken burns
      if (img) {
        const zoom = 1.0 + progress * 0.12;
        const imgW = W * zoom;
        const imgH = H * zoom;
        const dx = (W - imgW) / 2 + Math.sin(progress * Math.PI) * 20;
        const dy = (H - imgH) / 2;
        ctx.globalAlpha = 0.7;
        ctx.drawImage(img, dx, dy, imgW, imgH);
        ctx.globalAlpha = 1;
      }

      // Dark overlay
      const overlay = ctx.createLinearGradient(0, H * 0.4, 0, H);
      overlay.addColorStop(0, "rgba(0,0,0,0.2)");
      overlay.addColorStop(1, "rgba(0,0,0,0.85)");
      ctx.fillStyle = overlay;
      ctx.fillRect(0, 0, W, H);

      // Top bar accent
      ctx.fillStyle = "#7c3aed";
      ctx.fillRect(0, 0, W, 6);

      // Text animation
      const textAlpha = progress < 0.15
        ? progress / 0.15
        : progress > 0.85
          ? (1 - progress) / 0.15
          : 1;
      ctx.globalAlpha = Math.max(0, Math.min(1, textAlpha));

      const fontSize = Math.floor(W * 0.045);
      ctx.font = `bold ${fontSize}px "Segoe UI", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 20;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 4;

      // Word wrap
      const words = scene.texto.split(" ");
      const lines: string[] = [];
      let currentLine = "";
      for (const word of words) {
        const test = currentLine ? `${currentLine} ${word}` : word;
        if (ctx.measureText(test).width > W * 0.8) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = test;
        }
      }
      if (currentLine) lines.push(currentLine);

      const lineHeight = fontSize * 1.4;
      const textY = H * 0.72;
      ctx.fillStyle = "#ffffff";
      lines.forEach((line, li) => {
        ctx.fillText(line, W / 2, textY + (li - (lines.length - 1) / 2) * lineHeight);
      });

      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;

      // Scene dots
      const dotY = H * 0.92;
      timeline.forEach((_, di) => {
        ctx.beginPath();
        ctx.arc(W / 2 + (di - (timeline.length - 1) / 2) * 24, dotY, di === i ? 6 : 4, 0, Math.PI * 2);
        ctx.fillStyle = di === i ? "#7c3aed" : "rgba(255,255,255,0.3)";
        ctx.fill();
      });

      await new Promise((r) => setTimeout(r, frameMs));
      sceneElapsed += frameMs;
    }

    elapsed += scene.duracao;
    onProgress?.(elapsed / totalDuration);
  }

  if ("speechSynthesis" in window) speechSynthesis.cancel();
  recorder.stop();
  return done;
}

// ─── Main Pipeline ──────────────────────────────────────────────

export async function gerarVideoViral(
  input: ViralVideoInput,
  onProgress?: (ratio: number) => void,
): Promise<{ blob: Blob; copy: string[]; timeline: ViralScene[]; vozUrl?: string | null; trilhaUrl?: string | null }> {
  const copy = gerarCopyViral(input.nicho, input.objetivo);
  const timeline = gerarTimeline(copy);
  const totalDuration = timeline.reduce((s, t) => s + t.duracao, 0);

  let vozUrl: string | null = null;
  let trilhaUrl: string | null = null;

  // Generate AI voice + soundtrack in parallel if requested
  const promises: Promise<void>[] = [];

  if (input.vozIA) {
    promises.push(
      gerarVozIA(copy).then((url) => { vozUrl = url; }),
    );
  }

  if (input.trilhaSonora) {
    promises.push(
      gerarTrilhaSonora(input.objetivo, totalDuration).then((url) => { trilhaUrl = url; }),
    );
  }

  if (promises.length > 0) {
    await Promise.allSettled(promises);
  }

  const blob = await renderViralVideo(
    input.imageBase,
    timeline,
    {
      vozUrl,
      trilhaUrl,
      narrarLocal: input.narrar && !vozUrl, // fallback to browser voice if AI failed
    },
    onProgress,
  );

  return { blob, copy, timeline, vozUrl, trilhaUrl };
}
