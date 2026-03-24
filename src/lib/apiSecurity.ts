export type AllowedProductPlatform = "hotmart" | "monetizze" | "eduzz" | "kiwify";
export type AllowedContentNetwork = "instagram" | "tiktok" | "facebook" | "youtube";
export type ApiCategory = "produto" | "conteudo";

export type ApiAccessRequest = {
  categoria: ApiCategory;
  destino: AllowedProductPlatform | AllowedContentNetwork;
  payload?: Record<string, unknown>;
  token?: string | null;
  endpoint?: string;
};

export type AuditEvent = {
  tipo:
    | "acesso_permitido"
    | "acesso_bloqueado"
    | "payload_invalido"
    | "rate_limit"
    | "token_invalido"
    | "endpoint_invalido";
  categoria: ApiCategory;
  destino: string;
  motivo?: string;
  timestamp: number;
  endpoint?: string;
};

const PRODUCT_WHITELIST: AllowedProductPlatform[] = [
  "hotmart",
  "monetizze",
  "eduzz",
  "kiwify",
];

const CONTENT_WHITELIST: AllowedContentNetwork[] = [
  "instagram",
  "tiktok",
  "facebook",
  "youtube",
];

const auditBuffer: AuditEvent[] = [];
const auditListeners = new Set<(event: AuditEvent) => void>();
const MAX_AUDIT_EVENTS = 200;

const recordAudit = (event: AuditEvent) => {
  auditBuffer.push(event);
  if (auditBuffer.length > MAX_AUDIT_EVENTS) {
    auditBuffer.shift();
  }
  auditListeners.forEach((listener) => listener(event));
};

export const subscribeAudit = (listener: (event: AuditEvent) => void) => {
  auditListeners.add(listener);
  return () => auditListeners.delete(listener);
};

export const getAuditSnapshot = () => [...auditBuffer];

type RateLimitState = {
  windowStart: number;
  count: number;
};

const rateLimitState = new Map<string, RateLimitState>();

export const checkRateLimit = (key: string, max: number, windowMs: number) => {
  const now = Date.now();
  const state = rateLimitState.get(key);
  if (!state || now - state.windowStart >= windowMs) {
    rateLimitState.set(key, { windowStart: now, count: 1 });
    return true;
  }

  if (state.count >= max) {
    return false;
  }

  state.count += 1;
  rateLimitState.set(key, state);
  return true;
};

export const assertApiAllowed = (request: ApiAccessRequest) => {
  const { categoria, destino, endpoint } = request;
  const isProduct = categoria === "produto";
  const whitelist = isProduct ? PRODUCT_WHITELIST : CONTENT_WHITELIST;
  const destinoLower = String(destino).toLowerCase();

  if (!whitelist.includes(destinoLower as typeof whitelist[number])) {
    recordAudit({
      tipo: "acesso_bloqueado",
      categoria,
      destino: destinoLower,
      motivo: "Destino fora da whitelist",
      timestamp: Date.now(),
      endpoint,
    });
    throw new Error("Destino não autorizado pela whitelist.");
  }

  recordAudit({
    tipo: "acesso_permitido",
    categoria,
    destino: destinoLower,
    timestamp: Date.now(),
    endpoint,
  });
};

export const assertPayloadValid = (request: ApiAccessRequest) => {
  const { payload, categoria, destino, endpoint, token } = request;

  if (!payload || typeof payload !== "object") {
    recordAudit({
      tipo: "payload_invalido",
      categoria,
      destino: String(destino),
      motivo: "Payload ausente",
      timestamp: Date.now(),
      endpoint,
    });
    throw new Error("Payload inválido ou ausente.");
  }

  if (token !== undefined && token !== null && token.trim().length === 0) {
    recordAudit({
      tipo: "token_invalido",
      categoria,
      destino: String(destino),
      motivo: "Token vazio",
      timestamp: Date.now(),
      endpoint,
    });
    throw new Error("Token inválido.");
  }
};

export const assertRateLimit = (
  key: string,
  categoria: ApiCategory,
  destino: string,
  endpoint?: string,
  max = 20,
  windowMs = 60_000,
) => {
  if (!checkRateLimit(key, max, windowMs)) {
    recordAudit({
      tipo: "rate_limit",
      categoria,
      destino,
      motivo: "Limite excedido",
      timestamp: Date.now(),
      endpoint,
    });
    throw new Error("Rate limit excedido.");
  }
};

export const sanitizeText = (value: string, fieldName?: string) => {
  const lower = value.toLowerCase();
  if (lower.includes("<script") || lower.includes("javascript:")) {
    throw new Error(`Conteúdo inválido detectado${fieldName ? ` em ${fieldName}` : ""}.`);
  }

  return value.trim();
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const deriveKeyFromPassphrase = async (passphrase: string, salt: string) => {
  if (!crypto?.subtle) {
    throw new Error("Crypto API indisponível para derivar chave.");
  }
  const baseKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode(salt),
      iterations: 120_000,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
};

export const encryptToken = async (token: string, key: CryptoKey) => {
  if (!crypto?.subtle) {
    throw new Error("Crypto API indisponível para criptografar token.");
  }
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(token),
  );

  return {
    iv: Array.from(iv),
    payload: Array.from(new Uint8Array(encrypted)),
  };
};

export const decryptToken = async (
  encrypted: { iv: number[]; payload: number[] },
  key: CryptoKey,
) => {
  if (!crypto?.subtle) {
    throw new Error("Crypto API indisponível para descriptografar token.");
  }
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(encrypted.iv) },
    key,
    new Uint8Array(encrypted.payload),
  );

  return decoder.decode(decrypted);
};
