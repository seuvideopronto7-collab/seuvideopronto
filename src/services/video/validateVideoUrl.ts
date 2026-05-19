// Valida que uma URL aponta para um arquivo de vídeo real (mp4/webm).
// Bloqueia imagens, blobs inválidos e URLs vazias.

const IMAGE_EXT = /\.(png|jpe?g|webp|gif|bmp|svg|avif|heic|heif)(\?|#|$)/i;
const VIDEO_EXT = /\.(mp4|webm|mov|m4v)(\?|#|$)/i;

export type ValidationResult = {
  ok: boolean;
  url?: string;
  ext?: "mp4" | "webm" | "mov" | "m4v";
  reason?: string;
};

export function validateVideoUrl(url: string | null | undefined, opts?: { allowedImageUrl?: string | null }): ValidationResult {
  if (!url || typeof url !== "string") return { ok: false, reason: "empty_url" };
  const trimmed = url.trim();
  if (trimmed.length === 0) return { ok: false, reason: "empty_url" };

  // PROIBIDO: usar a própria image_url como video_url
  if (opts?.allowedImageUrl && trimmed === opts.allowedImageUrl) {
    return { ok: false, reason: "image_url_used_as_video" };
  }

  // Blob inválido ou data URL minúsculo
  if (trimmed.startsWith("blob:") || trimmed.startsWith("data:image")) {
    return { ok: false, reason: "invalid_blob_or_image_data_url" };
  }

  // Extensão de imagem é proibida
  if (IMAGE_EXT.test(trimmed)) return { ok: false, reason: "image_extension_blocked" };

  // Tem que terminar (no path, ignorando query) em mp4/webm/mov/m4v
  let pathname = trimmed;
  try {
    const u = new URL(trimmed);
    pathname = u.pathname;
  } catch {
    /* relative or non-URL, mantém trimmed */
  }
  const m = pathname.match(/\.(mp4|webm|mov|m4v)$/i);
  if (!m) return { ok: false, reason: "not_video_extension" };

  return { ok: true, url: trimmed, ext: m[1].toLowerCase() as "mp4" | "webm" | "mov" | "m4v" };
}
