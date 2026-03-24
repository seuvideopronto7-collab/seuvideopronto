type RenderOptions = {
  durationSec?: number;
  fps?: number;
  width?: number;
  height?: number;
  animation?:
    | "kenburns"
    | "zoom-in"
    | "zoom-out"
    | "slide-left"
    | "slide-right"
    | "slide-up"
    | "slide-down"
    | "none";
  fadeInSec?: number;
  fadeOutSec?: number;
  narrationUrl?: string | null;
  musicUrl?: string | null;
  narrationVolume?: number;
  musicVolume?: number;
  enableDucking?: boolean;
  onProgress?: (ratio: number) => void;
};

let ffmpegPromise: Promise<import("@ffmpeg/ffmpeg").FFmpeg> | null = null;

const getExtensionFromUrl = (url: string) => {
  const clean = url.split("?")[0];
  const parts = clean.split(".");
  const ext = parts.length > 1 ? parts.pop() : null;
  return ext ? ext.toLowerCase() : "jpg";
};

const buildZoompan = (width: number, height: number, frames: number, animation: NonNullable<RenderOptions["animation"]>) => {
  const zoomIn = "min(zoom+0.0015,1.12)";
  const zoomOut = "max(zoom-0.0015,1.0)";
  const zoom = animation === "zoom-out" ? zoomOut : zoomIn;
  const defaultX = "(iw-ow)/2";
  const defaultY = "(ih-oh)/2";
  const slideX = "(iw-ow)*on/" + frames;
  const slideY = "(ih-oh)*on/" + frames;
  const slideXReverse = "(iw-ow)*(1-on/" + frames + ")";
  const slideYReverse = "(ih-oh)*(1-on/" + frames + ")";

  const x = animation === "slide-left" ? slideXReverse : animation === "slide-right" ? slideX : defaultX;
  const y = animation === "slide-up" ? slideYReverse : animation === "slide-down" ? slideY : defaultY;
  const z = animation === "none" ? "1" : zoom;

  return `zoompan=z='${z}':x='${x}':y='${y}':d=${frames}:s=${width}x${height}`;
};

const getFFmpeg = async () => {
  if (!ffmpegPromise) {
    ffmpegPromise = (async () => {
      const [{ FFmpeg }, { toBlobURL }] = await Promise.all([
        import("@ffmpeg/ffmpeg"),
        import("@ffmpeg/util"),
      ]);
      const ffmpeg = new FFmpeg();
      const baseUrl = "https://unpkg.com/@ffmpeg/core@0.12.6/dist";
      const coreURL = await toBlobURL(`${baseUrl}/ffmpeg-core.js`, "text/javascript");
      const wasmURL = await toBlobURL(`${baseUrl}/ffmpeg-core.wasm`, "application/wasm");
      const workerURL = await toBlobURL(`${baseUrl}/ffmpeg-core.worker.js`, "text/javascript");
      await ffmpeg.load({ coreURL, wasmURL, workerURL });
      return ffmpeg;
    })();
  }
  return ffmpegPromise;
};

export const renderVideoFromImage = async (imageUrl: string, options?: RenderOptions) => {
  const ffmpeg = await getFFmpeg();
  const { fetchFile } = await import("@ffmpeg/util");
  const onProgress = options?.onProgress;
  const progressHandler = onProgress
    ? ({ ratio }: { ratio: number }) => {
        onProgress(Math.min(1, Math.max(0, ratio)));
      }
    : null;

  if (progressHandler) {
    ffmpeg.on("progress", progressHandler as any);
  }

  const duration = options?.durationSec ?? 5;
  const fps = options?.fps ?? 30;
  const width = options?.width ?? 1080;
  const height = options?.height ?? 1920;
  const animation = options?.animation ?? "kenburns";
  const fadeIn = options?.fadeInSec ?? 0.4;
  const fadeOut = options?.fadeOutSec ?? 0.4;
  const frames = Math.max(1, Math.round(duration * fps));
  const ext = getExtensionFromUrl(imageUrl);
  const inputName = `input.${ext}`;
  const outputName = "output.mp4";
  const narrationUrl = options?.narrationUrl;
  const musicUrl = options?.musicUrl;
  const narrationVolume = options?.narrationVolume ?? 1;
  const musicVolume = options?.musicVolume ?? 0.35;
  const enableDucking = options?.enableDucking ?? true;

  await ffmpeg.writeFile(inputName, await fetchFile(imageUrl));

  if (narrationUrl) {
    const narrationExt = getExtensionFromUrl(narrationUrl);
    await ffmpeg.writeFile(`narration.${narrationExt}`, await fetchFile(narrationUrl));
  }
  if (musicUrl) {
    const musicExt = getExtensionFromUrl(musicUrl);
    await ffmpeg.writeFile(`music.${musicExt}`, await fetchFile(musicUrl));
  }

  const scale = `scale=${width}:${height}:force_original_aspect_ratio=increase`;
  const zoompan = buildZoompan(width, height, frames, animation);
  const fadeInFilter = fadeIn > 0 ? `fade=t=in:st=0:d=${fadeIn}` : "";
  const fadeOutStart = Math.max(0, duration - fadeOut);
  const fadeOutFilter = fadeOut > 0 ? `fade=t=out:st=${fadeOutStart}:d=${fadeOut}` : "";
  const videoFilters = [scale, zoompan, fadeInFilter, fadeOutFilter].filter(Boolean).join(",");

  const args = [
    "-loop",
    "1",
    "-i",
    inputName,
  ];

  if (narrationUrl) {
    const narrationExt = getExtensionFromUrl(narrationUrl);
    args.push("-i", `narration.${narrationExt}`);
  }
  if (musicUrl) {
    const musicExt = getExtensionFromUrl(musicUrl);
    args.push("-stream_loop", "-1", "-i", `music.${musicExt}`);
  }

  args.push("-vf", videoFilters, "-t", String(duration), "-r", String(fps));

  const hasNarration = Boolean(narrationUrl);
  const hasMusic = Boolean(musicUrl);
  if (hasNarration || hasMusic) {
    if (hasNarration && hasMusic) {
      const musicGain = enableDucking ? Math.min(musicVolume, 0.22) : musicVolume;
      const filter = [
        `[1:a]volume=${narrationVolume.toFixed(2)}[voice]`,
        `[2:a]volume=${musicGain.toFixed(2)}[music]`,
        "[voice][music]amix=inputs=2:duration=longest:dropout_transition=2[aout]",
      ].join(";");
      args.push("-filter_complex", filter, "-map", "0:v", "-map", "[aout]", "-shortest", "-c:a", "aac", "-b:a", "192k");
    } else if (hasNarration) {
      args.push("-map", "0:v", "-map", "1:a", "-shortest", "-c:a", "aac", "-b:a", "192k");
    } else if (hasMusic) {
      args.push("-map", "0:v", "-map", "1:a", "-shortest", "-c:a", "aac", "-b:a", "192k");
    }
  }

  args.push("-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "faststart", outputName);

  await ffmpeg.exec(args);

  const data = await ffmpeg.readFile(outputName);

  try {
    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outputName);
    if (narrationUrl) {
      const narrationExt = getExtensionFromUrl(narrationUrl);
      await ffmpeg.deleteFile(`narration.${narrationExt}`);
    }
    if (musicUrl) {
      const musicExt = getExtensionFromUrl(musicUrl);
      await ffmpeg.deleteFile(`music.${musicExt}`);
    }
  } catch {
    // ignore cleanup errors
  }

  if (progressHandler) {
    ffmpeg.off("progress", progressHandler as any);
  }

  const blob = new Blob([(data as any).buffer || data], { type: "video/mp4" });
  return URL.createObjectURL(blob);
};
