// Captura e persistência de UTM params (sobrevive entre páginas até o signup)
const UTM_KEY = "svp_utm_v1";
const UTM_FIELDS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const;

export type UTMParams = Partial<Record<(typeof UTM_FIELDS)[number], string>>;

export const captureUTMFromURL = (): UTMParams => {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  const utm: UTMParams = {};
  let hasAny = false;
  for (const f of UTM_FIELDS) {
    const v = params.get(f);
    if (v) {
      utm[f] = v;
      hasAny = true;
    }
  }
  if (hasAny) {
    try {
      sessionStorage.setItem(UTM_KEY, JSON.stringify(utm));
    } catch {}
  }
  return utm;
};

export const getStoredUTM = (): UTMParams => {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(UTM_KEY);
    return raw ? (JSON.parse(raw) as UTMParams) : {};
  } catch {
    return {};
  }
};

export const clearUTM = () => {
  try {
    sessionStorage.removeItem(UTM_KEY);
  } catch {}
};
