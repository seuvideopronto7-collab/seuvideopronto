/**
 * Gera uma imagem (data URL) a partir de copy/cores via Canvas.
 * Usado quando não há upload do usuário mas precisamos renderizar um vídeo MP4.
 */
export interface PosterOptions {
  width?: number;
  height?: number;
  background?: string;
  textColor?: string;
  accent?: string;
  headline?: string;
  subhead?: string;
  cta?: string;
  brand?: string;
}

export async function generatePosterImage(opts: PosterOptions = {}): Promise<string> {
  const width = opts.width || 1080;
  const height = opts.height || 1920;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível");

  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, 0, height);
  const baseColor = opts.background || "#0B0F1A";
  const accent = opts.accent || "#FF2D55";
  bg.addColorStop(0, baseColor);
  bg.addColorStop(1, "#000000");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // Accent glow
  const glow = ctx.createRadialGradient(width / 2, height * 0.35, 50, width / 2, height * 0.35, width * 0.7);
  glow.addColorStop(0, `${accent}55`);
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  // Brand
  if (opts.brand) {
    ctx.fillStyle = opts.textColor || "#FFFFFF";
    ctx.textAlign = "center";
    ctx.font = "600 36px Inter, Arial, sans-serif";
    ctx.fillText(opts.brand.toUpperCase(), width / 2, 120);
  }

  // Headline
  ctx.fillStyle = opts.textColor || "#FFFFFF";
  ctx.textAlign = "center";
  ctx.font = "900 96px Impact, 'Arial Black', sans-serif";
  wrapText(ctx, (opts.headline || "SEU PRODUTO").toUpperCase(), width / 2, height * 0.4, width - 160, 110);

  // Subhead
  ctx.fillStyle = "#E2E8F0";
  ctx.font = "500 44px Inter, Arial, sans-serif";
  wrapText(ctx, opts.subhead || "Descubra o que ninguém te contou", width / 2, height * 0.62, width - 200, 60);

  // CTA bar
  const ctaY = height * 0.82;
  ctx.fillStyle = accent;
  const ctaWidth = width * 0.7;
  const ctaX = (width - ctaWidth) / 2;
  ctx.fillRect(ctaX, ctaY, ctaWidth, 120);
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "800 48px Inter, Arial, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText((opts.cta || "GARANTA AGORA").toUpperCase(), width / 2, ctaY + 60);

  return canvas.toDataURL("image/jpeg", 0.92);
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(" ");
  let line = "";
  let cursorY = y;
  for (let n = 0; n < words.length; n += 1) {
    const testLine = line ? `${line} ${words[n]}` : words[n];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && line) {
      ctx.fillText(line, x, cursorY);
      line = words[n];
      cursorY += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) ctx.fillText(line, x, cursorY);
}
