import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Loader2, Sparkles } from "lucide-react";
import type { TransformConfig, TransformationType, OutputFormat } from "./ImageTransformModule";

interface TransformFormProps {
  config: TransformConfig;
  onChange: (c: TransformConfig) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  progress: number;
  hasImage: boolean;
}

const typeOptions: { value: TransformationType; label: string }[] = [
  { value: "produto", label: "Produto Comercial" },
  { value: "autoridade", label: "Autoridade / Retrato" },
  { value: "social", label: "Social / Lifestyle" },
  { value: "campanha", label: "Campanha / Anúncio" },
];

const formatOptions: { value: OutputFormat; label: string }[] = [
  { value: "1080x1350", label: "Feed Retrato (1080×1350)" },
  { value: "1080x1080", label: "Feed Quadrado (1080×1080)" },
  { value: "1080x1920", label: "Story / Reels / TikTok (1080×1920)" },
  { value: "1920x1080", label: "Horizontal / Thumb (1920×1080)" },
];

const stylesByType: Record<TransformationType, string[]> = {
  produto: ["luxury e-commerce", "clean minimalist", "oferta impactante", "lançamento premium", "vitrine neon", "tráfego pago"],
  autoridade: ["executive premium", "mentor inspiracional", "influenciador", "fundador tech", "marca pessoal", "social de autoridade"],
  social: ["instagramável premium", "lifestyle casual", "networking elite", "bastidor profissional", "casual premium", "influência digital"],
  campanha: ["launch campaign", "paid traffic creative", "high-CTR thumbnail", "brand awareness", "retargeting visual", "viral hook"],
};

export function TransformForm({ config, onChange, onGenerate, isGenerating, progress, hasImage }: TransformFormProps) {
  const set = <K extends keyof TransformConfig>(key: K, val: TransformConfig[K]) =>
    onChange({ ...config, [key]: val });

  return (
    <div className="rounded-2xl border border-border/20 bg-gradient-to-br from-card to-background p-6 space-y-6">
      <h2 className="text-lg font-semibold">3. Configure a transformação</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Type */}
        <div className="space-y-2">
          <Label>Tipo de transformação</Label>
          <Select value={config.type} onValueChange={(v) => set("type", v as TransformationType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {typeOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Style */}
        <div className="space-y-2">
          <Label>Estilo visual</Label>
          <Select value={config.style} onValueChange={(v) => set("style", v)}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {stylesByType[config.type].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Format */}
        <div className="space-y-2">
          <Label>Formato de saída</Label>
          <Select value={config.format} onValueChange={(v) => set("format", v as OutputFormat)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {formatOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Objective */}
        <div className="space-y-2">
          <Label>Objetivo da campanha</Label>
          <Input placeholder="Ex: vendas, awareness, engajamento" value={config.objective} onChange={(e) => set("objective", e.target.value)} />
        </div>

        {/* Niche */}
        <div className="space-y-2">
          <Label>Nicho</Label>
          <Input placeholder="Ex: fitness, tech, beleza" value={config.niche} onChange={(e) => set("niche", e.target.value)} />
        </div>

        {/* Audience */}
        <div className="space-y-2">
          <Label>Público-alvo</Label>
          <Input placeholder="Ex: empreendedores, mulheres 25-40" value={config.audience} onChange={(e) => set("audience", e.target.value)} />
        </div>

        {/* Tone */}
        <div className="space-y-2">
          <Label>Tom da copy</Label>
          <Input placeholder="Ex: urgente, aspiracional" value={config.tone} onChange={(e) => set("tone", e.target.value)} />
        </div>

        {/* Variations */}
        <div className="space-y-2">
          <Label>Quantidade de variações</Label>
          <div className="flex gap-2">
            {[1, 3, 5, 10].map((n) => (
              <button
                key={n}
                onClick={() => set("variations", n)}
                className={`flex-1 rounded-xl border py-2 text-sm font-bold transition-all ${
                  config.variations === n
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/30 text-muted-foreground hover:border-primary/40"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Text overlay */}
      <div className="space-y-4 rounded-xl border border-border/20 bg-card/40 p-4">
        <div className="flex items-center justify-between">
          <Label>Adicionar texto na imagem</Label>
          <Switch checked={config.withText} onCheckedChange={(v) => set("withText", v)} />
        </div>

        {config.withText && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Headline</Label>
              <Input placeholder="Ex: Oferta exclusiva" value={config.headline} onChange={(e) => set("headline", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Subtítulo</Label>
              <Input placeholder="Ex: Últimas unidades" value={config.subtitle} onChange={(e) => set("subtitle", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">CTA</Label>
              <Input placeholder="Ex: Compre Agora" value={config.cta} onChange={(e) => set("cta", e.target.value)} />
            </div>
          </div>
        )}
      </div>

      {/* Generate */}
      {isGenerating && (
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">Gerando variação {Math.ceil((progress / 100) * config.variations)} de {config.variations}...</p>
        </div>
      )}

      <Button
        variant="viral"
        size="lg"
        className="w-full sm:w-auto"
        disabled={!hasImage || isGenerating}
        onClick={onGenerate}
      >
        {isGenerating ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</>
        ) : (
          <><Sparkles className="w-4 h-4" /> Gerar {config.variations} Variação(ões)</>
        )}
      </Button>
    </div>
  );
}
