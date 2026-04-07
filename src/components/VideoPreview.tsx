import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Clock, Eye, Film, ChevronDown, ChevronUp } from "lucide-react";
import type { VideoTimeline, VideoScene } from "@/lib/videoPipeline";

interface VideoPreviewProps {
  timeline: VideoTimeline;
  onGenerateVideo?: () => void;
  isGenerating?: boolean;
}

const EmotionBadge = ({ emocao }: { emocao: string }) => {
  const colorMap: Record<string, string> = {
    curiosidade: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    tensão: "bg-red-500/20 text-red-400 border-red-500/30",
    solução: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    urgência: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${colorMap[emocao] || "bg-muted text-muted-foreground border-border"}`}>
      {emocao}
    </span>
  );
};

const SceneCard = ({ scene, index }: { scene: VideoScene; index: number }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-border/30 rounded-lg p-3 space-y-2 bg-background/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
            {index + 1}
          </div>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" /> {scene.tempo}
          </span>
          <EmotionBadge emocao={scene.emocao} />
        </div>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setExpanded(!expanded)}>
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </Button>
      </div>
      <p className="text-sm">{scene.texto}</p>
      {expanded && (
        <div className="space-y-1.5 pt-1 border-t border-border/20">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Visual</p>
            <p className="text-xs">{scene.visual}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Prompt de imagem</p>
            <p className="text-xs font-mono text-muted-foreground">{scene.prompt_imagem}</p>
          </div>
        </div>
      )}
    </div>
  );
};

const VideoPreview = ({ timeline, onGenerateVideo, isGenerating }: VideoPreviewProps) => {
  return (
    <div className="glass-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Film className="w-5 h-5 text-primary" />
          <div>
            <h4 className="text-sm font-bold">{timeline.titulo || "Preview do Vídeo"}</h4>
            <p className="text-xs text-muted-foreground">
              {timeline.cenas.length} cenas • {timeline.duracao_total} • Voz: {timeline.voz.estilo}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Eye className="w-3 h-3" /> Preview
        </div>
      </div>

      {/* Timeline bar */}
      <div className="flex gap-0.5 h-2 rounded-full overflow-hidden">
        {timeline.cenas.map((scene, i) => {
          const colors = ["bg-blue-500", "bg-red-500", "bg-emerald-500", "bg-amber-500", "bg-purple-500", "bg-pink-500", "bg-cyan-500", "bg-orange-500"];
          return (
            <div
              key={i}
              className={`${colors[i % colors.length]} flex-1 transition-all hover:opacity-80`}
              title={`Cena ${i + 1}: ${scene.tempo}`}
            />
          );
        })}
      </div>

      {/* Scenes */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
        {timeline.cenas.map((scene, i) => (
          <SceneCard key={i} scene={scene} index={i} />
        ))}
      </div>

      {/* Voice & extras */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-lg border border-border/20 p-2">
          <p className="text-muted-foreground mb-1">🎙️ Voz</p>
          <p>{timeline.voz.estilo} • {timeline.voz.ritmo}</p>
        </div>
        <div className="rounded-lg border border-border/20 p-2">
          <p className="text-muted-foreground mb-1">📣 CTA</p>
          <p className="font-semibold">{timeline.cta}</p>
        </div>
      </div>

      {timeline.hashtags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {timeline.hashtags.map((tag) => (
            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              {tag}
            </span>
          ))}
        </div>
      )}

      {onGenerateVideo && (
        <Button
          variant="neon"
          size="lg"
          className="w-full"
          onClick={onGenerateVideo}
          disabled={isGenerating}
        >
          <Play className="w-4 h-4" />
          {isGenerating ? "Gerando vídeo..." : "GERAR VÍDEO"}
        </Button>
      )}
    </div>
  );
};

export default VideoPreview;