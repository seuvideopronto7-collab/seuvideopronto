import HomeHeader from "@/components/home/HomeHeader";
import ImageToVideoGenerator from "@/components/ImageToVideoGenerator";
import { Camera } from "lucide-react";

const ImageToVideo = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/95">
      <HomeHeader />
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Title */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium">
            <Camera className="w-3.5 h-3.5" />
            Imagem → Vídeo Comercial
          </div>
          <h1 className="text-3xl font-bold">Crie vídeos comerciais com IA</h1>
          <p className="text-muted-foreground max-w-lg mx-auto text-sm">
            Suba uma imagem e gere automaticamente um vídeo profissional para vendas, autoridade ou engajamento.
          </p>
        </div>

        <ImageToVideoGenerator />
      </main>
    </div>
  );
};

export default ImageToVideo;
