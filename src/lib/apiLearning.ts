import type { AllowedProductPlatform } from "./apiSecurity";

export type ApiFieldRule = {
  name: string;
  type: "string" | "number" | "boolean" | "array" | "object";
  required?: boolean;
  description?: string;
};

export type ApiEndpointSchema = {
  name: string;
  path: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  requiredFields: ApiFieldRule[];
  payloadShape?: Record<string, unknown>;
  rules?: string[];
};

export type PlatformSchema = {
  platform: AllowedProductPlatform;
  endpoints: ApiEndpointSchema[];
  notes?: string[];
};

export type InternalApiModel = {
  produto: Record<string, ApiFieldRule[]>;
  checkout: Record<string, ApiFieldRule[]>;
  pagina_venda: Record<string, ApiFieldRule[]>;
  afiliacao: Record<string, ApiFieldRule[]>;
};

export type LearnedPlatform = {
  platform: AllowedProductPlatform;
  model: InternalApiModel;
  learnedAt: number;
};

const normalizeKey = (key: string) =>
  key
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

const DEFAULT_INTERNAL_MODEL: InternalApiModel = {
  produto: {},
  checkout: {},
  pagina_venda: {},
  afiliacao: {},
};

const guessBucket = (endpointName: string) => {
  const normalized = normalizeKey(endpointName);
  if (normalized.includes("checkout")) return "checkout";
  if (normalized.includes("afili")) return "afiliacao";
  if (normalized.includes("pagina") || normalized.includes("venda") || normalized.includes("page")) {
    return "pagina_venda";
  }
  return "produto";
};

export const learnFromSchema = (schema: PlatformSchema): LearnedPlatform => {
  const model: InternalApiModel = {
    produto: { ...DEFAULT_INTERNAL_MODEL.produto },
    checkout: { ...DEFAULT_INTERNAL_MODEL.checkout },
    pagina_venda: { ...DEFAULT_INTERNAL_MODEL.pagina_venda },
    afiliacao: { ...DEFAULT_INTERNAL_MODEL.afiliacao },
  };

  schema.endpoints.forEach((endpoint) => {
    const bucket = guessBucket(endpoint.name);
    const key = normalizeKey(endpoint.name || endpoint.path);
    model[bucket][key] = endpoint.requiredFields;
  });

  return {
    platform: schema.platform,
    model,
    learnedAt: Date.now(),
  };
};

export const adaptPayloadForPlatform = (
  internalModel: InternalApiModel,
  platform: AllowedProductPlatform,
) => {
  const payloadMap: Record<string, string[]> = {};

  Object.entries(internalModel).forEach(([bucket, groups]) => {
    Object.entries(groups).forEach(([groupName, fields]) => {
      const key = `${platform}_${bucket}_${groupName}`;
      payloadMap[key] = fields.map((field) => field.name);
    });
  });

  return payloadMap;
};
