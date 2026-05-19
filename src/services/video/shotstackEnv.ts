/**
 * Shotstack environment resolver.
 * Never mix stage_ key with /v1 or prod key with /stage.
 */
export type ShotstackEnv = {
  host: string;
  pollHost: string;
  environment: "stage" | "production";
};

export function resolveShotstackEndpoint(apiKey?: string): ShotstackEnv {
  const key = apiKey || (import.meta as any).env?.VITE_SHOTSTACK_API_KEY || "";
  if (typeof key === "string" && key.startsWith("stage_")) {
    return {
      host: "https://api.shotstack.io/stage/render",
      pollHost: "https://api.shotstack.io/stage/render",
      environment: "stage",
    };
  }
  return {
    host: "https://api.shotstack.io/v1/render",
    pollHost: "https://api.shotstack.io/v1/render",
    environment: "production",
  };
}

/** Errors that should trigger native fallback automatically. */
export function shouldFallbackToNative(err: { status?: number; message?: string } | null | undefined): boolean {
  if (!err) return false;
  const status = err.status;
  if (status === 401 || status === 403 || status === 429) return true;
  const msg = (err.message || "").toLowerCase();
  return (
    msg.includes("invalid api key") ||
    msg.includes("unauthorized") ||
    msg.includes("forbidden") ||
    msg.includes("rate limit") ||
    msg.includes("timeout") ||
    msg.includes("network") ||
    msg.includes("fetch failed")
  );
}
