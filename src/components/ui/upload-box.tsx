import { useRef, useCallback } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadBoxProps {
  previewUrl?: string | null;
  onFile: (file: File) => void;
  accept?: string;
  disabled?: boolean;
  className?: string;
  hint?: string;
  maxSizeMB?: number;
}

export function UploadBox({
  previewUrl,
  onFile,
  accept = "image/jpeg,image/png,image/webp",
  disabled = false,
  className,
  hint = "JPG, PNG ou WEBP • Máx 20MB",
  maxSizeMB = 20,
}: UploadBoxProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File | null) => {
    if (!f) return;
    if (f.size > maxSizeMB * 1024 * 1024) return;
    onFile(f);
  }, [onFile, maxSizeMB]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files?.[0] || null);
  };

  return (
    <div
      className={cn(
        "relative border-2 border-dashed border-border/40 rounded-2xl text-center transition-all duration-300 cursor-pointer group hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 min-h-[180px] flex items-center justify-center",
        disabled && "opacity-60 pointer-events-none",
        className
      )}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      onClick={() => !disabled && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] || null)}
      />
      {previewUrl ? (
        <div className="space-y-2 p-4">
          <img src={previewUrl} alt="Preview" className="max-h-44 mx-auto rounded-xl object-contain" />
          <p className="text-[10px] text-muted-foreground">Clique para trocar</p>
        </div>
      ) : (
        <div className="space-y-3 p-6">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
            <Upload className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Arraste ou clique para enviar</p>
            <p className="text-[10px] text-muted-foreground mt-1">{hint}</p>
          </div>
        </div>
      )}
    </div>
  );
}
