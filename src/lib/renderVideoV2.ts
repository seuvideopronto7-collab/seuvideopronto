// Render no front: Canvas + MediaRecorder + mix de áudio (voz + trilha)
// SEMPRE usa áudio real (voz-padrao.mp3 ou voz gerada). Browser TTS removido.

export interface RenderV2Input {
  script: string;
  audioUrl: string; // pode ser "__browser_tts__"
  trilha: string;
  width?: number;
  height?: number;
  durationSec?: number; // se não vier, usa duração da voz
  bgColor?: string;
  textColor?: string;
  onProgress?: (ratio: number) => void;
}

export interface RenderV2Result {
  blob: Blob;
  url: string;
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(/\s+/);
  let line = "";
  let cy = y;
  for (let n = 0; n < words.length; n++) {
    const test = line + words[n] + " ";
    if (ctx.measureText(test).width > maxWidth && n > 0) {
      ctx.fillText(line.trim(), x, cy);
      line = words[n] + " ";
      cy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line.trim()) ctx.fillText(line.trim(), x, cy);
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

export async function renderVideoV2(input: RenderV2Input): Promise<RenderV2Result> {
  const width = input.width ?? 1080;
  const height = input.height ?? 1920;
  const bg = input.bgColor ?? "#0B0F14";
  const fg = input.textColor ?? "#FFFFFF";

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  // Áudio (voz + trilha) com mix via WebAudio — sempre tenta carregar voz real
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

  // Stream final = vídeo (canvas) + áudio (mix)
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

  // Calcula duração: voz quando disponível, senão fallback 12s
  const voiceDuration = voiceEl?.duration && isFinite(voiceEl.duration) ? voiceEl.duration : 0;
  const totalSec = Math.max(6, Math.min(60, input.durationSec ?? voiceDuration ?? 12));
  const totalFrames = Math.round(totalSec * 30);

  recorder.start();

  // Inicia áudio
  if (voiceEl) {
    try { await voiceEl.play(); } catch { /* ignore autoplay */ }
  }
  if (musicEl) {
    try { await musicEl.play(); } catch { /* ignore */ }
  }
  // Browser TTS removido — sempre usamos áudio real (voz-padrao.mp3 fallback)

  // Loop de animação
  let frame = 0;
  const start = performance.now();
  await new Promise<void>((resolve) => {
    function draw() {
      const elapsed = (performance.now() - start) / 1000;
      const ratio = Math.min(1, elapsed / totalSec);
      input.onProgress?.(ratio);

      // BG com leve gradiente
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, bg);
      grad.addColorStop(1, "#000000");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Halo animado
      const t = elapsed * 0.6;
      ctx.fillStyle = `rgba(239, 68, 68, ${0.10 + 0.05 * Math.sin(t)})`;
      ctx.beginPath();
      ctx.arc(width / 2, height * 0.35, 320 + 30 * Math.sin(t), 0, Math.PI * 2);
      ctx.fill();

      // Texto principal
      ctx.fillStyle = fg;
      ctx.font = "bold 64px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "left";
      wrapText(ctx, input.script, 80, 900, width - 160, 84);

      // Marca/CTA
      ctx.fillStyle = "rgba(255,255,255,0.65)";
      ctx.font = "28px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("seuvideopronto.lovable.app", width / 2, height - 80);

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
  // pausa áudios
  voiceEl?.pause();
  musicEl?.pause();

  const blob = await stopped;
  const url = URL.createObjectURL(blob);
  return { blob, url };
}
