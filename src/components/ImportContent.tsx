import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Upload, Link2, ShoppingCart, Flame, Award, Loader2, FileVideo, FileAudio, ImageIcon, X } from "lucide-react";

interface ImportContentProps {
  produto: string;
  nicho: string;
  publico: string;
  dor: string;
  beneficio: string;
  link: string;
  onResult: (data: any) => void;
  isLoading: boolean;
  setIsLoading: (v: boolean) => void;
}

const ImportContent = ({ produto, nicho, publico, dor, beneficio, link, onResult, isLoading, setIsLoading }: ImportContentProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [videoLink, setVideoLink] = useState("");
  const [modo, setModo] = useState<string>("viral");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    if (f.type.startsWith("image/") || f.type.startsWith("video/")) {
      setFilePreview(URL.createObjectURL(f));
    } else {
      setFilePreview(null);
    }
  };

  const clearFile = () => {
    setFile(null);
    setFilePreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const getFileIcon = () => {
    if (!file) return <Upload className="w-6 h-6" />;
    if (file.type.startsWith("video/")) return <FileVideo className="w-6 h-6" />;
    if (file.type.startsWith("audio/")) return <FileAudio className="w-6 h-6" />;
    if (file.type.startsWith("image/")) return <ImageIcon className="w-6 h-6" />;
    return <Upload className="w-6 h-6" />;
  };

  const handleGenerate = async (selectedModo: string) => {
    if (!file && !videoLink.trim()) {
      toast.error("Envie um arquivo ou cole um link de vídeo");
      return;
    }

    setIsLoading(true);
    setModo(selectedModo);

    try {
      let fileUrl = "";

      if (file) {
        const ext = file.name.split(".").pop();
        const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("media-uploads")
          .upload(path, file);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("media-uploads")
          .getPublicUrl(path);
        fileUrl = urlData.publicUrl;
      }

      const { data, error } = await supabase.functions.invoke("analyze-content", {
        body: {
          fileUrl,
          videoLink: videoLink.trim(),
          modo: selectedModo,
          produto, nicho, publico, dor, beneficio, link,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      onResult(data);
      toast.success("Conteúdo analisado e recriado! 🎯");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao analisar conteúdo");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass-card p-6 space-y-5 animate-slide-up">
      <div className="flex items-center gap-2 mb-2">
        <Upload className="w-5 h-5 text-neon-cyan" />
        <h2 className="text-lg font-semibold">Importar Conteúdo</h2>
        <span className="text-xs text-muted-foreground ml-auto font-mono">MÓDULO AVANÇADO</span>
      </div>

      {/* Upload Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* File Upload */}
        <div className="space-y-3">
          <label className="text-sm text-muted-foreground font-medium">Upload de Arquivo</label>
          <div
            className="border-2 border-dashed border-border/70 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*,audio/*"
              className="hidden"
              onChange={handleFileChange}
            />
            {file ? (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2 text-primary">
                  {getFileIcon()}
                  <span className="text-sm font-medium truncate max-w-[200px]">{file.name}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(1)} MB
                </p>
                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); clearFile(); }}>
                  <X className="w-3 h-3 mr-1" /> Remover
                </Button>
              </div>
            ) : (
              <div className="space-y-2 text-muted-foreground">
                <Upload className="w-8 h-8 mx-auto opacity-50" />
                <p className="text-sm">Clique para enviar</p>
                <p className="text-xs">Imagem, Vídeo ou Áudio</p>
              </div>
            )}
          </div>

          {/* File Preview */}
          {filePreview && file?.type.startsWith("image/") && (
            <div className="rounded-lg overflow-hidden border border-border/50">
              <img src={filePreview} alt="Preview" className="w-full h-32 object-cover" />
            </div>
          )}
          {filePreview && file?.type.startsWith("video/") && (
            <div className="rounded-lg overflow-hidden border border-border/50">
              <video src={filePreview} controls className="w-full h-32 object-cover" />
            </div>
          )}
        </div>

        {/* Link Input */}
        <div className="space-y-3">
          <label className="text-sm text-muted-foreground font-medium">Link de Vídeo</label>
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Colar link (YouTube, TikTok, Instagram)"
                  value={videoLink}
                  onChange={(e) => setVideoLink(e.target.value)}
                  className="bg-muted/50 border-border/50 pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2 text-xs text-muted-foreground">
              <span className="px-2 py-1 rounded bg-muted/50">YouTube</span>
              <span className="px-2 py-1 rounded bg-muted/50">TikTok</span>
              <span className="px-2 py-1 rounded bg-muted/50">Instagram</span>
            </div>
          </div>
        </div>
      </div>

      {/* Generation Modes */}
      <div className="space-y-3">
        <label className="text-sm text-muted-foreground font-medium">Modo de Geração</label>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="neon"
            onClick={() => handleGenerate("vendas")}
            disabled={isLoading || (!file && !videoLink.trim())}
            className="gap-2"
          >
            <ShoppingCart className="w-4 h-4" />
            Vídeo de Vendas
          </Button>
          <Button
            variant="viral"
            onClick={() => handleGenerate("viral")}
            disabled={isLoading || (!file && !videoLink.trim())}
            className="gap-2"
          >
            <Flame className="w-4 h-4" />
            Vídeo Viral
          </Button>
          <Button
            variant="glass"
            onClick={() => handleGenerate("autoridade")}
            disabled={isLoading || (!file && !videoLink.trim())}
            className="gap-2"
          >
            <Award className="w-4 h-4" />
            Vídeo Autoridade
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30">
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">
            Analisando conteúdo e gerando versão otimizada...
          </p>
        </div>
      )}
    </div>
  );
};

export default ImportContent;
