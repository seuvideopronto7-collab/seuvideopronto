import { supabase } from "@/integrations/supabase/client";

export const VIDEO_FALLBACK =
  "/__l5e/assets-v1/bf6a1191-551b-406d-8192-4a97863744de/demo-cinematic.mp4";

const FALLBACK_VIDEO_URLS = new Set([
  VIDEO_FALLBACK,
  "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
]);

function isLocalAssetPath(url: string): boolean {
  return url.startsWith("/__l5e/") || url.startsWith("/");
}

function toAbsoluteUrl(urlOrPath: string): string {
  if (urlOrPath.startsWith("http")) return urlOrPath;
  return `${window.location.origin}${urlOrPath.startsWith("/") ? "" : "/"}${urlOrPath}`;
}

function isManagedStorageUrl(url: string): boolean {
  return url.includes("/storage/v1/object/");
}

function extractStoragePath(url: string): { bucket: string; path: string } | null {
  const match = url.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)/);
  if (!match) return null;

  const [, bucket, rawPath] = match;
  return {
    bucket,
    path: rawPath.split("?")[0],
  };
}

function getDownloadFilename(url: string, filename?: string): string {
  if (filename?.trim()) return filename;

  try {
    const pathname = new URL(url, window.location.origin).pathname;
    const lastSegment = pathname.split("/").filter(Boolean).pop();
    if (lastSegment) return lastSegment;
  } catch {
    // noop
  }

  return `video-${Date.now()}.mp4`;
}

function triggerNativeDownload(url: string, filename?: string): void {
  const link = document.createElement("a");
  link.href = url;
  link.download = getDownloadFilename(url, filename);
  link.rel = "noopener noreferrer";
  link.target = "_blank";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function isKnownFallbackVideo(url: string): boolean {
  if (FALLBACK_VIDEO_URLS.has(url)) return true;
  // All local CDN asset paths are demo/placeholder content, not user-generated final videos
  if (isLocalAssetPath(url) && !isManagedStorageUrl(url)) return true;
  return false;
}

async function resolveDownloadVideo(urlOrPath: string): Promise<string> {
  if (!urlOrPath || urlOrPath.trim() === "") {
    throw new Error("VIDEO_URL_MISSING");
  }

  if (isKnownFallbackVideo(urlOrPath)) {
    throw new Error("VIDEO_FALLBACK_ONLY");
  }

  // Local asset paths (e.g. /__l5e/...) — convert to absolute URL
  if (isLocalAssetPath(urlOrPath) && !isManagedStorageUrl(urlOrPath)) {
    return toAbsoluteUrl(urlOrPath);
  }

  if (!urlOrPath.startsWith("http")) {
    const { data, error } = await supabase.storage.from("videos").createSignedUrl(urlOrPath, 3600);

    if (!error && data?.signedUrl) return data.signedUrl;

    const { data: publicData } = supabase.storage.from("videos").getPublicUrl(urlOrPath);
    if (publicData?.publicUrl) return publicData.publicUrl;

    throw new Error("VIDEO_DOWNLOAD_UNAVAILABLE");
  }

  if (isManagedStorageUrl(urlOrPath)) {
    const storagePath = extractStoragePath(urlOrPath);

    if (storagePath) {
      const { data, error } = await supabase.storage
        .from(storagePath.bucket)
        .createSignedUrl(storagePath.path, 3600);

      if (!error && data?.signedUrl) return data.signedUrl;
    }
  }

  return urlOrPath;
}

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

  // Local asset paths (/__l5e/...) — use directly
  if (isLocalAssetPath(urlOrPath) && !isManagedStorageUrl(urlOrPath)) {
    return urlOrPath;
  }

  // If it's a storage path (not a full URL), generate a public URL
  if (!urlOrPath.startsWith("http")) {
    const { data } = supabase.storage.from("videos").getPublicUrl(urlOrPath);
    if (data?.publicUrl) {
      return getSecureVideoUrl(data.publicUrl);
    }
    return VIDEO_FALLBACK;
  }

  // If it's a Supabase storage URL, validate and fallback to signed URL
  if (isManagedStorageUrl(urlOrPath)) {
    try {
      const res = await fetch(urlOrPath, { method: "HEAD" });
      if (res.ok) return urlOrPath;

      // Try to extract bucket/path for signed URL
      const storagePath = extractStoragePath(urlOrPath);
      if (storagePath) {
        const { data, error } = await supabase.storage
          .from(storagePath.bucket)
          .createSignedUrl(storagePath.path, 3600);
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
  const downloadUrl = await resolveDownloadVideo(url);
  const downloadName = getDownloadFilename(url, filename);

  try {
    const res = await fetch(downloadUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const blob = await res.blob();
    if (!blob.size) throw new Error("EMPTY_BLOB");

    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = downloadName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    if (error instanceof TypeError) {
      console.warn("[VIDEO_PIPELINE_ERROR]", {
        etapa: "download",
        url: downloadUrl,
        fallback: "native-anchor",
      });

      triggerNativeDownload(downloadUrl, downloadName);
      return;
    }

    if (error instanceof Error) {
      console.warn("[DOWNLOAD_FALLBACK]", error.message);
    }

    throw error;
  }
}
