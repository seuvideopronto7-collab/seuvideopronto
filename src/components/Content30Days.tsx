import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { buscarAPI } from "@/lib/apiRegistry";
import { gerarConteudoIA } from "@/lib/aiEngine";
import { addSystemLog } from "@/lib/systemLog";

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
  const navigate = useNavigate();
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
  const [showConnectHint, setShowConnectHint] = useState(false);
  const cacheKey = useMemo(() => {
    const raw = JSON.stringify({ ...form, modoViral });
    return `svz_30dias_${btoa(encodeURIComponent(raw))}`;
  }, [form, modoViral]);

  const update = (key: string, value: string) => setForm((p) => ({ ...p, [key]: value }));

  useEffect(() => {
    const registry = {
      tiktok: buscarAPI("tiktok").conectado,
      instagram: buscarAPI("instagram").conectado,
      youtube: buscarAPI("youtube").conectado,
    };
    setConnected(registry);
    try {
      const stored = localStorage.getItem("svz_autopost_30d");
      if (stored) setAutopost(JSON.parse(stored));
    } catch {
      setAutopost(false);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("svz_autopost_30d", JSON.stringify(autopost));
  }, [autopost]);

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as { conteudos: ConteudoItem[]; createdAt: number };
        if (Date.now() - parsed.createdAt < 6 * 60 * 60 * 1000) {
          setConteudos(parsed.conteudos);
          setLogs((prev) => [`${new Date().toLocaleTimeString()} • Cache aplicado (30 conteúdos)`, ...prev]);
          toast.success("Calendário recuperado do cache.");
          return;
        }
      }

      const { data } = await gerarConteudoIA(
        "calendario_30_dias",
        {
          ...form,
          contextoMestre: {
            tema: form.nicho,
            publico: form.publico,
            problema: "",
            objetivo: form.objetivo,
            linguagem: "pt-BR",
            tom: "especialista",
          },
        },
        { modo: modoViral ? "viral" : "autoridade", timeoutMs: 5000 },
      );
      const nextConteudos = (data as any)?.conteudos || [];
      setConteudos(nextConteudos);
      localStorage.setItem(cacheKey, JSON.stringify({ conteudos: nextConteudos, createdAt: Date.now() }));
      setLogs((prev) => [`${new Date().toLocaleTimeString()} • 30 conteúdos gerados`, ...prev]);
      setLogs((prev) => [`${new Date().toLocaleTimeString()} • Pipeline processado 30/30`, ...prev]);
      addSystemLog({
        level: "info",
        etapa: "conteudo_30_dias",
        status: "concluido",
      });
      toast.success("Calendário de 30 dias pronto! 📅");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao gerar conteúdo");
      addSystemLog({
        level: "warning",
        etapa: "conteudo_30_dias",
        status: "fallback",
        motivo: err?.message || "Falha ao gerar conteúdo",
      });
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
      setLogs((prev) => [`${new Date().toLocaleTimeString()} • Autopost aguardando conexao`, ...prev]);
      setShowConnectHint(true);
      return;
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
        {showConnectHint && (
          <div className="rounded-lg border border-accent/40 bg-accent/10 p-3 text-xs text-muted-foreground flex items-center justify-between">
            <span>APIs nao conectadas. Conecte para liberar autopost.</span>
            <Button variant="glass" size="sm" onClick={() => navigate("/apis")}>
              Conectar
            </Button>
          </div>
        )}
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
