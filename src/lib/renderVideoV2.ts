// Render no front: Canvas + MediaRecorder + mix de áudio (voz + trilha) + LEGENDAS TIKTOK
// Sempre usa áudio real. Browser TTS removido.
import { buildCaptions, captionAt, type CaptionWord } from "./captionEngine";

export interface RenderV2Input {
  script: string;
  audioUrl: string;
  trilha: string;
  width?: number;
  height?: number;
  durationSec?: number;
  bgColor?: string;
  textColor?: string;
  /** liga/desliga legendas estilo TikTok (default: true) */
  captions?: boolean;
  onProgress?: (ratio: number) => void;
}

export interface RenderV2Result {
  blob: Blob;
  url: string;
}

async function loadAudio(url: string): Promise<HTMLAudioElement | null> {
  return new Promise((resolve) => {
    const a = new Audio();
    a.crossOrigin = "anonymous";
    a.preload = "auto";
    a.src = url;
    a.oncanplaythrough = () => resolve(a);
    a.onerror = () => resolve(null);
    setTimeout(() => resolve(a), 4000);
  });
}

/** Desenha um bloco de legenda estilo TikTok com palavra atual destacada */
function drawTikTokCaption(
  ctx: CanvasRenderingContext2D,
  chunk: CaptionWord[],
  currentIdx: number,
  width: number,
  height: number,
  globalIndex: number,
) {
  if (!chunk.length) return;

  const baseY = height * 0.78;
  const fontSize = Math.round(width * 0.07); // ~76px @ 1080
  const padX = 24;
  const padY = 14;
  const gap = 14;

  ctx.font = `900 ${fontSize}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
  ctx.textBaseline = "middle";

  // mede largura total
  const widths = chunk.map((c) => ctx.measureText(c.word.toUpperCase()).width);
  const totalW = widths.reduce((a, b) => a + b, 0) + gap * (chunk.length - 1) + padX * 2;

  // wrap se passar de 90% da tela
  const maxW = width * 0.9;
  const scale = totalW > maxW ? maxW / totalW : 1;
  const blockW = totalW * scale;
  const blockH = (fontSize + padY * 2) * scale;
  const blockX = (width - blockW) / 2;
  const blockY = baseY - blockH / 2;

  // sombra do bloco
  ctx.save();
  ctx.scale(scale, scale);
  const sx = blockX / scale;
  const sy = blockY / scale;

  // fundo escuro com leve transparência
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  roundRect(ctx, sx, sy, totalW, fontSize + padY * 2, 18);
  ctx.fill();

  // palavras
  let cursorX = sx + padX;
  const cy = sy + (fontSize + padY * 2) / 2;
  for (let i = 0; i < chunk.length; i++) {
    const isCurrent = chunk[i] === (chunk.find((_, j) => globalIndex - (chunk.length === 3 && globalIndex > 0 ? 1 : 0) === j) ?? chunk[i]) && i === currentIdx;
    const w = chunk[i].word.toUpperCase();
    const wWidth = widths[i];

    if (isCurrent) {
      // highlight pill amarelo neon
      ctx.fillStyle = "#FACC15";
      roundRect(ctx, cursorX - 8, cy - fontSize / 2 - 6, wWidth + 16, fontSize + 12, 10);
      ctx.fill();
      ctx.fillStyle = "#0B0F14";
    } else {
      ctx.fillStyle = "#FFFFFF";
    }

    // contorno preto fino p/ legibilidade (somente quando não destacada)
    if (!isCurrent) {
      ctx.lineWidth = 4;
      ctx.strokeStyle = "rgba(0,0,0,0.85)";
      ctx.strokeText(w, cursorX, cy);
    }
    ctx.fillText(w, cursorX, cy);
    cursorX += wWidth + gap;
  }

  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export async function renderVideoV2(input: RenderV2Input): Promise<RenderV2Result> {
  const width = input.width ?? 1080;
  const height = input.height ?? 1920;
  const bg = input.bgColor ?? "#0B0F14";
  const useCaptions = input.captions !== false;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  const voiceEl = await loadAudio(input.audioUrl);
  const musicEl = await loadAudio(input.trilha);

  const AC: typeof AudioContext =
    (window as any).AudioContext || (window as any).webkitAudioContext;
  const audioCtx = new AC();
  const dest = audioCtx.createMediaStreamDestination();

  if (voiceEl) {
    const src = audioCtx.createMediaElementSource(voiceEl);
    const gain = audioCtx.createGain();
    gain.gain.value = 1.0;
    src.connect(gain).connect(dest);
  }
  if (musicEl) {
    const src = audioCtx.createMediaElementSource(musicEl);
    const gain = audioCtx.createGain();
    gain.gain.value = 0.18;
    src.connect(gain).connect(dest);
  }

  const videoStream = canvas.captureStream(30);
  const tracks = [...videoStream.getVideoTracks(), ...dest.stream.getAudioTracks()];
  const finalStream = new MediaStream(tracks);

  const mime =
    MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus"
      : MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
      ? "video/webm;codecs=vp8,opus"
      : "video/webm";

  const recorder = new MediaRecorder(finalStream, { mimeType: mime, videoBitsPerSecond: 4_000_000 });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };

  const stopped = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mime }));
    recorder.onerror = (e) => reject(e);
  });

  const voiceDuration = voiceEl?.duration && isFinite(voiceEl.duration) ? voiceEl.duration : 0;
  const totalSec = Math.max(6, Math.min(60, input.durationSec ?? voiceDuration ?? 12));
  const totalFrames = Math.round(totalSec * 30);

  // Pré-computa legendas com timing baseado na duração final
  const captions = useCaptions ? buildCaptions(input.script, totalSec) : [];

  recorder.start();

  if (voiceEl) { try { await voiceEl.play(); } catch { /* ignore */ } }
  if (musicEl) { try { await musicEl.play(); } catch { /* ignore */ } }

  let frame = 0;
  const start = performance.now();
  await new Promise<void>((resolve) => {
    function draw() {
      const elapsed = (performance.now() - start) / 1000;
      const ratio = Math.min(1, elapsed / totalSec);
      input.onProgress?.(ratio);

      // BG gradiente
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, bg);
      grad.addColorStop(1, "#000000");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Halo animado
      const t = elapsed * 0.6;
      ctx.fillStyle = `rgba(239, 68, 68, ${0.10 + 0.05 * Math.sin(t)})`;
      ctx.beginPath();
      ctx.arc(width / 2, height * 0.32, 320 + 30 * Math.sin(t), 0, Math.PI * 2);
      ctx.fill();

      // Marca topo
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.font = "600 28px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.fillText("seuvideopronto.lovable.app", width / 2, 80);

      // Legendas TikTok
      if (useCaptions && captions.length) {
        const { chunk, index } = captionAt(captions, elapsed);
        // descobre qual item dentro do chunk é o atual
        const currentInChunk = chunk.findIndex((c) => c === captions[index]);
        ctx.textAlign = "left";
        drawTikTokCaption(ctx, chunk, Math.max(0, currentInChunk), width, height, index);
      }

      // CTA bottom
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.font = "500 26px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("👇 link na bio", width / 2, height - 60);

      frame++;
      if (frame < totalFrames && elapsed < totalSec + 0.3) {
        requestAnimationFrame(draw);
      } else {
        resolve();
      }
    }
    requestAnimationFrame(draw);
  });

  recorder.stop();
  voiceEl?.pause();
  musicEl?.pause();

  const blob = await stopped;
  const url = URL.createObjectURL(blob);
  return { blob, url };
}
