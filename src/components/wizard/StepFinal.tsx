import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import CopyField from "@/components/CopyField";
import { toast } from "sonner";
import { Copy, Download, RefreshCw } from "lucide-react";

interface StepFinalProps {
  roteiroData: any;
  seoData: any;
  videoUrl?: string | null;
  onNewVersion: () => void;
  onContinue: () => void;
}

const StepFinal = ({ roteiroData, seoData, videoUrl, onNewVersion, onContinue }: StepFinalProps) => {
  const roteiro = roteiroData?.roteiro || roteiroData?.novo_roteiro;
  const seo = seoData?.titulos ? seoData : seoData?.seo;
  const [status, setStatus] = useState<"idle" | "sem_video" | "erro_video">("idle");

  const normalizedVideoUrl = useMemo(() => (videoUrl || "").trim(), [videoUrl]);
  const hasVideo = Boolean(normalizedVideoUrl);
  const isPlayableVideoUrl = useMemo(() => {
    if (!normalizedVideoUrl) return false;
    const clean = normalizedVideoUrl.split("?")[0].toLowerCase();
    return /\.(mp4|webm|mov|m4v)$/.test(clean);
  }, [normalizedVideoUrl]);

  useEffect(() => {
    console.log("VIDEO URL:", normalizedVideoUrl);
    if (!normalizedVideoUrl || !isPlayableVideoUrl) {
      setStatus("sem_video");
      return;
    }
    setStatus("idle");
  }, [normalizedVideoUrl, isPlayableVideoUrl]);

  const copyAll = () => {
    const parts = [];
    if (seo?.titulos?.[0]) parts.push(`TÍTULO: ${seo.titulos[0]}`);
    if (seo?.descricao_youtube) parts.push(`DESCRIÇÃO:\n${seo.descricao_youtube}`);
    if (seo?.hashtags) parts.push(`HASHTAGS: ${seo.hashtags.join(" ")}`);
    if (roteiro?.cta) parts.push(`CTA: ${roteiro.cta}`);
    if (roteiro?.roteiro_completo) parts.push(`ROTEIRO:\n${roteiro.roteiro_completo}`);
    navigator.clipboard.writeText(parts.join("\n\n"));
    toast.success("Tudo copiado!");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-1">🎬 Resultado Final</h2>
        <p className="text-sm text-muted-foreground">Seu vídeo está pronto! Confira o material completo</p>
      </div>

      <div className="glass-card p-1 rounded-xl overflow-hidden max-w-2xl mx-auto">
        <div className="bg-gradient-to-br from-primary/20 via-muted to-accent/20 rounded-lg aspect-video flex items-center justify-center">
          {status === "erro_video" && (
            <div className="text-center space-y-3 px-6">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
                <span className="text-3xl">⚠️</span>
              </div>
              <p className="text-sm text-muted-foreground">Erro ao carregar vídeo</p>
              <div className="flex flex-wrap gap-2 justify-center">
                <Button variant="neon" size="sm" onClick={() => setStatus("idle")}>Tentar novamente</Button>
                <Button
                  variant="glass"
                  size="sm"
                  onClick={() => (normalizedVideoUrl ? window.open(normalizedVideoUrl, "_blank") : null)}
                >
                  <Download className="w-4 h-4" /> Baixar vídeo
                </Button>
                <Button variant="glass" size="sm" onClick={onNewVersion}>Gerar novamente</Button>
              </div>
            </div>
          )}

          {status === "sem_video" && (
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
                <span className="text-3xl">🎬</span>
              </div>
              <p className="text-sm text-muted-foreground">Finalizando seu vídeo…</p>
            </div>
          )}

          {status === "idle" && hasVideo && (
            <video
              src={normalizedVideoUrl}
              controls
              autoPlay
              muted
              playsInline
              style={{ width: "100%", borderRadius: "16px" }}
              onError={() => setStatus("erro_video")}
            />
          )}
        </div>
      </div>

      <div className="glass-card p-5 space-y-3">
        {seo?.titulos?.[0] && <CopyField label="Título Sugerido" emoji="📺" value={seo.titulos[0]} />}
        {seo?.descricao_youtube && <CopyField label="Descrição" emoji="📄" value={seo.descricao_youtube} multiline />}
        {seo?.hashtags && <CopyField label="Hashtags" emoji="🔥" value={seo.hashtags.join(" ")} />}
        {roteiro?.cta && <CopyField label="CTA" emoji="🚀" value={roteiro.cta} />}
        {seo?.thumbnail_prompt && <CopyField label="Thumbnail" emoji="🖼️" value={seo.thumbnail_prompt} multiline />}
      </div>

      <div className="flex flex-wrap gap-3">
        <Button variant="neon" onClick={copyAll}><Copy className="w-4 h-4" /> Copiar Tudo</Button>
        <Button variant="glass" onClick={() => toast.info("Materiais baixados!")}><Download className="w-4 h-4" /> Baixar Materiais</Button>
        <Button variant="glass" onClick={onNewVersion}><RefreshCw className="w-4 h-4" /> Gerar Nova Versão</Button>
      </div>

      <Button variant="viral" size="lg" onClick={onContinue} className="w-full sm:w-auto">
        Continuar para Publicação →
      </Button>
    </div>
  );
};

export default StepFinal;
