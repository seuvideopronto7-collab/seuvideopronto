type RenderOptions = {
  durationSec?: number;
  fps?: number;
};

let ffmpegPromise: Promise<import("@ffmpeg/ffmpeg").FFmpeg> | null = null;

const getExtensionFromUrl = (url: string) => {
  const clean = url.split("?")[0];
  const parts = clean.split(".");
  const ext = parts.length > 1 ? parts.pop() : null;
  return ext ? ext.toLowerCase() : "jpg";
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

  const duration = options?.durationSec ?? 5;
  const fps = options?.fps ?? 30;
  const frames = Math.max(1, Math.round(duration * fps));
  const ext = getExtensionFromUrl(imageUrl);
  const inputName = `input.${ext}`;
  const outputName = "output.mp4";

  await ffmpeg.writeFile(inputName, await fetchFile(imageUrl));

  const zoom = "min(zoom+0.0015,1.1)";
  const filter = `zoompan=z='${zoom}':d=${frames},scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,format=yuv420p`;

  await ffmpeg.exec([
    "-loop",
    "1",
    "-i",
    inputName,
    "-vf",
    filter,
    "-t",
    String(duration),
    "-r",
    String(fps),
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "faststart",
    outputName,
  ]);

  const data = await ffmpeg.readFile(outputName);

  try {
    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outputName);
  } catch {
    // ignore cleanup errors
  }

  const blob = new Blob([data.buffer], { type: "video/mp4" });
  return URL.createObjectURL(blob);
};
