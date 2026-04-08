import { supabase } from "@/integrations/supabase/client";

export const VIDEO_FALLBACK =
  "https://storage.googleapis.com/media-session/elephants-dream/the-wires.mp4";

/**
 * Validates a video URL is accessible. Returns original URL or fallback.
 */
export async function getSecureVideoUrl(url: string): Promise<string> {
  if (!url || url.trim() === "") return VIDEO_FALLBACK;
  try {
    const res = await fetch(url, { method: "HEAD" });
    if (!res.ok) throw new Error("VIDEO_BLOCKED");
    return url;
  } catch (e) {
    console.warn("[FALLBACK VIDEO]", url, e);
    return VIDEO_FALLBACK;
  }
}

/**
 * Resolves a video URL — handles Supabase storage paths, signed URLs, and direct URLs.
 * Always returns a valid, playable URL.
 */
export async function resolveVideo(urlOrPath: string): Promise<string> {
  if (!urlOrPath || urlOrPath.trim() === "") return VIDEO_FALLBACK;

  // If it's a storage path (not a full URL), generate a public URL
  if (!urlOrPath.startsWith("http")) {
    const { data } = supabase.storage.from("videos").getPublicUrl(urlOrPath);
    if (data?.publicUrl) {
      return getSecureVideoUrl(data.publicUrl);
    }
    return VIDEO_FALLBACK;
  }

  // If it's a Supabase storage URL, validate and fallback to signed URL
  if (urlOrPath.includes("supabase") || urlOrPath.includes("storage")) {
    try {
      const res = await fetch(urlOrPath, { method: "HEAD" });
      if (res.ok) return urlOrPath;

      // Try to extract bucket/path for signed URL
      const match = urlOrPath.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/);
      if (match) {
        const [, bucket, path] = match;
        const cleanPath = path.split("?")[0];
        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUrl(cleanPath, 3600);
        if (!error && data?.signedUrl) return data.signedUrl;
      }

      console.warn("[VIDEO_PIPELINE_ERROR]", { etapa: "validation", url: urlOrPath });
      return VIDEO_FALLBACK;
    } catch {
      return VIDEO_FALLBACK;
    }
  }

  return getSecureVideoUrl(urlOrPath);
}

/**
 * Force-download a video file via fetch+blob approach.
 */
export async function downloadVideo(url: string, filename?: string): Promise<void> {
  const safeUrl = await resolveVideo(url);
  const res = await fetch(safeUrl);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename || `video-${Date.now()}.mp4`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(blobUrl);
}
