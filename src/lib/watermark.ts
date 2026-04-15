/**
 * Generates watermark text for a user's video.
 * This is embedded in the video metadata and optionally overlaid visually.
 */
export function buildWatermarkText(userId: string, email?: string): string {
  const short = userId.slice(0, 8);
  const ts = Date.now().toString(36);
  return `SVP-${short}-${ts}`;
}

/**
 * Draws a semi-transparent watermark on a canvas.
 * Used by the browser-side video renderer.
 */
export function drawWatermark(
  ctx: CanvasRenderingContext2D,
  text: string,
  canvasWidth: number,
  canvasHeight: number
) {
  ctx.save();
  ctx.globalAlpha = 0.15;
  ctx.font = `${Math.max(12, canvasWidth * 0.02)}px monospace`;
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillText(text, canvasWidth - 10, canvasHeight - 10);
  ctx.restore();
}
