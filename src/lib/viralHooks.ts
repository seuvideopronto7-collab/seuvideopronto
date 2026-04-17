// Hooks virais para multiplicar variações (Modo Viral 10x)
export const VIRAL_HOOKS: string[] = [
  "Pare tudo e veja isso...",
  "Você está errando nisso...",
  "Isso pode mudar sua vida...",
  "Ninguém te contou isso...",
  "O segredo escondido que poucos sabem...",
  "Faça isso antes de dormir hoje...",
  "Isso está viralizando agora...",
  "Cuidado com isso...",
  "Veja antes que apague...",
  "Última chance: leia até o fim...",
];

export const buildViralVariations = (script: string, count: number): string[] => {
  const total = Math.max(1, Math.min(count, VIRAL_HOOKS.length));
  return Array.from({ length: total }, (_, i) => `${VIRAL_HOOKS[i]} ${script}`);
};
