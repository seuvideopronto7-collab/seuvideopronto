import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Upload, X, Link2 } from "lucide-react";
import type { EntryType } from "./StepEntrada";

interface FormData {
  produto: string;
  nicho: string;
  publico: string;
  dor: string;
  beneficio: string;
  link: string;
}

interface StepConteudoProps {
  entryType: EntryType;
  formData: FormData;
  onFormChange: (data: FormData) => void;
  file: File | null;
  onFileChange: (file: File | null) => void;
  videoLink: string;
  onVideoLinkChange: (link: string) => void;
  onContinue: () => void;
}

const StepConteudo = ({
  entryType, formData, onFormChange, file, onFileChange, videoLink, onVideoLinkChange, onContinue,
}: StepConteudoProps) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const update = (key: keyof FormData, value: string) =>
    onFormChange({ ...formData, [key]: value });

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    onFileChange(f);
    if (f.type.startsWith("image/") || f.type.startsWith("video/")) {
      setPreview(URL.createObjectURL(f));
    }
  };

  const clearFile = () => {
    onFileChange(null);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const isManual = entryType === "manual";
  const isUpload = ["image", "video", "audio"].includes(entryType);
  const isLink = entryType === "link";

  const canContinue = isManual
    ? formData.produto.trim() !== ""
    : isUpload
      ? !!file
      : videoLink.trim() !== "";

  const acceptMap: Record<string, string> = {
    image: "image/*",
    video: "video/*",
    audio: "audio/*",
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-1">
          {isManual ? "Dados do Produto" : isUpload ? "Enviar Arquivo" : "Colar Link"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {isManual ? "Preencha as informações do produto" : isUpload ? "Selecione o arquivo para análise" : "Cole o link do vídeo"}
        </p>
      </div>

      {isManual && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">Nome do Produto *</label>
            <Input value={formData.produto} onChange={(e) => update("produto", e.target.value)} className="bg-muted/50 border-border/50" placeholder="Ex: Curso de Marketing Digital" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">Nicho</label>
            <Input value={formData.nicho} onChange={(e) => update("nicho", e.target.value)} className="bg-muted/50 border-border/50" placeholder="Ex: Marketing Digital" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">Público-alvo</label>
            <Input value={formData.publico} onChange={(e) => update("publico", e.target.value)} className="bg-muted/50 border-border/50" placeholder="Ex: Empreendedores iniciantes" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">Link do Produto</label>
            <Input value={formData.link} onChange={(e) => update("link", e.target.value)} className="bg-muted/50 border-border/50" placeholder="https://..." />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">Dor Principal</label>
            <Textarea value={formData.dor} onChange={(e) => update("dor", e.target.value)} className="bg-muted/50 border-border/50" rows={2} placeholder="Qual problema o público enfrenta?" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">Benefício Principal</label>
            <Textarea value={formData.beneficio} onChange={(e) => update("beneficio", e.target.value)} className="bg-muted/50 border-border/50" rows={2} placeholder="O que o produto resolve?" />
          </div>
        </div>
      )}

      {isUpload && (
        <div className="space-y-4">
          <div
            className="border-2 border-dashed border-border/70 rounded-xl p-10 text-center cursor-pointer hover:border-primary/50 transition-all"
            onClick={() => fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" accept={acceptMap[entryType]} className="hidden" onChange={handleFile} />
            {file ? (
              <div className="space-y-3">
                <p className="text-sm font-medium text-primary">{file.name}</p>
                <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); clearFile(); }}>
                  <X className="w-3 h-3 mr-1" /> Remover
                </Button>
              </div>
            ) : (
              <div className="space-y-3 text-muted-foreground">
                <Upload className="w-10 h-10 mx-auto opacity-40" />
                <p className="text-sm">Clique para selecionar ou arraste o arquivo</p>
                <p className="text-xs">
                  {entryType === "image" ? "JPG, PNG, WebP" : entryType === "video" ? "MP4, WebM, MOV" : "MP3, WAV, OGG"}
                </p>
              </div>
            )}
          </div>
          {preview && file?.type.startsWith("image/") && (
            <div className="rounded-xl overflow-hidden border border-border/50 max-w-sm">
              <img src={preview} alt="Preview" className="w-full h-48 object-cover" />
            </div>
          )}
          {preview && file?.type.startsWith("video/") && (
            <div className="rounded-xl overflow-hidden border border-border/50 max-w-sm">
              <video src={preview} controls className="w-full h-48 object-cover" />
            </div>
          )}
        </div>
      )}

      {isLink && (
        <div className="space-y-3">
          <div className="relative max-w-lg">
            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Colar link (YouTube, TikTok, Instagram)"
              value={videoLink}
              onChange={(e) => onVideoLinkChange(e.target.value)}
              className="bg-muted/50 border-border/50 pl-10 h-12 text-base"
            />
          </div>
          <div className="flex gap-2 text-xs text-muted-foreground">
            <span className="px-2 py-1 rounded bg-muted/50">YouTube</span>
            <span className="px-2 py-1 rounded bg-muted/50">TikTok</span>
            <span className="px-2 py-1 rounded bg-muted/50">Instagram</span>
          </div>
        </div>
      )}

      <Button variant="neon" size="lg" disabled={!canContinue} onClick={onContinue} className="w-full sm:w-auto">
        Analisar Conteúdo →
      </Button>
    </div>
  );
};

export default StepConteudo;
