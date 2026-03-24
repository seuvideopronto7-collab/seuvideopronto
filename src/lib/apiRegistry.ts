export type ApiConnectionStatus = "connected" | "error" | "expired" | "testing" | "disconnected";

export type ApiRegistryItem = {
  nome: string;
  status: ApiConnectionStatus;
  token?: string | null;
  conectado: boolean;
  atualizadoEm: number;
};

export type ApiRegistry = Record<string, ApiRegistryItem>;

const STORAGE_KEY = "svz_api_registry";

const normalizeKey = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

export const setApiRegistry = (registry: ApiRegistry) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(registry));
};

export const getApiRegistry = (): ApiRegistry => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as ApiRegistry) : {};
    return parsed || {};
  } catch {
    return {};
  }
};

export const buscarAPI = (nome: string) => {
  const registry = getApiRegistry();
  const key = normalizeKey(nome);
  const entry = registry[key] || registry[nome.toLowerCase()];
  if (!entry) {
    return { nome, status: "disconnected" as ApiConnectionStatus, token: null, conectado: false, atualizadoEm: Date.now() };
  }
  return entry;
};
