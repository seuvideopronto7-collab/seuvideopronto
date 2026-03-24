export function buildScript(productType: string, style: string) {
  const hooks: Record<string, string> = {
    natural: "Seu corpo não precisa aceitar cansaço como rotina.",
    suplemento: "Alta performance começa naquilo que você entrega ao seu corpo.",
    cosmetico: "Sua pele merece mais do que um cuidado comum.",
    tecnologia: "Quando inovação encontra resultado, o padrão muda.",
    outro: "Um produto certo muda a percepção em segundos.",
  };

  const angle: Record<string, string> = {
    luxo: "Apresente o produto como premium, desejado e exclusivo.",
    fitness: "Enfatize energia, foco, desempenho e consistência.",
    saude: "Destaque confiança, bem-estar e rotina inteligente.",
    tecnologia: "Valorize inovação, precisão e sofisticação.",
  };

  return [
    hooks[productType] ?? hooks.outro,
    "Existe uma forma mais inteligente de transformar a sua rotina com presença, impacto e resultado.",
    angle[style] ?? angle.luxo,
    "Conheça agora a solução que une apresentação premium e percepção de valor desde o primeiro olhar.",
  ].join(" ");
}
