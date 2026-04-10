import { useState, useRef, useCallback } from "react";
import HomeHeader from "@/components/home/HomeHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Upload, Flame, Download, Play, Sparkles, Zap, RotateCcw, Mic, Music } from "lucide-react";
import { gerarVideoViral, type ViralVideoInput } from "@/lib/viralVideoEngine";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const NICHOS = [
  { value: "pet", label: "🐾 Pet" },
  { value: "emagrecimento", label: "⚖️ Emagrecimento" },
  { value: "renda_extra", label: "💰 Renda Extra" },
  { value: "beleza", label: "💄 Beleza" },
  { value: "tecnologia", label: "💻 Tecnologia" },
  { value: "fitness", label: "🏋️ Fitness" },
  { value: "geral", label: "🎯 Geral" },
];

const OBJETIVOS: { value: ViralVideoInput["objetivo"]; label: string }[] = [
  { value: "vendas", label: "🛒 Vendas" },
  { value: "autoridade", label: "👑 Autoridade" },
  { value: "engajamento", label: "💬 Engajamento" },
];

const ViralMachine = () => {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [nicho, setNicho] = useState("geral");
  const [objetivo, setObjetivo] = useState<ViralVideoInput["objetivo"]>("vendas");
  const [narrar, setNarrar] = useState(true);
  const [vozIA, setVozIA] = useState(false);
  const [trilhaSonora, setTrilhaSonora] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [copyGerada, setCopyGerada] = useState<string[]>([]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Envie uma imagem (JPG, PNG, WEBP)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
    setVideoUrl(null);
    setCopyGerada([]);
  }, []);

  const handleGerar = useCallback(async () => {
    if (!imagePreview) {
      toast.error("Suba uma imagem primeiro");
      return;
    }

    setLoading(true);
    setProgress(0);
    setVideoUrl(null);

    try {
      const result = await gerarVideoViral(
        { imageBase: imagePreview, nicho, objetivo, narrar, vozIA, trilhaSonora },
        (ratio) => setProgress(Math.round(ratio * 100)),
      );

      const url = URL.createObjectURL(result.blob);
      setVideoUrl(url);
      setCopyGerada(result.copy);

      // Persist to Supabase storage
      if (user?.id) {
        const path = `generated/viral-${Date.now()}.webm`;
        await supabase.storage
          .from("videos")
          .upload(path, result.blob, { contentType: "video/webm", upsert: true });
      }

      toast.success("🔥 Vídeo viral gerado com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar vídeo. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, [imagePreview, nicho, objetivo, narrar, user]);

  const handleReset = () => {
    setImagePreview(null);
    setVideoUrl(null);
    setCopyGerada([]);
    setProgress(0);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/95">
      <HomeHeader />
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0 text-xs px-3 py-1">
            <Zap className="w-3 h-3 mr-1" /> Zero Custo • 100% no Navegador
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-orange-400 via-red-400 to-purple-500 bg-clip-text text-transparent">
            🔥 Viral Machine
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto text-sm">
            Suba uma imagem, escolha o nicho e gere um vídeo viral pronto para postar — sem custo, sem API, tudo no seu navegador.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: Input */}
          <div className="space-y-4">
            {/* Upload */}
            <Card className="p-4 border-dashed border-2 border-border/50 bg-card/50">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              {imagePreview ? (
                <div className="relative group">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full aspect-[9/16] object-cover rounded-lg"
                  />
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center"
                  >
                    <span className="text-white text-sm font-medium">Trocar imagem</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full aspect-[9/16] flex flex-col items-center justify-center gap-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <Upload className="w-10 h-10 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground font-medium">
                    Clique para enviar sua imagem
                  </span>
                  <span className="text-xs text-muted-foreground/60">JPG, PNG, WEBP</span>
                </button>
              )}
            </Card>

            {/* Options */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Nicho</label>
                <Select value={nicho} onValueChange={setNicho}>
                  <SelectTrigger className="bg-card/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {NICHOS.map((n) => (
                      <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Objetivo</label>
                <Select value={objetivo} onValueChange={(v) => setObjetivo(v as ViralVideoInput["objetivo"])}>
                  <SelectTrigger className="bg-card/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {OBJETIVOS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={narrar}
                onChange={(e) => setNarrar(e.target.checked)}
                className="rounded border-border"
              />
              <span className="text-muted-foreground">🎙️ Narrar com voz do navegador</span>
            </label>

            {/* Generate Button */}
            <Button
              onClick={handleGerar}
              disabled={loading || !imagePreview}
              className="w-full h-14 text-lg font-bold bg-gradient-to-r from-orange-500 via-red-500 to-purple-600 hover:from-orange-600 hover:via-red-600 hover:to-purple-700 text-white shadow-lg"
            >
              {loading ? (
                <>
                  <Sparkles className="w-5 h-5 mr-2 animate-spin" />
                  Gerando... {progress}%
                </>
              ) : (
                <>
                  <Flame className="w-5 h-5 mr-2" />
                  🔥 Gerar Vídeo Viral
                </>
              )}
            </Button>

            {loading && <Progress value={progress} className="h-2" />}
          </div>

          {/* Right: Output */}
          <div className="space-y-4">
            {videoUrl ? (
              <>
                <Card className="overflow-hidden bg-black rounded-xl">
                  <video
                    src={videoUrl}
                    controls
                    autoPlay
                    className="w-full aspect-[9/16] object-contain"
                  />
                </Card>

                <div className="flex gap-2">
                  <a
                    href={videoUrl}
                    download="video-viral.webm"
                    className="flex-1"
                  >
                    <Button variant="outline" className="w-full gap-2">
                      <Download className="w-4 h-4" />
                      Baixar Vídeo
                    </Button>
                  </a>
                  <Button variant="ghost" size="icon" onClick={handleReset}>
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </div>

                {/* Copy Generated */}
                {copyGerada.length > 0 && (
                  <Card className="p-4 bg-card/50 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">📝 Roteiro Gerado</p>
                    {copyGerada.map((line, i) => (
                      <p key={i} className="text-sm text-foreground/90">
                        <span className="text-muted-foreground mr-2">{i + 1}.</span>
                        {line}
                      </p>
                    ))}
                  </Card>
                )}
              </>
            ) : (
              <Card className="flex flex-col items-center justify-center aspect-[9/16] bg-muted/20 border-dashed border-2 border-border/30 rounded-xl">
                <Play className="w-16 h-16 text-muted-foreground/30 mb-4" />
                <p className="text-sm text-muted-foreground/50 text-center px-6">
                  Seu vídeo viral aparecerá aqui
                </p>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ViralMachine;
