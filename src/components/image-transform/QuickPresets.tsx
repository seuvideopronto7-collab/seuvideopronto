import type { TransformationType } from "./ImageTransformModule";
import { ShoppingBag, Crown, Share2, Megaphone, Target, Image } from "lucide-react";

interface Preset {
  label: string;
  type: TransformationType;
  style: string;
  icon: React.ReactNode;
}

const presets: Preset[] = [
  { label: "Produto Matador", type: "produto", style: "luxury e-commerce", icon: <ShoppingBag className="w-5 h-5" /> },
  { label: "Autoridade Cinematográfica", type: "autoridade", style: "executive premium", icon: <Crown className="w-5 h-5" /> },
  { label: "Social Viral", type: "social", style: "instagramável premium", icon: <Share2 className="w-5 h-5" /> },
  { label: "Campanha Premium", type: "campanha", style: "launch campaign", icon: <Megaphone className="w-5 h-5" /> },
  { label: "Criativo p/ Tráfego", type: "campanha", style: "paid traffic creative", icon: <Target className="w-5 h-5" /> },
  { label: "Thumb de Alto Clique", type: "campanha", style: "high-CTR thumbnail", icon: <Image className="w-5 h-5" /> },
];

interface QuickPresetsProps {
  activeType: TransformationType;
  activeStyle: string;
  onSelect: (type: TransformationType, style: string) => void;
}

export function QuickPresets({ activeType, activeStyle, onSelect }: QuickPresetsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {presets.map((p) => {
        const active = activeType === p.type && activeStyle === p.style;
        return (
          <button
            key={p.label}
            onClick={() => onSelect(p.type, p.style)}
            className={`
              flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-all duration-300 hover:scale-[1.03]
              ${active
                ? "border-primary bg-primary/10 shadow-[0_0_20px_-5px_hsl(var(--primary)/0.4)]"
                : "border-border/30 bg-card/60 hover:border-primary/40 hover:bg-card/80"}
            `}
          >
            <div className={`rounded-xl p-2 ${active ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
              {p.icon}
            </div>
            <span className="text-xs font-medium leading-tight">{p.label}</span>
          </button>
        );
      })}
    </div>
  );
}
