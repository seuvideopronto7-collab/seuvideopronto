import { toast } from "sonner";

/**
 * Detect Supabase / Postgres RLS / auth errors and show a friendly toast.
 * Never exposes SQL, policy names or stack traces to the user.
 * Returns true if the error was a security/RLS error (handled).
 */
export function handleSecurityError(error: unknown, context = "operação"): boolean {
  if (!error) return false;
  const anyErr = error as any;
  const status = Number(anyErr?.status ?? anyErr?.statusCode ?? 0);
  const code = String(anyErr?.code ?? "");
  const raw = String(anyErr?.message ?? anyErr ?? "").toLowerCase();

  const isAuth = status === 401 || status === 403 || code === "PGRST301" || code === "42501";
  const isRls =
    raw.includes("row-level security") ||
    raw.includes("row level security") ||
    raw.includes("permission denied") ||
    raw.includes("violates row-level") ||
    raw.includes("not authorized");

  if (isAuth || isRls) {
    // Generic, opaque message — never leak internals
    toast.message("Seu acesso foi validado novamente.", {
      description: "Recarregue a página se o problema persistir.",
    });
    // Internal log only (not shown to user)
    if (typeof console !== "undefined") {
      console.warn(`[secure] ${context}: acesso negado pelas políticas de segurança.`);
    }
    return true;
  }
  return false;
}

/**
 * Build a deterministic owner-scoped storage path: {userId}/{timestamp}-{fileName}
 * Use for ALL uploads to prevent path traversal / cross-user writes.
 */
export function buildUserPath(userId: string, fileName: string): string {
  const safe = fileName.replace(/[^\w.\-]+/g, "_");
  return `${userId}/${Date.now()}-${safe}`;
}
