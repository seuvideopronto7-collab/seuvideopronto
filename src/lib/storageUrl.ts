import { supabase } from "@/integrations/supabase/client";

/**
 * Resolves a storage URL, falling back to a signed URL if the public URL returns 403.
 * Logs errors with context for debugging.
 */
export async function resolveStorageUrl(
  bucket: string,
  path: string,
  expiresIn = 3600
): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);
    if (error) {
      console.error(`[Storage] Signed URL failed for ${bucket}/${path}:`, error.message);
      return null;
    }
    return data?.signedUrl || null;
  } catch (err) {
    console.error(`[Storage] Signed URL error for ${bucket}/${path}:`, err);
    return null;
  }
}

/**
 * Image component helper: returns a valid src or placeholder
 */
export function mediaFallbackUrl(url: string | null | undefined, placeholder = "/placeholder.svg"): string {
  if (!url || url.trim() === "") return placeholder;
  return url;
}
