import { Button } from "@/components/ui/button";
import { RefreshCw, Copy, Download } from "lucide-react";
import type { GeneratedImage } from "./ImageTransformModule";

interface ResultsGalleryProps {
  results: GeneratedImage[];
  onRegenerate: (img: GeneratedImage) => void;
  onDuplicate: (img: GeneratedImage) => void;
  isGenerating: boolean;
}

const formatLabels: Record<string, string> = {
  "1080x1350": "Feed Retrato",
  "1080x1080": "Quadrado",
  "1080x1920": "Story/Reels",
  "1920x1080": "Horizontal",
};

export function ResultsGallery({ results, onRegenerate, onDuplicate, isGenerating }: ResultsGalleryProps) {
  const handleDownload = (img: GeneratedImage) => {
    const a = document.createElement("a");
    a.href = img.url;
    a.download = `transform-${img.format}-${img.id.slice(0, 8)}.png`;
    a.click();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Resultados ({results.length})</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {results.map((img) => (
          <div
            key={img.id}
            className="group rounded-2xl border border-border/20 bg-card/60 overflow-hidden transition-all hover:shadow-lg hover:shadow-primary/5"
          >
            <div className="relative aspect-square bg-black/20 flex items-center justify-center overflow-hidden">
              <img src={img.url} alt="Generated" className="w-full h-full object-contain" />
              <span className="absolute top-2 left-2 rounded-lg bg-black/60 px-2 py-0.5 text-[10px] font-mono text-white">
                {formatLabels[img.format] || img.format}
              </span>
              {img.withText && (
                <span className="absolute top-2 right-2 rounded-lg bg-primary/80 px-2 py-0.5 text-[10px] font-mono text-primary-foreground">
                  + texto
                </span>
              )}
            </div>
            <div className="flex gap-1 p-2">
              <Button variant="ghost" size="sm" className="flex-1 text-xs" onClick={() => onRegenerate(img)} disabled={isGenerating}>
                <RefreshCw className="w-3 h-3 mr-1" /> Regenerar
              </Button>
              <Button variant="ghost" size="sm" className="flex-1 text-xs" onClick={() => onDuplicate(img)}>
                <Copy className="w-3 h-3 mr-1" /> Duplicar
              </Button>
              <Button variant="ghost" size="sm" className="flex-1 text-xs" onClick={() => handleDownload(img)}>
                <Download className="w-3 h-3 mr-1" /> Baixar
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
