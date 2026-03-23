import { supabase } from "@/integrations/supabase/client";

export type SocialNetwork = "instagram" | "tiktok" | "facebook" | "youtube";

export type SocialContent = {
  video_url: string;
  legenda: string;
  hashtags: string[];
  thumbnail_url?: string;
  titulo?: string;
};

export type SocialResult = {
  nome: SocialNetwork;
  status: "sucesso" | "erro";
  link: string | null;
  erro?: string;
};

export type SocialProgress = {
  nome: SocialNetwork;
  status: "enviando" | "sucesso" | "erro";
  link?: string | null;
  erro?: string;
};

const invokePost = async (endpoint: string, conteudo: SocialContent) => {
  const { data, error } = await supabase.functions.invoke(endpoint, {
    body: { conteudo },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as { url?: string };
};

export const postarInstagram = (conteudo: SocialContent) => invokePost("instagram-post", conteudo);
export const postarTikTok = (conteudo: SocialContent) => invokePost("tiktok-post", conteudo);
export const postarFacebook = (conteudo: SocialContent) => invokePost("facebook-post", conteudo);
export const postarYouTube = (conteudo: SocialContent) => invokePost("youtube-upload", conteudo);

export const publicarRedesSociais = async (
  conteudo: SocialContent,
  redes: SocialNetwork[],
  onProgress?: (progress: SocialProgress) => void,
) => {
  const resultados: SocialResult[] = [];

  for (const rede of redes) {
    try {
      onProgress?.({ nome: rede, status: "enviando" });

      let response: { url?: string } | undefined;

      switch (rede) {
        case "instagram":
          response = await postarInstagram(conteudo);
          break;
        case "tiktok":
          response = await postarTikTok(conteudo);
          break;
        case "facebook":
          response = await postarFacebook(conteudo);
          break;
        case "youtube":
          response = await postarYouTube(conteudo);
          break;
      }

      const link = response?.url || null;
      resultados.push({ nome: rede, status: "sucesso", link });
      onProgress?.({ nome: rede, status: "sucesso", link });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao publicar.";
      resultados.push({ nome: rede, status: "erro", link: null, erro: message });
      onProgress?.({ nome: rede, status: "erro", erro: message, link: null });
    }
  }

  return resultados;
};
