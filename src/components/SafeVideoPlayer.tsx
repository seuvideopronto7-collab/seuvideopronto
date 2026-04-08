import { useState, useEffect } from "react";
import { resolveVideo, downloadVideo, VIDEO_FALLBACK } from "@/lib/secureVideo";
import { Button } from "@/components/ui/button";
import { Download, Film, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Props = {
  src: string | null | undefined;
  poster?: string | null;
  className?: string;
  showDownload?: boolean;
  autoPlay?: boolean;
};

const SafeVideoPlayer = ({ src, poster, className = "", showDownload = true, autoPlay = false }: Props) => {
  const [safeUrl, setSafeUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    setSafeUrl(null);

    if (!src) {
      setLoading(false);
      setError(true);
      return;
    }

    resolveVideo(src).then((url) => {
      if (!cancelled) {
        setSafeUrl(url);
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) {
        setSafeUrl(VIDEO_FALLBACK);
        setLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [src]);

  const handleDownload = async () => {
    if (!safeUrl) return;
    try {
      toast.loading("Preparando download...", { id: "dl" });
      await downloadVideo(safeUrl);
      toast.success("Download iniciado!", { id: "dl" });
    } catch {
      window.open(safeUrl, "_blank");
      toast.dismiss("dl");
    }
  };

  if (loading) {
    return (
      <div className={`aspect-video flex items-center justify-center bg-muted/30 rounded-xl ${className}`}>
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
        <span className="ml-2 text-xs text-muted-foreground">Carregando vídeo...</span>
      </div>
    );
  }

  if (error && !safeUrl) {
    return (
      <div className={`aspect-video flex items-center justify-center bg-muted/30 rounded-xl ${className}`}>
        <Film className="w-6 h-6 text-muted-foreground/40 mr-2" />
        <span className="text-xs text-muted-foreground">Mídia indisponível</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <video
        src={safeUrl!}
        controls
        autoPlay={autoPlay}
        preload="metadata"
        poster={poster || undefined}
        className={`w-full rounded-xl shadow-xl bg-black ${className}`}
        onError={() => {
          console.warn("[VIDEO_PIPELINE_ERROR]", { etapa: "load", url: safeUrl });
          if (safeUrl !== VIDEO_FALLBACK) {
            setSafeUrl(VIDEO_FALLBACK);
          } else {
            setError(true);
          }
        }}
      />
      {showDownload && safeUrl && (
        <Button variant="outline" size="sm" className="w-full md:w-auto" onClick={handleDownload}>
          <Download className="w-4 h-4" /> Baixar MP4
        </Button>
      )}
    </div>
  );
};

export default SafeVideoPlayer;
