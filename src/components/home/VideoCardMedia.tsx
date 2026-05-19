import { useState } from "react";
import { Film, Play, Sparkles, CheckCircle2 } from "lucide-react";
import { logVideoEvent } from "@/services/video/videoLogger";

type Props = {
  jobId?: string;
  videoUrl?: string;
  imageUrl?: string;
  status: string;
  progress: number;
  isReady: boolean;
  onPlay?: () => void;
};

const PROCESSING = new Set([
  "processing", "rendering", "generating_script", "generating_voice",
  "generating_images", "generating_video", "generating_prompt",
  "queued", "pending", "script_ready",
]);

/**
 * VideoCardMedia — separa estado visual / operacional / terminal / erro / loading / fallback.
 * Cobre corrupção parcial: se <video> falha, cai para thumbnail + badge "Render local disponível".
 */
const VideoCardMedia = ({ jobId, videoUrl, imageUrl, status, progress, isReady, onPlay }: Props) => {
  const [videoFailed, setVideoFailed] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  const isFallbackProcessing = status === "fallback_processing";
  const isFallbackDone = status === "fallback_completed";
  const isProcessing = PROCESSING.has(status) || isFallbackProcessing;
  const isFailed = ["failed", "error"].includes(status);

  // Loading / fallback_processing
  if (isProcessing) {
    return (
      <div className="aspect-video bg-muted/30 relative overflow-hidden">
        {imageUrl && !imageFailed && (
          <img
            src={imageUrl}
            alt=""
            className="w-full h-full object-cover opacity-40"
            onError={() => setImageFailed(true)}
          />
        )}
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
          <div className="text-center space-y-2 px-3">
            <div className={`w-10 h-10 border-2 ${isFallbackProcessing ? "border-blue-400" : "border-primary"} border-t-transparent rounded-full animate-spin mx-auto`} />
            <p className="text-xs text-white/90">
              {isFallbackProcessing ? "Renderizando localmente" : "Gerando…"}
            </p>
            {progress > 0 && <p className="text-xs text-primary font-mono">{progress}%</p>}
          </div>
        </div>
        {isFallbackProcessing && (
          <div className="absolute top-2 left-2 px-2 py-1 rounded-md bg-blue-500/20 border border-blue-400/40 backdrop-blur-sm shadow-[0_0_15px_-2px_rgba(59,130,246,0.5)]">
            <span className="text-[10px] text-blue-200 font-medium flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Motor nativo
            </span>
          </div>
        )}
      </div>
    );
  }

  // Failed (sem video)
  if (isFailed && !videoUrl) {
    return (
      <div className="aspect-video bg-muted/30 relative flex items-center justify-center">
        {imageUrl && !imageFailed ? (
          <img src={imageUrl} alt="" className="w-full h-full object-cover opacity-40" onError={() => setImageFailed(true)} />
        ) : (
          <Film className="w-10 h-10 text-muted-foreground/30" />
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <p className="text-xs text-red-300">Erro na geração</p>
        </div>
      </div>
    );
  }

  // Ready: tenta video, cai para thumb se falhar
  if (isReady && videoUrl && !videoFailed) {
    return (
      <div className="aspect-video bg-black relative group cursor-pointer" onClick={onPlay}>
        <video
          src={videoUrl}
          className="w-full h-full object-cover"
          muted
          playsInline
          preload="metadata"
          onError={() => {
            setVideoFailed(true);
            logVideoEvent("VIDEO_PLAYER_ERROR", { jobId });
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
          <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <Play className="w-5 h-5 text-primary-foreground ml-0.5" />
          </div>
        </div>
        {isFallbackDone && (
          <div className="absolute top-2 left-2 px-2 py-1 rounded-md bg-green-500/20 border border-green-400/40 backdrop-blur-sm">
            <span className="text-[10px] text-green-200 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Motor nativo
            </span>
          </div>
        )}
      </div>
    );
  }

  // Fallback: thumb / placeholder + badge se vídeo falhou
  return (
    <div className="aspect-video bg-muted/30 relative">
      {imageUrl && !imageFailed ? (
        <img src={imageUrl} alt="" className="w-full h-full object-cover" onError={() => setImageFailed(true)} />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Film className="w-10 h-10 text-muted-foreground/30" />
        </div>
      )}
      {videoFailed && (
        <div className="absolute bottom-2 left-2 right-2 px-2 py-1 rounded-md bg-blue-500/30 border border-blue-400/50 backdrop-blur-sm">
          <span className="text-[10px] text-blue-100 font-medium flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Render local disponível
          </span>
        </div>
      )}
    </div>
  );
};

export default VideoCardMedia;
