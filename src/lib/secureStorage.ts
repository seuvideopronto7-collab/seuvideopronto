import { supabase } from "@/integrations/supabase/client";

/**
 * Builds an owner-scoped storage path: {userId}/{subpath}
 */
export function ownerPath(userId: string, subpath: string): string {
  return `${userId}/${subpath}`;
}

/**
 * Build a deterministic owner-scoped storage path:
 * {userId}/{timestamp}-{slugified-filename}
 *
 * Use for ALL bucket uploads (media-uploads, images, videos, audio, avatars).
 * Never upload to public/, temp/, tmp/, uploads/ or bucket root.
 */
export function buildUserStoragePath(userId: string, fileName: string): string {
  if (!userId) throw new Error("AUTH_REQUIRED");
  const safeName = (fileName || "file")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .toLowerCase();
  return `${userId}/${Date.now()}-${safeName}`;
}

/**
 * Get current user ID or throw
 */
export async function requireUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) throw new Error("AUTH_REQUIRED");
  return user.id;
}

/**
 * Upload a file to a bucket with owner-scoped path.
 * Returns a 1-hour signed URL (not public URL).
 */
export async function secureUpload(
  bucket: string,
  subpath: string,
  file: Blob | File,
  options?: { contentType?: string; upsert?: boolean }
): Promise<string> {
  const userId = await requireUserId();
  const fullPath = ownerPath(userId, subpath);

  const { error } = await supabase.storage.from(bucket).upload(fullPath, file, {
    contentType: options?.contentType,
    upsert: options?.upsert ?? false,
  });
  if (error) throw error;

  return secureUrl(bucket, fullPath);
}

/**
 * Get a signed URL for a storage object.
 * Works for both full paths and subpaths (will prepend userId if needed).
 */
export async function secureUrl(bucket: string, path: string, expiresIn = 3600): Promise<string> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) {
    throw new Error(`SIGNED_URL_FAILED: ${error?.message || "unknown"}`);
  }
  return data.signedUrl;
}
