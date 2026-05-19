import { useState } from "react";
import { Film, Play } from "lucide-react";

type Props = {
  videoUrl?: string;
  imageUrl?: string;
  status: string;
  progress: number;
  isReady: boolean;
  onPlay?: () => void;
};

/**
 * VideoCardMedia
 * Separa estado visual / operacional / terminal / erro / loading / fallback.
 * Cobre corrupção parcial: se <video> falha, cai para thumbnail automaticamente.
 */
const VideoCardMedia = ({ videoUrl, imageUrl, status, progress, isReady, onPlay }: Props) => {
  const [videoFailed, setVideoFailed] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  const isProcessing = ["processing", "rendering", "generating_script", "generating_voice",
    "generating_images", "generating_video", "generating_prompt", "queued", "pending"].includes(status);
  const isFailed = ["failed", "error"].includes(status);

  // Loading state
  if (isProcessing) {
    return (
      <div className="aspect-video bg-muted/30 relative">
        {imageUrl && !imageFailed && (
          <img
            src={imageUrl}
            alt=""
            className="w-full h-full object-cover opacity-40"
            onError={() => setImageFailed(true)}
          />
        )}
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
          <div className="text-center space-y-2">
            <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-white/80">Gerando…</p>
            {progress > 0 && <p className="text-xs text-primary font-mono">{progress}%</p>}
          </div>
        </div>
      </div>
    );
  }

  // Failed state
  if (isFailed && !videoUrl) {
    return (
      <div className="aspect-video bg-muted/30 relative flex items-center justify-center">
        {imageUrl && !imageFailed ? (
          <img
            src={imageUrl}
            alt=""
            className="w-full h-full object-cover opacity-40"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <Film className="w-10 h-10 text-muted-foreground/30" />
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <p className="text-xs text-red-300">Erro na geração</p>
        </div>
      </div>
    );
  }

  // Ready: try video, fallback to image on error
  if (isReady && videoUrl && !videoFailed) {
    return (
      <div className="aspect-video bg-black relative group cursor-pointer" onClick={onPlay}>
        <video
          src={videoUrl}
          className="w-full h-full object-cover"
          muted
          playsInline
          preload="metadata"
          onError={() => setVideoFailed(true)}
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
          <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <Play className="w-5 h-5 text-primary-foreground ml-0.5" />
          </div>
        </div>
      </div>
    );
  }

  // Fallback: thumbnail or placeholder
  return (
    <div className="aspect-video bg-muted/30 relative">
      {imageUrl && !imageFailed ? (
        <img
          src={imageUrl}
          alt=""
          className="w-full h-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Film className="w-10 h-10 text-muted-foreground/30" />
        </div>
      )}
    </div>
  );
};

export default VideoCardMedia;
