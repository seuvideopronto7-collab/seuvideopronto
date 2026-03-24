import { spawn } from "node:child_process";
import path from "node:path";

export async function composeFinalVideo(params: {
  videoPath: string;
  voicePath: string;
  soundtrackPath: string;
  outputPath: string;
}) {
  const ffmpeg = process.env.FFMPEG_PATH || "ffmpeg";

  const args = [
    "-y",
    "-i", params.videoPath,
    "-i", params.voicePath,
    "-i", params.soundtrackPath,
    "-filter_complex",
    "[2:a]volume=0.18[a2];[1:a]volume=1.0[a1];[a1][a2]amix=inputs=2:duration=longest[aout]",
    "-map", "0:v:0",
    "-map", "[aout]",
    "-c:v", "copy",
    "-c:a", "aac",
    "-shortest",
    params.outputPath,
  ];

  await new Promise<void>((resolve, reject) => {
    const proc = spawn(ffmpeg, args);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}`));
    });
  });

  return path.resolve(params.outputPath);
}
