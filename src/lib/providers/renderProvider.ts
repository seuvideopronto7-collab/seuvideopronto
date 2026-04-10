import type { Provider, RenderInput, RenderOutput, ProviderResult } from "./types";
import { supabase } from "@/integrations/supabase/client";

/**
 * Canvas + MediaRecorder fallback (browser-side render)
 */
const canvasRenderProvider: Provider<RenderInput, RenderOutput> = {
  name: "canvas",
  async generate(input): Promise<ProviderResult<RenderOutput>> {
    try {
      const canvas = document.createElement("canvas");
      const aspectMap: Record<string, [number, number]> = {
        "9:16": [1080, 1920],
        "1:1": [1080, 1080],
        "16:9": [1920, 1080],
      };
      const [w, h] = aspectMap[input.aspectRatio] || aspectMap["9:16"];
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;

      const stream = canvas.captureStream(30);
      const recorder = new MediaRecorder(stream, { mimeType: "video/webm; codecs=vp9" });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };

      const done = new Promise<Blob>((resolve, reject) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
        recorder.onerror = (e) => reject(e);
      });

      recorder.start();

      for (const scene of input.scenes) {
        // Background escuro
        ctx.fillStyle = "#0a0a0a";
        ctx.fillRect(0, 0, w, h);

        // Tentar carregar imagem
        if (scene.imageUrl && scene.imageUrl !== "/placeholder.svg") {
          try {
            const img = new Image();
            img.crossOrigin = "anonymous";
            await new Promise<void>((res, rej) => {
              img.onload = () => res();
              img.onerror = () => rej();
              img.src = scene.imageUrl;
            });
            const scale = Math.max(w / img.width, h / img.height);
            const dx = (w - img.width * scale) / 2;
            const dy = (h - img.height * scale) / 2;
            ctx.drawImage(img, dx, dy, img.width * scale, img.height * scale);
          } catch {
            // Fallback: gradiente
            const grad = ctx.createLinearGradient(0, 0, 0, h);
            grad.addColorStop(0, "#1a1a2e");
            grad.addColorStop(1, "#16213e");
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);
          }
        }

        // Overlay escuro
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(0, 0, w, h);

        // Texto
        if (scene.text) {
          ctx.fillStyle = "#ffffff";
          ctx.font = `bold ${Math.floor(w * 0.04)}px sans-serif`;
          ctx.textAlign = "center";
          const words = scene.text.split(" ");
          const lines: string[] = [];
          let currentLine = "";
          for (const word of words) {
            const test = currentLine ? `${currentLine} ${word}` : word;
            if (ctx.measureText(test).width > w * 0.8) {
              lines.push(currentLine);
              currentLine = word;
            } else {
              currentLine = test;
            }
          }
          if (currentLine) lines.push(currentLine);

          const lineHeight = Math.floor(w * 0.05);
          const startY = h * 0.7 - (lines.length * lineHeight) / 2;
          lines.forEach((line, i) => {
            ctx.fillText(line, w / 2, startY + i * lineHeight);
          });
        }

        // Aguardar duração da cena
        await new Promise((r) => setTimeout(r, scene.durationMs));
      }

      recorder.stop();
      const blob = await done;

      // Upload para storage
      const path = `generated/${input.jobId}-canvas.webm`;
      const { error: uploadError } = await supabase.storage
        .from("videos")
        .upload(path, blob, { contentType: "video/webm", upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("videos").getPublicUrl(path);
      return { ok: true, data: { videoUrl: urlData.publicUrl }, provider: "canvas" };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Erro no render canvas", provider: "canvas" };
    }
  },
};

/**
 * Shotstack render via Edge Function
 */
const shotstackRenderProvider: Provider<RenderInput, RenderOutput> = {
  name: "shotstack",
  async generate(input): Promise<ProviderResult<RenderOutput>> {
    try {
      const { data, error } = await supabase.functions.invoke("video-pipeline", {
        body: {
          jobId: input.jobId,
          scenes: input.scenes,
          aspectRatio: input.aspectRatio,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.videoUrl) throw new Error("Sem URL de vídeo");

      return { ok: true, data: { videoUrl: data.videoUrl }, provider: "shotstack" };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Erro Shotstack", provider: "shotstack" };
    }
  },
};

/**
 * Render com fallback: Shotstack → Canvas
 */
export const renderProvider: Provider<RenderInput, RenderOutput> = {
  name: "render-with-fallback",
  async generate(input): Promise<ProviderResult<RenderOutput>> {
    const result = await shotstackRenderProvider.generate(input);
    if (result.ok) return result;

    console.warn("[Render] Shotstack falhou, usando Canvas fallback:", result.error);
    return canvasRenderProvider.generate(input);
  },
};

export { canvasRenderProvider, shotstackRenderProvider };
