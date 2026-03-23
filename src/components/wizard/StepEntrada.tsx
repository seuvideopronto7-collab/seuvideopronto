import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, ImageIcon, FileVideo, FileAudio, Link2 } from "lucide-react";
import InputManualScreen, { type ManualInputData } from "./InputManualScreen";

export type EntryType = "manual" | "image" | "video" | "audio" | "link" | "reference";

interface StepEntradaProps {
  selected: EntryType | null;
  onSelect: (type: EntryType) => void;
  onContinue: () => void;
  onFileSelected?: (file: File) => void;
  onManualSubmit: (data: ManualInputData) => void;
}

const acceptMap: Record<string, string> = {
  image: "image/*",
  video: "video/*",
  audio: "audio/*",
};

const options: { type: EntryType; icon: any; label: string; desc: string }[] = [
  { type: "manual", icon: FileText, label: "Inserir Dados Manualmente", desc: "Preencha informações do produto" },
  { type: "image", icon: ImageIcon, label: "Subir Imagem", desc: "Envie uma imagem para análise" },
  { type: "video", icon: FileVideo, label: "Subir Vídeo", desc: "Envie um vídeo para recriar" },
  { type: "audio", icon: FileAudio, label: "Subir Áudio", desc: "Envie um áudio para análise" },
  { type: "link", icon: Link2, label: "Colar Link de Vídeo", desc: "YouTube, TikTok ou Instagram" },
  { type: "reference", icon: Link2, label: "Colar Link de Referência", desc: "Produto ou página de oferta" },
];

const StepEntrada = ({ selected, onSelect, onContinue, onFileSelected, onManualSubmit }: StepEntradaProps) => {
  const [manualOpen, setManualOpen] = useState(false);
  const imageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);

  const refMap: Record<string, React.RefObject<HTMLInputElement>> = {
    image: imageRef,
    video: videoRef,
    audio: audioRef,
  };

  const handleClick = (type: EntryType) => {
    if (type === "manual") {
      onSelect(type);
      setManualOpen(true);
      return;
    }
    onSelect(type);
    if (type === "image" || type === "video" || type === "audio") {
      refMap[type]?.current?.click();
    }
  };

  const handleFileChange = (type: EntryType) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    onSelect(type);
    onFileSelected?.(f);
    onContinue();
  };

  return (
    <div className="space-y-6">
      <InputManualScreen
        open={manualOpen}
        onOpenChange={setManualOpen}
        onSubmit={onManualSubmit}
      />
      <div>
        <h2 className="text-xl font-bold mb-1">Escolha o tipo de entrada</h2>
        <p className="text-sm text-muted-foreground">Como você quer começar?</p>
      </div>

      {/* Hidden file inputs */}
      <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange("image")} />
      <input ref={videoRef} type="file" accept="video/*" className="hidden" onChange={handleFileChange("video")} />
      <input ref={audioRef} type="file" accept="audio/*" className="hidden" onChange={handleFileChange("audio")} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {options.map((opt) => (
          <button
            key={opt.type}
            onClick={() => handleClick(opt.type)}
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

      {selected !== "manual" && (
        <Button variant="neon" size="lg" disabled={!selected} onClick={onContinue} className="w-full sm:w-auto">
          Continuar →
        </Button>
      )}
    </div>
  );
};

export default StepEntrada;
