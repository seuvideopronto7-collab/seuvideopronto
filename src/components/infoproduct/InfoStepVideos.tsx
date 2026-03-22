import { Button } from "@/components/ui/button";
import { Video, User, Mic, Subtitles } from "lucide-react";
import { useState } from "react";

interface Props {
  onContinue: () => void;
}

const estilos = [
  { id: "professor", label: "Professor", icon: "🎓", desc: "Tom didático e acolhedor" },
  { id: "especialista", label: "Especialista", icon: "🧠", desc: "Tom técnico e confiante" },
  { id: "mentor", label: "Mentor", icon: "🤝", desc: "Tom próximo e motivador" },
  { id: "influenciador", label: "Influenciador", icon: "🔥", desc: "Tom dinâmico e envolvente" },
];

const InfoStepVideos = ({ onContinue }: Props) => {
  const [estilo, setEstilo] = useState<string | null>(null);

  return (
    <div className="glass-card p-6 space-y-5 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <Video className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-bold">Aulas em Vídeo com IA</h3>
          <p className="text-xs text-muted-foreground">Escolha o estilo do apresentador</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {estilos.map((e) => (
          <button
            key={e.id}
            onClick={() => setEstilo(e.id)}
            className={`p-4 rounded-xl border transition-all text-left ${
              estilo === e.id
                ? "border-primary bg-primary/10 neon-glow"
                : "border-border/50 bg-muted/20 hover:bg-muted/40"
            }`}
          >
            <span className="text-2xl">{e.icon}</span>
            <p className="font-semibold text-sm mt-2">{e.label}</p>
            <p className="text-xs text-muted-foreground">{e.desc}</p>
          </button>
        ))}
      </div>

      <div className="bg-muted/30 rounded-xl p-4 border border-border/30 space-y-3">
        <p className="text-sm font-semibold">🎬 O que será gerado:</p>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="w-4 h-4" /> Apresentador virtual IA
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mic className="w-4 h-4" /> Narração realista
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Video className="w-4 h-4" /> Slides automáticos
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Subtitles className="w-4 h-4" /> Legendas sincronizadas
          </div>
        </div>
      </div>

      <div className="bg-accent/10 border border-accent/30 rounded-xl p-4 text-center">
        <p className="text-sm text-accent font-medium">🔜 Em breve</p>
        <p className="text-xs text-muted-foreground mt-1">
          A geração de vídeos com apresentador IA estará disponível nas próximas atualizações.
          Por enquanto, os roteiros das aulas estão prontos para gravação.
        </p>
      </div>

      <Button variant="viral" size="lg" className="w-full" onClick={onContinue}>
        🎯 GERAR VSL
      </Button>
    </div>
  );
};

export default InfoStepVideos;
