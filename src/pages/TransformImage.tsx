import { useState } from "react";
import { useNavigate } from "react-router-dom";
import BackButton from "@/components/BackButton";
import { ImageTransformModule } from "@/components/image-transform/ImageTransformModule";

const TransformImage = () => {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-6">
        <BackButton />
        <div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary via-purple-400 to-accent bg-clip-text text-transparent">
            Transformação de Imagens com IA
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Transforme fotos de produtos e pessoas em imagens comerciais premium
          </p>
        </div>
        <ImageTransformModule />
      </div>
    </div>
  );
};

export default TransformImage;
