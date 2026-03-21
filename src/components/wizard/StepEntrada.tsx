import { Button } from "@/components/ui/button";
import { FileText, ImageIcon, FileVideo, FileAudio, Link2 } from "lucide-react";

export type EntryType = "manual" | "image" | "video" | "audio" | "link";

interface StepEntradaProps {
  selected: EntryType | null;
  onSelect: (type: EntryType) => void;
  onContinue: () => void;
}

const options: { type: EntryType; icon: any; label: string; desc: string }[] = [
  { type: "manual", icon: FileText, label: "Inserir Dados Manualmente", desc: "Preencha informações do produto" },
  { type: "image", icon: ImageIcon, label: "Subir Imagem", desc: "Envie uma imagem para análise" },
  { type: "video", icon: FileVideo, label: "Subir Vídeo", desc: "Envie um vídeo para recriar" },
  { type: "audio", icon: FileAudio, label: "Subir Áudio", desc: "Envie um áudio para análise" },
  { type: "link", icon: Link2, label: "Colar Link de Vídeo", desc: "YouTube, TikTok ou Instagram" },
];

const StepEntrada = ({ selected, onSelect, onContinue }: StepEntradaProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-1">Escolha o tipo de entrada</h2>
        <p className="text-sm text-muted-foreground">Como você quer começar?</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {options.map((opt) => (
          <button
            key={opt.type}
            onClick={() => onSelect(opt.type)}
            className={`
              glass-card p-5 text-left transition-all duration-200 hover:scale-[1.02]
              ${selected === opt.type
                ? "ring-2 ring-primary shadow-[0_0_20px_-5px_hsl(var(--primary)/0.4)]"
                : "hover:border-border"
              }
            `}
          >
            <opt.icon className={`w-6 h-6 mb-3 ${selected === opt.type ? "text-primary" : "text-muted-foreground"}`} />
            <p className="font-medium text-sm">{opt.label}</p>
            <p className="text-xs text-muted-foreground mt-1">{opt.desc}</p>
          </button>
        ))}
      </div>

      <Button variant="neon" size="lg" disabled={!selected} onClick={onContinue} className="w-full sm:w-auto">
        Continuar →
      </Button>
    </div>
  );
};

export default StepEntrada;
