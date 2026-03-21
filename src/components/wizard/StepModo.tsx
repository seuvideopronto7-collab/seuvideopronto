import { Button } from "@/components/ui/button";
import { ShoppingCart, Flame, Award } from "lucide-react";

interface StepModoProps {
  selected: string | null;
  onSelect: (mode: string) => void;
  onGenerate: () => void;
  isLoading: boolean;
}

const modes = [
  {
    id: "vendas",
    icon: ShoppingCart,
    label: "Vídeo de Vendas",
    desc: "Foco em conversão, CTA agressivo, urgência e escassez. Ideal para lançamentos e ofertas.",
    color: "text-neon-pink",
  },
  {
    id: "viral",
    icon: Flame,
    label: "Vídeo Viral",
    desc: "Hook irresistível, emoção intensa, loop perfeito. Máximo alcance orgânico.",
    color: "text-neon-yellow",
  },
  {
    id: "autoridade",
    icon: Award,
    label: "Vídeo Autoridade",
    desc: "Educativo e profissional. Posiciona como expert e referência no nicho.",
    color: "text-neon-cyan",
  },
];

const StepModo = ({ selected, onSelect, onGenerate, isLoading }: StepModoProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-1">Escolha o Modo de Geração</h2>
        <p className="text-sm text-muted-foreground">Selecione o estilo do seu vídeo</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {modes.map((mode) => (
          <button
            key={mode.id}
            onClick={() => onSelect(mode.id)}
            className={`
              glass-card p-6 text-left transition-all duration-200 hover:scale-[1.02]
              ${selected === mode.id
                ? "ring-2 ring-primary shadow-[0_0_25px_-5px_hsl(var(--primary)/0.4)]"
                : ""
              }
            `}
          >
            <mode.icon className={`w-8 h-8 mb-3 ${mode.color}`} />
            <p className="font-semibold mb-2">{mode.label}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{mode.desc}</p>
          </button>
        ))}
      </div>

      <Button variant="viral" size="lg" disabled={!selected || isLoading} onClick={onGenerate} className="w-full sm:w-auto">
        {isLoading ? "Gerando..." : "Gerar Roteiro →"}
      </Button>
    </div>
  );
};

export default StepModo;
