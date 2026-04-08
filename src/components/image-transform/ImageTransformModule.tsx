import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { QuickPresets } from "./QuickPresets";
import { TransformForm } from "./TransformForm";
import { ResultsGallery } from "./ResultsGallery";
import { UploadBox } from "@/components/ui/upload-box";

export type TransformationType = "produto" | "autoridade" | "social" | "campanha";
export type OutputFormat = "1080x1350" | "1080x1080" | "1080x1920" | "1920x1080";

export interface TransformConfig {
  type: TransformationType;
  style: string;
  format: OutputFormat;
  objective: string;
  niche: string;
  audience: string;
  tone: string;
  withText: boolean;
  headline: string;
  subtitle: string;
  cta: string;
  variations: number;
}

export interface GeneratedImage {
  id: string;
  url: string;
  format: OutputFormat;
  withText: boolean;
  description: string;
}

const defaultConfig: TransformConfig = {
  type: "produto",
  style: "",
  format: "1080x1080",
  objective: "",
  niche: "",
  audience: "",
  tone: "profissional e premium",
  withText: false,
  headline: "",
  subtitle: "",
  cta: "",
  variations: 3,
};

export function ImageTransformModule() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [config, setConfig] = useState<TransformConfig>(defaultConfig);
  const [results, setResults] = useState<GeneratedImage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFile = useCallback((file: File) => {
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    const reader = new FileReader();
    reader.onload = () => setImageBase64(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handlePreset = (type: TransformationType, style: string) => {
    setConfig((prev) => ({ ...prev, type, style }));
  };

  const generate = async () => {
    if (!imageBase64) {
      toast.error("Envie uma imagem primeiro");
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    const newResults: GeneratedImage[] = [];

    try {
      for (let i = 0; i < config.variations; i++) {
        setProgress(Math.round(((i) / config.variations) * 100));

        const { data, error } = await supabase.functions.invoke("transform-image", {
          body: {
            imageBase64,
            transformationType: config.type,
            style: config.style,
            format: config.format,
            objective: config.objective,
            niche: config.niche,
            audience: config.audience,
            tone: config.tone,
            withText: config.withText,
            headline: config.headline,
            subtitle: config.subtitle,
            cta: config.cta,
          },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        if (data?.imageUrl) {
          newResults.push({
            id: crypto.randomUUID(),
            url: data.imageUrl,
            format: config.format,
            withText: config.withText,
            description: data.description || "",
          });
        }
      }

      setResults((prev) => [...newResults, ...prev]);
      setProgress(100);
      toast.success(`${newResults.length} variação(ões) gerada(s)!`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao gerar imagem");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerate = async (img: GeneratedImage) => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("transform-image", {
        body: {
          imageBase64,
          transformationType: config.type,
          style: config.style,
          format: img.format,
          objective: config.objective,
          niche: config.niche,
          audience: config.audience,
          tone: config.tone,
          withText: img.withText,
          headline: config.headline,
          subtitle: config.subtitle,
          cta: config.cta,
        },
      });
      if (error) throw error;
      if (data?.imageUrl) {
        setResults((prev) =>
          prev.map((r) =>
            r.id === img.id ? { ...r, url: data.imageUrl, description: data.description || "" } : r
          )
        );
        toast.success("Imagem regenerada!");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao regenerar");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDuplicate = (img: GeneratedImage) => {
    setResults((prev) => [{ ...img, id: crypto.randomUUID() }, ...prev]);
    toast.success("Imagem duplicada!");
  };

  return (
    <div className="space-y-8">
      {/* Upload */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">1. Envie sua imagem</h2>
          <UploadBox previewUrl={previewUrl} onFile={handleFile} hint="JPG, PNG ou WEBP • Máx 20MB" />
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold">2. Escolha um preset rápido</h2>
          <QuickPresets activeType={config.type} activeStyle={config.style} onSelect={handlePreset} />
        </div>
      </div>

      {/* Form */}
      <TransformForm
        config={config}
        onChange={setConfig}
        onGenerate={generate}
        isGenerating={isGenerating}
        progress={progress}
        hasImage={!!imageBase64}
      />

      {/* Results */}
      {results.length > 0 && (
        <ResultsGallery
          results={results}
          onRegenerate={handleRegenerate}
          onDuplicate={handleDuplicate}
          isGenerating={isGenerating}
        />
      )}
    </div>
  );
}
