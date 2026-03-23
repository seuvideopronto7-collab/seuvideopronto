import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Video, User, Mic, Subtitles, Play, Clock, CheckCircle2, Sparkles } from "lucide-react";
import { useState, useEffect, useCallback } from "react";

interface Props {
  onContinue: () => void;
}

const estilos = [
  { id: "professor", label: "Professor", icon: "🎓", desc: "Tom didático e acolhedor", avatar: "👨‍🏫" },
  { id: "especialista", label: "Especialista", icon: "🧠", desc: "Tom técnico e confiante", avatar: "👨‍💼" },
  { id: "mentor", label: "Mentor", icon: "🤝", desc: "Tom próximo e motivador", avatar: "🧔" },
  { id: "influenciador", label: "Influenciador", icon: "🔥", desc: "Tom dinâmico e envolvente", avatar: "😎" },
];

const aulasSimuladas = [
  { titulo: "Aula 01 — Introdução e Boas-vindas", duracao: "03:45" },
  { titulo: "Aula 02 — Fundamentos Essenciais", duracao: "07:12" },
  { titulo: "Aula 03 — Estratégia Prática", duracao: "05:30" },
  { titulo: "Aula 04 — Estudo de Caso Real", duracao: "06:18" },
  { titulo: "Aula 05 — Plano de Ação Final", duracao: "04:55" },
];

const etapasProcessamento = [
  "Gerando roteiro...",
  "Criando slides...",
  "Preparando apresentador IA...",
  "Renderizando vídeo...",
  "Vídeo pronto ✅",
];

const InfoStepVideos = ({ onContinue }: Props) => {
  const [estilo, setEstilo] = useState<string | null>(null);
  const [gerando, setGerando] = useState(false);
  const [etapaAtual, setEtapaAtual] = useState(0);
  const [progresso, setProgresso] = useState(0);
  const [concluido, setConcluido] = useState(false);
  const [playerAberto, setPlayerAberto] = useState(false);
  const [aulaAtiva, setAulaAtiva] = useState<number | null>(null);

  const estiloSelecionado = estilos.find((e) => e.id === estilo);

  const simularGeracao = useCallback(() => {
    setGerando(true);
    setEtapaAtual(0);
    setProgresso(0);
    setConcluido(false);

    let step = 0;
    const totalSteps = etapasProcessamento.length;
    const interval = setInterval(() => {
      step++;
      const pct = Math.min((step / totalSteps) * 100, 100);
      setProgresso(pct);
      setEtapaAtual(Math.min(step, totalSteps - 1));

      if (step >= totalSteps) {
        clearInterval(interval);
        setTimeout(() => {
          setGerando(false);
          setConcluido(true);
        }, 600);
      }
    }, 1200);
  }, []);

  const abrirPlayer = (index: number) => {
    setAulaAtiva(index);
    setPlayerAberto(true);
  };

  return (
    <div className="glass-card p-6 space-y-5 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <Video className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-bold">Aulas em Vídeo com IA</h3>
          <p className="text-xs text-muted-foreground">Escolha o estilo e gere suas videoaulas</p>
        </div>
      </div>

      {/* Seleção de estilo */}
      <div className="grid grid-cols-2 gap-3">
        {estilos.map((e) => (
          <button
            key={e.id}
            onClick={() => setEstilo(e.id)}
            className={`p-4 rounded-xl border transition-all text-left relative overflow-hidden ${
              estilo === e.id
                ? "border-primary bg-primary/10 neon-glow"
                : "border-border/50 bg-muted/20 hover:bg-muted/40"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-3xl">{e.avatar}</span>
              <div>
                <p className="font-semibold text-sm">{e.icon} {e.label}</p>
                <p className="text-xs text-muted-foreground">{e.desc}</p>
              </div>
            </div>
            {estilo === e.id && (
              <div className="absolute top-2 right-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* O que será gerado */}
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

      {/* Processing state */}
      {gerando && (
        <div className="bg-card/80 border border-primary/30 rounded-xl p-5 space-y-4 animate-in fade-in">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary animate-pulse" />
            <p className="text-sm font-semibold text-primary">
              {etapasProcessamento[etapaAtual]}
            </p>
          </div>
          <Progress value={progresso} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Processando {aulasSimuladas.length} aulas</span>
            <span>{Math.round(progresso)}%</span>
          </div>
        </div>
      )}

      {/* Video list - shown after generation */}
      {concluido && (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-5 h-5 text-accent" />
            <p className="text-sm font-bold text-accent">
              {aulasSimuladas.length} videoaulas geradas com sucesso!
            </p>
          </div>

          <div className="space-y-2">
            {aulasSimuladas.map((aula, i) => (
              <button
                key={i}
                onClick={() => abrirPlayer(i)}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/30 hover:bg-muted/50 hover:border-primary/30 transition-all text-left group"
              >
                <div className="w-16 h-10 rounded-lg bg-gradient-to-br from-primary/30 to-accent/20 flex items-center justify-center flex-shrink-0 group-hover:from-primary/50 group-hover:to-accent/40 transition-all">
                  <Play className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{aula.titulo}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>{aula.duracao}</span>
                    <span>•</span>
                    <span>{estiloSelecionado?.label || "Apresentador IA"}</span>
                  </div>
                </div>
                <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Impact phrase */}
      {estilo && !gerando && !concluido && (
        <p className="text-center text-sm text-muted-foreground italic animate-in fade-in">
          ✨ Seu curso será transformado em aulas com apresentador IA
        </p>
      )}

      {concluido && (
        <p className="text-center text-sm font-medium text-accent animate-in fade-in">
          🎯 Seu curso já está sendo transformado em aulas com apresentador IA
        </p>
      )}

      {/* Buttons */}
      {!concluido ? (
        <Button
          variant="viral"
          size="lg"
          className="w-full"
          onClick={simularGeracao}
          disabled={!estilo || gerando}
        >
          {gerando ? "⏳ Gerando videoaulas..." : "🎬 GERAR AULAS EM VÍDEO"}
        </Button>
      ) : (
        <Button variant="viral" size="lg" className="w-full" onClick={onContinue}>
          🎯 GERAR VSL
        </Button>
      )}

      {/* Player Modal */}
      <Dialog open={playerAberto} onOpenChange={setPlayerAberto}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">
              {aulaAtiva !== null ? aulasSimuladas[aulaAtiva].titulo : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Fake player */}
            <div className="aspect-video rounded-xl bg-gradient-to-br from-background via-muted to-background border border-border/50 flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.08)_0%,transparent_70%)]" />
              <span className="text-6xl mb-3">{estiloSelecionado?.avatar || "👨‍🏫"}</span>
              <p className="text-sm font-semibold">{estiloSelecionado?.label || "Apresentador IA"}</p>
              <div className="absolute bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm p-3 border-t border-border/30">
                <p className="text-xs text-center text-muted-foreground italic">
                  "Bem-vindo à aula! Hoje vamos explorar os fundamentos que vão transformar seus resultados..."
                </p>
              </div>
            </div>
            {/* Info */}
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{aulaAtiva !== null ? aulasSimuladas[aulaAtiva].duracao : ""}</span>
              </div>
              <div className="flex items-center gap-2">
                <Subtitles className="w-4 h-4" />
                <span>Legendas PT-BR</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InfoStepVideos;
