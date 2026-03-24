export type Canal = "Instagram" | "YouTube" | "TikTok";

export const publicarConteudo = (dados: Record<string, unknown>, canais: Canal[]) => {
  canais.forEach((canal) => {
    console.log(`Publicado no ${canal}`, { dados });
  });
  return canais.map((canal) => ({ canal, status: "ok" }));
};
