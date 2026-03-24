export function buildCinematicPrompt(
  productType: string,
  style: string,
  useDarkflow = false,
  useViral = false,
) {
  const base =
    "Ultra cinematic commercial product shot, premium lighting, rich contrast, depth of field, elegant camera motion, product hero frame, luxury ad aesthetic, floating particles, premium glow, realistic reflections, polished shadows.";

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
    ? "Darkflow mode: dramatic shadows, purple undertones, more suspense, stronger cinematic tension."
    : "";

  const viral = useViral
    ? "Viral cut awareness: first seconds must feel punchy, immediate hook, stronger visual impact."
    : "";

  const typeKey = productType?.toLowerCase() || "outro";
  const styleKey = style?.toLowerCase() || "";

  return [base, byType[typeKey] ?? byType.outro, byStyle[styleKey], darkflow, viral].filter(Boolean).join(" ");
}
