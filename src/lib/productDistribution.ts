import {
  assertApiAllowed,
  assertPayloadValid,
  assertRateLimit,
  sanitizeText,
  type AllowedProductPlatform,
} from "./apiSecurity";
import { adaptPayloadForPlatform, learnFromSchema, type PlatformSchema } from "./apiLearning";
import { buildFlowBlueprint } from "./flowBuilder";

export type ProductPayload = {
  nome: string;
  nicho: string;
  promessa: string;
  avatar: string;
  tipo: "ebook" | "curso" | "vsl" | "combo";
  materiais?: Record<string, string>;
};

export type PlatformConnection = {
  platform: AllowedProductPlatform;
  token?: string;
};

export type PlatformPreparedProduct = {
  platform: AllowedProductPlatform;
  payloadMap: Record<string, string[]>;
  flow: ReturnType<typeof buildFlowBlueprint>;
};

export type ApprovalResult = {
  platform: AllowedProductPlatform;
  status: "enviado" | "fallback" | "erro";
  mensagem?: string;
  pacoteFallback?: FallbackPackage;
};

export type FallbackPackage = {
  estrutura: string[];
  instrucoes: string;
};

const sanitizeProductPayload = (payload: ProductPayload): ProductPayload => ({
  ...payload,
  nome: sanitizeText(payload.nome, "nome"),
  nicho: sanitizeText(payload.nicho, "nicho"),
  promessa: sanitizeText(payload.promessa, "promessa"),
  avatar: sanitizeText(payload.avatar, "avatar"),
});

export const registerPlatformSchema = (schema: PlatformSchema) => {
  return learnFromSchema(schema);
};

export const prepareProductForPlatform = (
  platform: AllowedProductPlatform,
  product: ProductPayload,
  learnedModel: ReturnType<typeof learnFromSchema>,
): PlatformPreparedProduct => {
  const sanitized = sanitizeProductPayload(product);
  assertPayloadValid({
    categoria: "produto",
    destino: platform,
    payload: sanitized as unknown as Record<string, unknown>,
  });
  assertApiAllowed({ categoria: "produto", destino: platform, payload: sanitized });
  assertRateLimit(`produto:${platform}`, "produto", platform);

  const payloadMap = adaptPayloadForPlatform(learnedModel.model, platform);
  const flow = buildFlowBlueprint(learnedModel.model);

  return { platform, payloadMap, flow };
};

export const createFallbackPackage = (product: ProductPayload): FallbackPackage => ({
  estrutura: [
    "/produto",
    "/produto/ebook.pdf",
    "/produto/vsl.mp4",
    "/produto/thumbnails/",
    "/produto/copy.txt",
    "/produto/descricao.txt",
    "/produto/roteiros/",
  ],
  instrucoes: `Enviar manualmente o produto ${product.nome} seguindo a estrutura acima.`,
});

export const sendProductForApproval = async (
  connection: PlatformConnection,
  product: ProductPayload,
  learnedModel?: ReturnType<typeof learnFromSchema>,
): Promise<ApprovalResult> => {
  const sanitized = sanitizeProductPayload(product);
  try {
    assertPayloadValid({
      categoria: "produto",
      destino: connection.platform,
      payload: sanitized as unknown as Record<string, unknown>,
      token: connection.token ?? null,
    });
    assertApiAllowed({ categoria: "produto", destino: connection.platform, payload: sanitized });
    assertRateLimit(`produto:${connection.platform}`, "produto", connection.platform);

    if (!learnedModel) {
      const fallback = createFallbackPackage(sanitized);
      return {
        platform: connection.platform,
        status: "fallback",
        mensagem: "Schema nao aprendido. Gerando pacote manual.",
        pacoteFallback: fallback,
      };
    }

    return {
      platform: connection.platform,
      status: "enviado",
      mensagem: "Produto preparado e enviado para aprovacao.",
    };
  } catch (error) {
    const fallback = createFallbackPackage(sanitized);
    return {
      platform: connection.platform,
      status: "fallback",
      mensagem: error instanceof Error ? error.message : "Falha no envio.",
      pacoteFallback: fallback,
    };
  }
};
