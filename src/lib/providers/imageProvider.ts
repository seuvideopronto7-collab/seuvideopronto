import type { Provider, ImageGenInput, ImageGenOutput, ProviderResult } from "./types";

/**
 * Fallback: usa a imagem de referência do usuário ou placeholder
 */
const fallbackImageProvider: Provider<ImageGenInput, ImageGenOutput> = {
  name: "fallback",
  async generate(input): Promise<ProviderResult<ImageGenOutput>> {
    const imageUrl = input.referenceImageUrl || "/placeholder.svg";
    return { ok: true, data: { imageUrl }, provider: "fallback" };
  },
};

/**
 * Gemini image gen via Lovable AI Gateway (futuro)
 */
const geminiImageProvider: Provider<ImageGenInput, ImageGenOutput> = {
  name: "gemini",
  async generate(input): Promise<ProviderResult<ImageGenOutput>> {
    // TODO: Implementar via Lovable AI Gateway
    // Por enquanto, fallback
    return fallbackImageProvider.generate(input);
  },
};

/**
 * Image provider com fallback automático
 */
export const imageProvider: Provider<ImageGenInput, ImageGenOutput> = {
  name: "image-with-fallback",
  async generate(input): Promise<ProviderResult<ImageGenOutput>> {
    const result = await geminiImageProvider.generate(input);
    if (result.ok) return result;

    console.warn("[Image] Gemini falhou, usando fallback:", result.error);
    return fallbackImageProvider.generate(input);
  },
};

export { fallbackImageProvider, geminiImageProvider };
