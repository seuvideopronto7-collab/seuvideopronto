export function buildCinematicPrompt(
  productType: string,
  style: string,
  useDarkflow = false,
  useViral = false,
  modePro = false,
) {
  const base =
    "Cinematic product video, dramatic lighting, luxury commercial, slow motion, particles, glow effects, depth of field, high contrast, 4K, premium advertising. Progressive zoom, light parallax, floating particles, dynamic lighting, hero product framing, polished shadows.";

  const byType: Record<string, string> = {
    natural: "Natural supplement product, botanical cues, healthy vitality, trust and purity.",
    suplemento: "Premium supplement bottle, performance, energy, confidence, high-conversion commercial look.",
    cosmetico: "Beauty product, clean luxury skincare ad, soft highlights, refined elegance.",
    tecnologia: "Futuristic product reveal, sharp reflections, sleek surfaces, innovation-driven mood.",
    outro: "Premium product reveal with commercial-grade realism and emotional appeal.",
  };

  const byStyle: Record<string, string> = {
    luxo: "Golden highlights, black background, prestige and exclusivity.",
    fitness: "Power, motion, dynamic energy, bold contrast and drive.",
    saude: "Clean authority, wellbeing, clarity, trust, premium clinical feel.",
    tecnologia: "Neon accents, precision, futuristic premium mood.",
  };

  const darkflow = useDarkflow
    ? "Darkflow mode: dramatic shadows, suspense, stronger cinematic tension, dramatic contrast."
    : "";

  const viral = useViral
    ? "Viral cut awareness: first seconds must feel punchy, immediate hook, faster pacing, stronger visual impact."
    : "";

  const pro = modePro
    ? "PRO mode: add storytelling beats, simulated scenes, intensified visual effects, aggressive CTA energy. Style reference: Apple + Nike + TikTok Ads."
    : "";

  const typeKey = productType?.toLowerCase() || "outro";
  const styleKey = style?.toLowerCase() || "";

  return [base, byType[typeKey] ?? byType.outro, byStyle[styleKey], darkflow, viral, pro]
    .filter(Boolean)
    .join(" ");
}
