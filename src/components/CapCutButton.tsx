import { Button } from "@/components/ui/button";
import { Scissors, Share2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  videoUrl: string;
  className?: string;
}

/**
 * Tenta abrir no CapCut via deep link. Fallback: Web Share API → cópia da URL.
 */
export default function CapCutButton({ videoUrl, className }: Props) {
  const openCapCut = async () => {
    try {
      const deepLink = `capcut://import?url=${encodeURIComponent(videoUrl)}`;
      // Tenta deep link
      window.location.href = deepLink;

      // Fallback após 1.2s (CapCut não instalado)
      setTimeout(async () => {
        if (navigator.share) {
          try {
            await navigator.share({ title: "Editar no CapCut", url: videoUrl });
            return;
          } catch {/* user canceled */}
        }
        try {
          await navigator.clipboard.writeText(videoUrl);
          toast.success("URL copiada — cole no CapCut");
        } catch {
          toast.info("Copie a URL do vídeo manualmente");
        }
      }, 1200);
    } catch {
      toast.error("Não foi possível abrir o CapCut");
    }
  };

  return (
    <Button onClick={openCapCut} variant="outline" size="sm" className={className}>
      <Scissors className="w-4 h-4 mr-2" />
      Editar no CapCut
      <Share2 className="w-3 h-3 ml-2 opacity-60" />
    </Button>
  );
}
