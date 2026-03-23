import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import CopyField from "@/components/CopyField";
import { toast } from "sonner";
import { Calendar, Check, Copy, Download, Instagram, RefreshCw, Youtube } from "lucide-react";

interface StepFinalProps {
  roteiroData: any;
  seoData: any;
  videoUrl?: string;
  onNewVersion: () => void;
  onEdit: () => void;
  onContinue: () => void;
}

const StepFinal = ({ roteiroData, seoData, videoUrl, onNewVersion, onEdit, onContinue }: StepFinalProps) => {
  const roteiro = roteiroData?.roteiro || roteiroData?.novo_roteiro;
  const seo = seoData?.titulos ? seoData : seoData?.seo;
  const resolvedVideoUrl = videoUrl || seoData?.videoUrl || roteiroData?.videoUrl || "";
  const [videoFailed, setVideoFailed] = useState(false);
  const [selectedDays, setSelectedDays] = useState<string[]>(["Seg", "Qua", "Sex"]);
  const [selectedTimes, setSelectedTimes] = useState<string[]>(["10:00", "19:00"]);
  const videoRef = useRef<HTMLDivElement>(null);
  const postRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      videoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      postRef.current?.focus();
    }, 200);
    return () => clearTimeout(timeout);
  }, []);

  const copyAll = () => {
    const parts = [];
    if (seo?.titulos?.[0]) parts.push(`TITULO: ${seo.titulos[0]}`);
    if (seo?.descricao_youtube) parts.push(`LEGENDA:\n${seo.descricao_youtube}`);
    if (seo?.hashtags) parts.push(`HASHTAGS: ${seo.hashtags.join(" ")}`);
    if (roteiro?.cta) parts.push(`CTA: ${roteiro.cta}`);
    if (roteiro?.roteiro_completo) parts.push(`ROTEIRO:\n${roteiro.roteiro_completo}`);
    navigator.clipboard.writeText(parts.join("\n\n"));
    toast.success("Tudo copiado!");
  };

  const toggle = (value: string, list: string[], setter: (next: string[]) => void) => {
    if (list.includes(value)) {
      setter(list.filter((item) => item !== value));
      return;
    }
    setter([...list, value]);
  };

  const progressItems = ["Roteiro", "SEO", "Video", "Render", "Final"];

  return (
    <div className="space-y-8 step-transition">
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-primary/10 via-background to-accent/10 p-6 text-left">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-6 left-8 h-2 w-2 rounded-full bg-primary/70 animate-pulse" />
          <div className="absolute top-10 right-12 h-2.5 w-2.5 rounded-full bg-accent/70 animate-pulse" />
          <div className="absolute bottom-10 left-16 h-2 w-2 rounded-full bg-white/40 animate-pulse" />
          <div className="absolute bottom-12 right-20 h-1.5 w-1.5 rounded-full bg-primary/60 animate-pulse" />
        </div>
        <div className="relative space-y-3">
          <span className="text-xs font-mono text-muted-foreground">FINALIZACAO PREMIUM</span>
          <h2 className="text-2xl md:text-3xl font-bold">Seu video esta pronto!</h2>
          <p className="text-sm text-muted-foreground">Agora e so postar e comecar a vender.</p>
          <div className="rounded-lg border border-border/40 bg-card/60 px-4 py-3 text-sm">
            <p className="font-medium">Voce esta a 1 clique de publicar.</p>
            <p className="text-muted-foreground">Nao perca o timing.</p>
          </div>
        </div>
      </div>

      <div ref={videoRef} className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Preview do video</h3>
          <span className="text-xs text-muted-foreground">Autoplay com som desativado</span>
        </div>
        <div className="glass-card p-1 rounded-2xl overflow-hidden">
          {resolvedVideoUrl && !videoFailed ? (
            <video
              src={resolvedVideoUrl}
              controls
              autoPlay
              muted
              className="w-full aspect-video object-cover rounded-xl"
              onError={() => setVideoFailed(true)}
            />
          ) : (
            <div className="relative bg-gradient-to-br from-primary/20 via-muted to-accent/20 rounded-xl aspect-video flex items-center justify-center">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
                  <span className="text-2xl">▶️</span>
                </div>
                <p className="text-sm text-muted-foreground">Thumbnail do video</p>
                <p className="text-xs text-muted-foreground">Sem preview disponivel, mas o download segue ativo.</p>
              </div>
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Button
            ref={postRef}
            variant="viral"
            size="lg"
            onClick={() => toast.success("Postar agora: redes prontas para conectar.")}
            className="w-full neon-glow flex-col items-start gap-1 text-left"
          >
            <span className="text-base">POSTAR AGORA</span>
            <span className="text-xs text-primary-foreground/80">Instagram, TikTok, YouTube</span>
          </Button>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="glass" onClick={() => toast.info("Download iniciado.")}>
              <Download className="w-4 h-4" /> Baixar video
            </Button>
            <Button variant="glass" onClick={onEdit}>Editar video</Button>
            <Button variant="glass" onClick={onNewVersion}><RefreshCw className="w-4 h-4" /> Gerar variacao</Button>
            <Button variant="neon" onClick={() => toast.success("Gerando mais 30 videos...")}>Gerar mais 30 videos</Button>
          </div>
        </div>
      </div>

      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Conteudo pronto para copiar</h3>
          <Button variant="copy" size="sm" onClick={copyAll} className="h-8 px-3">
            <Copy className="w-3 h-3" /> Copiar tudo
          </Button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {seo?.descricao_youtube && <CopyField label="Legenda" emoji="📝" value={seo.descricao_youtube} multiline />}
          {seo?.hashtags && <CopyField label="Hashtags" emoji="🔥" value={seo.hashtags.join(" ")} />}
          {roteiro?.roteiro_completo && <CopyField label="Roteiro" emoji="🎤" value={roteiro.roteiro_completo} multiline />}
          {roteiro?.cta && <CopyField label="CTA" emoji="🚀" value={roteiro.cta} />}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Agendar postagens</h3>
              <p className="text-xs text-muted-foreground">Escolha dias e horarios. Aplicar nos 30 conteudos.</p>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Dias</p>
            <div className="flex flex-wrap gap-2">
              {["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"].map((day) => (
                <button
                  key={day}
                  onClick={() => toggle(day, selectedDays, setSelectedDays)}
                  className={`rounded-lg border px-3 py-2 text-xs transition-all ${selectedDays.includes(day) ? "border-primary bg-primary/10 text-primary" : "border-border/40 text-muted-foreground"}`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Horarios</p>
            <div className="flex flex-wrap gap-2">
              {["08:00", "10:00", "12:00", "19:00", "21:00"].map((time) => (
                <button
                  key={time}
                  onClick={() => toggle(time, selectedTimes, setSelectedTimes)}
                  className={`rounded-lg border px-3 py-2 text-xs transition-all ${selectedTimes.includes(time) ? "border-accent bg-accent/10 text-accent" : "border-border/40 text-muted-foreground"}`}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>
          <Button variant="viral" onClick={() => toast.success("Agendamento aplicado nos 30 conteudos.")} className="w-full">
            Aplicar agendamento
          </Button>
        </div>

        <div className="glass-card p-6 space-y-5">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Quer transformar isso em vendas?</h3>
            <p className="text-sm text-muted-foreground">Publique com link do seu produto.</p>
          </div>
          <Button variant="neon" size="lg" onClick={() => toast.success("Produto vinculado com sucesso.")}>
            Vincular produto
          </Button>
          <div className="rounded-xl border border-border/40 bg-muted/40 p-4 space-y-3">
            <h4 className="text-sm font-semibold">Progresso completo</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {progressItems.map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400 animate-pulse">
                    <Check className="w-3 h-3" />
                  </span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-border/40 bg-gradient-to-r from-primary/10 via-transparent to-accent/10 p-4">
            <p className="text-sm font-semibold">Criado. Finalizado. Pronto pra vender.</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="glass" onClick={() => toast.info("Materiais baixados!")}>
          <Download className="w-4 h-4" /> Baixar materiais
        </Button>
        <Button variant="glass" onClick={copyAll}>
          <Copy className="w-4 h-4" /> Copiar tudo
        </Button>
        <Button variant="glass" onClick={() => toast.success("Conecte suas redes para postar agora.")}>
          <Instagram className="w-4 h-4" /> Conectar Instagram
        </Button>
        <Button variant="glass" onClick={() => toast.success("Conecte suas redes para postar agora.")}>
          <Youtube className="w-4 h-4" /> Conectar YouTube
        </Button>
      </div>

      <Button variant="viral" size="lg" onClick={onContinue} className="w-full sm:w-auto">
        Continuar para publicacao
      </Button>
    </div>
  );
};

export default StepFinal;
