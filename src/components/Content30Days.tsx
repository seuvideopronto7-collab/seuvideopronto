import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Calendar, Sparkles, Link2, Clock } from "lucide-react";

interface ConteudoItem {
  dia: number;
  plataforma: string;
  objetivo: string;
  roteiro: string;
  legenda: string;
  hashtags: string[];
  texto_falado: string;
}

const Content30Days = () => {
  const [form, setForm] = useState({
    nicho: "",
    objetivo: "vendas",
    marca: "",
    publico: "",
    plataforma: "tiktok",
  });
  const [modoViral, setModoViral] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [conteudos, setConteudos] = useState<ConteudoItem[]>([]);
  const [connected, setConnected] = useState({ tiktok: false, instagram: false, youtube: false });
  const [autopost, setAutopost] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const update = (key: string, value: string) => setForm((p) => ({ ...p, [key]: value }));

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-viral", {
        body: {
          ...form,
          tipo: "calendario_30_dias",
          modo: modoViral ? "viral" : "autoridade",
          contextoMestre: {
            tema: form.nicho,
            publico: form.publico,
            problema: "",
            objetivo: form.objetivo,
            linguagem: "pt-BR",
            tom: "especialista",
          },
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setConteudos(data?.conteudos || []);
      setLogs((prev) => [`${new Date().toLocaleTimeString()} • 30 conteúdos gerados`, ...prev]);
      toast.success("Calendário de 30 dias pronto! 📅");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao gerar conteúdo");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleNetwork = (key: "tiktok" | "instagram" | "youtube") => {
    setConnected((p) => {
      const next = { ...p, [key]: !p[key] };
      setLogs((prev) => [`${new Date().toLocaleTimeString()} • ${key} ${next[key] ? "conectado" : "desconectado"}`, ...prev]);
      return next;
    });
  };

  const handleAutopost = () => {
    const anyConnected = Object.values(connected).some(Boolean);
    if (!anyConnected) {
      toast.warning("Conecte ao menos uma rede para ativar o autopost.");
    }
    setAutopost(true);
    setLogs((prev) => [`${new Date().toLocaleTimeString()} • Autopost ativado (30 dias)`, ...prev]);
  };

  return (
    <div className="glass-card p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <Calendar className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-bold">Conteúdo para 30 Dias</h3>
          <p className="text-xs text-muted-foreground">Ideias + roteiros + legendas integrados ao produto</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm text-muted-foreground">Nicho</label>
          <Input value={form.nicho} onChange={(e) => update("nicho", e.target.value)} placeholder="Ex: Fitness, Finanças" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm text-muted-foreground">Nome da marca</label>
          <Input value={form.marca} onChange={(e) => update("marca", e.target.value)} placeholder="Ex: Minha Marca" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm text-muted-foreground">Público</label>
          <Input value={form.publico} onChange={(e) => update("publico", e.target.value)} placeholder="Ex: Iniciantes" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm text-muted-foreground">Objetivo</label>
          <Select value={form.objetivo} onValueChange={(value) => update("objetivo", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="vendas">Vendas</SelectItem>
              <SelectItem value="viral">Viral</SelectItem>
              <SelectItem value="autoridade">Autoridade</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm text-muted-foreground">Plataforma principal</label>
          <Select value={form.plataforma} onValueChange={(value) => update("plataforma", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tiktok">TikTok</SelectItem>
              <SelectItem value="instagram">Instagram</SelectItem>
              <SelectItem value="youtube">YouTube Shorts</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-3 pt-6">
          <Switch checked={modoViral} onCheckedChange={setModoViral} />
          <span className="text-sm">Modo inteligente (viral)</span>
        </div>
      </div>

      <Button variant="neon" size="lg" className="w-full" onClick={handleGenerate} disabled={isLoading}>
        <Sparkles className="w-4 h-4" /> {isLoading ? "Gerando calendário..." : "GERAR 30 CONTEÚDOS"}
      </Button>

      <div className="space-y-3 border-t border-border/30 pt-4">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-primary" />
          <h4 className="text-sm font-semibold">Conectar redes</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <button
            className={`rounded-lg border px-3 py-2 text-xs transition-all ${connected.tiktok ? "border-primary bg-primary/10 text-primary" : "border-border/40 text-muted-foreground"}`}
            onClick={() => toggleNetwork("tiktok")}
          >
            TikTok
          </button>
          <button
            className={`rounded-lg border px-3 py-2 text-xs transition-all ${connected.instagram ? "border-primary bg-primary/10 text-primary" : "border-border/40 text-muted-foreground"}`}
            onClick={() => toggleNetwork("instagram")}
          >
            Instagram
          </button>
          <button
            className={`rounded-lg border px-3 py-2 text-xs transition-all ${connected.youtube ? "border-primary bg-primary/10 text-primary" : "border-border/40 text-muted-foreground"}`}
            onClick={() => toggleNetwork("youtube")}
          >
            YouTube
          </button>
        </div>
        <Button variant="viral" size="lg" className="w-full" onClick={handleAutopost}>
          <Clock className="w-4 h-4" /> Ativar autopost (30 dias)
        </Button>
      </div>

      {logs.length > 0 && (
        <div className="rounded-lg border border-border/30 bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
          {logs.map((log, i) => (
            <div key={i}>{log}</div>
          ))}
        </div>
      )}

      {conteudos.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Calendário de Postagens</h4>
            <span className="text-xs text-muted-foreground">{autopost ? "Agendado" : "Pronto"}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {conteudos.map((item) => (
              <div key={item.dia} className="glass-card p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-primary">DIA {item.dia}</span>
                  <span className="text-[10px] rounded-full bg-accent/20 text-accent px-2 py-1">
                    {item.plataforma}
                  </span>
                </div>
                <p className="text-sm font-semibold">{item.objetivo}</p>
                <p className="text-xs text-muted-foreground">{item.roteiro}</p>
                <p className="text-xs">Legenda: {item.legenda}</p>
                <p className="text-[10px] text-muted-foreground">{item.hashtags?.join(" ")}</p>
                <p className="text-xs">Texto falado: {item.texto_falado}</p>
                <div className="text-[10px] text-muted-foreground">
                  Status: {autopost ? "Agendado" : "Pronto"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Content30Days;
