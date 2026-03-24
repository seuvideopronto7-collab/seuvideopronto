export const responderUsuario = (pergunta: string): string => {
  const base = pergunta ? pergunta.trim() : "";
  return [
    `Ideia clara: ${base || "sua oferta"}.`,
    "Proposta direta, sem ruido.",
    "Pronto para converter agora."
  ].join("\n");
};
