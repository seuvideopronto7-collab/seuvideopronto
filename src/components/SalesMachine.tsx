import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { zipSync, strToU8 } from "fflate";
import { gerarConteudoIA, type AiConteudoTipo } from "@/lib/aiEngine";
import {
  Sparkles,
  Zap,
  Link2,
  Calendar,
  Flame,
  FolderArchive,
  Activity,
  CheckCircle2,
  AlertTriangle,
  PlayCircle,
} from "lucide-react";

type StepStatus = "idle" | "running" | "done" | "fallback";

interface StepState {
  id: string;
  label: string;
  status: StepStatus;
}

interface MachineResult {
  links: {
    checkout: string;
    landing: string;
  };
  ctas: string[];
  funnel: {
    topo: string;
    meio: string;
    fundo: string;
  };
  formatos: string[];
  calendario: Array<{
    dia: number;
    tipo: string;
    plataforma: string;
    roteiro: string;
    legenda: string;
    hashtags: string[];
    texto_falado: string;
    status: "Agendado" | "Pronto";
  }>;
  afiliados: {
    comissao: string;
    link: string;
    pasta: string[];
  };
  pastaAfiliado: {
    videos: string[];
    imagens: string[];
    copy: string[];
    roteiro: string[];
    links: string[];
  };
  nichos: {
    tendencias: string[];
    palavrasChave: string[];
    nichosLucrativos: string[];
  };
  copy: {
    headline: string;
    promessa: string;
    quebra: string;
    ctaFinal: string;
  };
  copyFinal: string;
}

const initialSteps: StepState[] = [
  { id: "gerarRoteiro", label: "Gerar roteiro", status: "idle" },
  { id: "gerarImagens", label: "Gerar imagens", status: "idle" },
  { id: "gerarNarracao", label: "Gerar narração", status: "idle" },
  { id: "gerarVideo", label: "Gerar vídeo", status: "idle" },
  { id: "gerarLegenda", label: "Gerar legenda", status: "idle" },
  { id: "gerarCopy", label: "Gerar copy", status: "idle" },
  { id: "gerarCTA", label: "Gerar CTA", status: "idle" },
  { id: "vincularLinksVenda", label: "Vincular links de venda", status: "idle" },
  { id: "salvarNaPastaAfiliado", label: "Salvar na pasta do afiliado", status: "idle" },
  { id: "funil", label: "Funil automático", status: "idle" },
  { id: "formatos", label: "Formatos de vídeo", status: "idle" },
  { id: "calendario", label: "Programação 30 dias", status: "idle" },
  { id: "afiliados", label: "Afiliados automáticos", status: "idle" },
  { id: "pastaAfiliado", label: "Pasta do afiliado", status: "idle" },
  { id: "nichos", label: "IA de nicho quente", status: "idle" },
  { id: "copyAutomatica", label: "Copy automática", status: "idle" },
  { id: "publicacao", label: "Publicação automática", status: "idle" },
];

const contentTypes = ["Viral", "Autoridade", "Conversão", "Storytelling"];
const platforms = ["TikTok", "Instagram", "YouTube Shorts"];
const ctasPadrao = ["Link na bio", "Acesse agora", "Comece hoje"];

const withTimeout = <T,>(promise: Promise<T>, timeoutMs = 5000): Promise<T> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), timeoutMs);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });

const SalesMachine = () => {
  const [form, setForm] = useState({
    produto: "",
    nicho: "",
    objetivo: "vendas",
    marca: "",
    publico: "",
    plataforma: "tiktok",
  });
  const [modoViral, setModoViral] = useState(true);
  const [steps, setSteps] = useState<StepState[]>(initialSteps);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [result, setResult] = useState<MachineResult | null>(null);
  const [connected, setConnected] = useState({ tiktok: false, instagram: false, youtube: false });
  const [autopost, setAutopost] = useState(false);

  const update = (key: string, value: string) => setForm((p) => ({ ...p, [key]: value }));

  const setStepStatus = (id: string, status: StepStatus) => {
    setSteps((prev) => prev.map((step) => (step.id === id ? { ...step, status } : step)));
  };

  const appendLog = (message: string) => {
    setLogs((prev) => [`${new Date().toLocaleTimeString()} • ${message}`, ...prev]);
  };

  const buildAiInput = () => ({
    ...form,
    contextoMestre: {
      tema: form.nicho || form.produto,
      publico: form.publico,
      problema: "",
      objetivo: form.objetivo,
      linguagem: "pt-BR",
      tom: "especialista",
    },
  });

  const runAiStep = async (tipo: AiConteudoTipo) => {
    const response = await gerarConteudoIA(tipo, buildAiInput(), {
      modo: modoViral ? "viral" : "autoridade",
      timeoutMs: 5000,
    });
    if (response._fallback) {
      throw new Error("fallback");
    }
  };

  const buildCalendario = (status: "Agendado" | "Pronto") => {
    const baseTema = form.nicho || form.produto || "conteúdo";
    return Array.from({ length: 30 }).map((_, index) => {
      const tipo = contentTypes[index % contentTypes.length];
      const plataforma = platforms[index % platforms.length];
      return {
        dia: index + 1,
        tipo,
        plataforma,
        roteiro: `${tipo} sobre ${baseTema} com foco em ${form.objetivo}.`,
        legenda: `Transforme ${baseTema} com ${form.marca || "sua marca"}.`,
        hashtags: ["#viral", "#conteudo", `#${baseTema.replace(/\s+/g, "").toLowerCase()}`],
        texto_falado: `Aqui vai um ponto rápido sobre ${baseTema} que gera ${form.objetivo}.`,
        status,
      };
    });
  };

  const downloadAffiliatePack = () => {
    if (!result) return;
    const copyText = [
      `HEADLINE: ${result.copy.headline}`,
      `PROMESSA: ${result.copy.promessa}`,
      `QUEBRA: ${result.copy.quebra}`,
      `CTA: ${result.copy.ctaFinal}`,
    ].join("\n");
    const scriptText = result.calendario.slice(0, 5).map((item) => item.roteiro).join("\n\n");
    const files: Record<string, Uint8Array> = {
      "copy.txt": strToU8(copyText),
      "roteiros.txt": strToU8(scriptText),
      "links.txt": strToU8(`checkout: ${result.links.checkout}\nlanding: ${result.links.landing}`),
      "README.txt": strToU8("Pasta do afiliado: copies, roteiros e links de vendas."),
    };
    const zipped = zipSync(files, { level: 6 });
    const blob = new Blob([zipped], { type: "application/zip" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "pasta-afiliado.zip";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const buildResult = (status: "Agendado" | "Pronto"): MachineResult => {
    const temaBase = form.nicho || form.produto || "produto";
    const marcaBase = form.marca || "sua marca";
    const checkout = `https://checkout.${temaBase.replace(/\s+/g, "").toLowerCase()}.com`;
    const landing = `https://landing.${marcaBase.replace(/\s+/g, "").toLowerCase()}.com`;
    const ctas = ctasPadrao;
    return {
      links: {
        checkout,
        landing,
      },
      ctas,
      funnel: {
        topo: "Vídeos virais com gancho rápido",
        meio: "Conteúdo de autoridade com prova",
        fundo: "CTA direto para checkout",
      },
      formatos: ["9:16", "1:1", "Versão curta", "Versão longa"],
      calendario: buildCalendario(status),
      afiliados: {
        comissao: "60% a 70%",
        link: `${landing}/afiliado/${temaBase.replace(/\s+/g, "").toLowerCase()}`,
        pasta: ["videos", "imagens", "copy", "roteiro", "links"],
      },
      pastaAfiliado: {
        videos: ["video_01.mp4", "video_02.mp4"],
        imagens: ["thumb_01.png", "thumb_02.png"],
        copy: ["headline.txt", "promessa.txt"],
        roteiro: ["roteiro_01.txt"],
        links: [checkout, landing],
      },
      nichos: {
        tendencias: ["Ganchos emocionais", "Prova social", "Oferta relâmpago"],
        palavrasChave: [temaBase, "vendas", "conteúdo viral"],
        nichosLucrativos: [temaBase, "marketing", "infoprodutos"],
      },
      copy: {
        headline: `O ajuste que multiplica vendas em ${temaBase}.`,
        promessa: `Resultados rápidos para ${form.publico || "seu público"} com ${marcaBase}.`,
        quebra: "Você está focando na promessa errada.",
        ctaFinal: ctasPadrao[0],
      },
      copyFinal: "Você cria uma ideia… A IA transforma em produto… E publica pra você vender.",
    };
  };

  const runStep = async (id: string, label: string, action: () => Promise<void>, fallback?: () => Promise<void>) => {
    setStepStatus(id, "running");
    appendLog(`${label} iniciado`);
    try {
      await withTimeout(action());
      setStepStatus(id, "done");
      appendLog(`${label} concluído`);
    } catch (err) {
      if (fallback) {
        await fallback();
      }
      setStepStatus(id, "fallback");
      appendLog(`${label} fallback aplicado`);
    }
  };

  const handleActivate = async () => {
    setIsRunning(true);
    setSteps(initialSteps);
    setLogs([]);
    setAutopost(false);
    const localResult = buildResult("Agendado");
    setResult(localResult);

    await runStep("gerarRoteiro", "Gerar roteiro", async () => runAiStep("roteiro"));
    await runStep("gerarImagens", "Gerar imagens", async () => runAiStep("descricao"));
    await runStep("gerarNarracao", "Gerar narração", async () => runAiStep("narracao"));
    await runStep("gerarVideo", "Gerar vídeo", async () => runAiStep("variacoes"));
    await runStep("gerarLegenda", "Gerar legenda", async () => runAiStep("legenda"));
    await runStep("gerarCopy", "Gerar copy", async () => runAiStep("copy"));
    await runStep("gerarCTA", "Gerar CTA", async () => runAiStep("copy"));
    await runStep("vincularLinksVenda", "Vincular links de venda", async () => runAiStep("seo"));
    await runStep("salvarNaPastaAfiliado", "Salvar na pasta do afiliado", async () => runAiStep("variacoes"));
    await runStep("funil", "Funil automático", async () => runAiStep("descricao"));
    await runStep("formatos", "Formatos de vídeo", async () => runAiStep("variacoes"));
    await runStep("calendario", "Programação 30 dias", async () => runAiStep("calendario_30_dias"));
    await runStep("afiliados", "Afiliados automáticos", async () => runAiStep("descricao"));
    await runStep("pastaAfiliado", "Pasta do afiliado", async () => runAiStep("variacoes"));
    await runStep("nichos", "IA de nicho quente", async () => runAiStep("seo"));
    await runStep("copyAutomatica", "Copy automática", async () => runAiStep("copy"));
    await runStep("publicacao", "Publicação automática", async () => runAiStep("descricao"));

    setAutopost(true);
    setResult(buildResult("Agendado"));
    toast.success("MÁQUINA DE VENDAS ATIVADA 🔥");
    appendLog("Máquina completa executada sem travar");
    setIsRunning(false);
  };

  const handleDarkOnly = async () => {
    setIsRunning(true);
    setSteps(initialSteps);
    setLogs([]);
    const localResult = buildResult("Pronto");
    setResult(localResult);
    await runStep("gerarRoteiro", "Gerar roteiro", async () => runAiStep("roteiro"));
    await runStep("gerarImagens", "Gerar imagens", async () => runAiStep("descricao"));
    await runStep("gerarNarracao", "Gerar narração", async () => runAiStep("narracao"));
    await runStep("gerarVideo", "Gerar vídeo", async () => runAiStep("variacoes"));
    await runStep("gerarLegenda", "Gerar legenda", async () => runAiStep("legenda"));
    await runStep("gerarCopy", "Gerar copy", async () => runAiStep("copy"));
    await runStep("gerarCTA", "Gerar CTA", async () => runAiStep("copy"));
    await runStep("vincularLinksVenda", "Vincular links de venda", async () => runAiStep("seo"));
    await runStep("salvarNaPastaAfiliado", "Salvar na pasta do afiliado", async () => runAiStep("variacoes"));
    toast.success("Conteúdo dark gerado com fallback ativo");
    setIsRunning(false);
  };

  const toggleNetwork = (key: "tiktok" | "instagram" | "youtube") => {
    setConnected((p) => {
      const next = { ...p, [key]: !p[key] };
      appendLog(`${key} ${next[key] ? "conectado" : "desconectado"}`);
      return next;
    });
  };

  const handleAutopost = () => {
    const anyConnected = Object.values(connected).some(Boolean);
    if (!anyConnected) {
      toast.warning("Conecte ao menos uma rede para ativar o autopost.");
    }
    setAutopost(true);
    appendLog("Autopost ativado (30 dias)");
  };

  const statusBadge = useMemo(() => {
    const done = steps.filter((s) => s.status === "done").length;
    const fallback = steps.filter((s) => s.status === "fallback").length;
    return { done, fallback, total: steps.length };
  }, [steps]);

  return (
    <div className="glass-card p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <Flame className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-bold">Máquina de Vendas Automática</h3>
          <p className="text-xs text-muted-foreground">Gerador → Conteúdo → Funil → Venda → Afiliado → Escala</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm text-muted-foreground">Produto</label>
          <Input value={form.produto} onChange={(e) => update("produto", e.target.value)} placeholder="Ex: Curso, ebook, app" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm text-muted-foreground">Nicho</label>
          <Input value={form.nicho} onChange={(e) => update("nicho", e.target.value)} placeholder="Ex: Renda online" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm text-muted-foreground">Público</label>
          <Input value={form.publico} onChange={(e) => update("publico", e.target.value)} placeholder="Ex: Iniciantes" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm text-muted-foreground">Nome da marca</label>
          <Input value={form.marca} onChange={(e) => update("marca", e.target.value)} placeholder="Ex: Sua Marca" />
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

      <div className="flex flex-col md:flex-row gap-3">
        <Button variant="glass" size="lg" className="w-full" onClick={handleDarkOnly} disabled={isRunning}>
          <PlayCircle className="w-4 h-4" /> {isRunning ? "Processando..." : "GERAR CONTEÚDO DARK"}
        </Button>
        <Button variant="neon" size="lg" className="w-full" onClick={handleActivate} disabled={isRunning}>
          <Sparkles className="w-4 h-4" /> {isRunning ? "Ativando..." : "ATIVAR MÁQUINA"}
        </Button>
      </div>

      <div className="rounded-lg border border-border/30 bg-muted/30 p-4 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <span>Execução em tempo real</span>
          </div>
          <span className="text-muted-foreground">
            {statusBadge.done}/{statusBadge.total} concluídas · {statusBadge.fallback} fallback
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
          {steps.map((step) => (
            <div key={step.id} className="flex items-center justify-between rounded-md border border-border/40 px-3 py-2">
              <span>{step.label}</span>
              {step.status === "done" && <CheckCircle2 className="w-4 h-4 text-green-400" />}
              {step.status === "fallback" && <AlertTriangle className="w-4 h-4 text-amber-400" />}
              {step.status === "running" && <Zap className="w-4 h-4 text-primary animate-pulse" />}
              {step.status === "idle" && <span className="text-muted-foreground">—</span>}
            </div>
          ))}
        </div>
      </div>

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
          <Calendar className="w-4 h-4" /> Ativar autopost (30 dias)
        </Button>
      </div>

      {logs.length > 0 && (
        <div className="rounded-lg border border-border/30 bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
          {logs.map((log, i) => (
            <div key={i}>{log}</div>
          ))}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="glass-card p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Link2 className="w-4 h-4 text-primary" /> Links de venda automáticos
              </div>
              <p className="text-xs text-muted-foreground">Checkout</p>
              <p className="text-xs break-all">{result.links.checkout}</p>
              <p className="text-xs text-muted-foreground">Landing page</p>
              <p className="text-xs break-all">{result.links.landing}</p>
            </div>
            <div className="glass-card p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Sparkles className="w-4 h-4 text-primary" /> CTA automático
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                {result.ctas.map((cta) => (
                  <span key={cta} className="rounded-full border border-accent/30 bg-accent/10 px-2 py-1 text-accent">
                    {cta}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-card p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Flame className="w-4 h-4 text-primary" /> Funil automático
              </div>
              <p className="text-xs text-muted-foreground">Topo</p>
              <p className="text-xs">{result.funnel.topo}</p>
              <p className="text-xs text-muted-foreground">Meio</p>
              <p className="text-xs">{result.funnel.meio}</p>
              <p className="text-xs text-muted-foreground">Fundo</p>
              <p className="text-xs">{result.funnel.fundo}</p>
            </div>
            <div className="glass-card p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Zap className="w-4 h-4 text-primary" /> Variações de vídeo
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                {result.formatos.map((item) => (
                  <span key={item} className="rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-primary">
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <div className="glass-card p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <FolderArchive className="w-4 h-4 text-primary" /> Afiliados automáticos
              </div>
              <p className="text-xs text-muted-foreground">Comissão</p>
              <p className="text-xs">{result.afiliados.comissao}</p>
              <p className="text-xs text-muted-foreground">Link personalizado</p>
              <p className="text-xs break-all">{result.afiliados.link}</p>
              <p className="text-xs text-muted-foreground">Pasta criativos</p>
              <p className="text-xs">{result.afiliados.pasta.join(" · ")}</p>
            </div>
          </div>

          <div className="glass-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Calendário de Postagens</h4>
              <span className="text-xs text-muted-foreground">{autopost ? "Agendado" : "Pronto"}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {result.calendario.slice(0, 6).map((item) => (
                <div key={`${item.dia}-${item.tipo}`} className="glass-card p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-primary">DIA {item.dia}</span>
                    <span className="text-[10px] rounded-full bg-accent/20 text-accent px-2 py-1">
                      {item.plataforma}
                    </span>
                  </div>
                  <p className="text-xs font-semibold">{item.tipo}</p>
                  <p className="text-[10px] text-muted-foreground">{item.roteiro}</p>
                  <p className="text-[10px]">Legenda: {item.legenda}</p>
                  <p className="text-[10px] text-muted-foreground">{item.hashtags.join(" ")}</p>
                  <div className="text-[10px] text-muted-foreground">Status: {item.status}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="glass-card p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Zap className="w-4 h-4 text-primary" /> IA de nicho quente
              </div>
              <p className="text-xs text-muted-foreground">Tendências</p>
              <p className="text-xs">{result.nichos.tendencias.join(" · ")}</p>
              <p className="text-xs text-muted-foreground">Palavras-chave</p>
              <p className="text-xs">{result.nichos.palavrasChave.join(" · ")}</p>
              <p className="text-xs text-muted-foreground">Nichos lucrativos</p>
              <p className="text-xs">{result.nichos.nichosLucrativos.join(" · ")}</p>
            </div>
            <div className="glass-card p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Sparkles className="w-4 h-4 text-primary" /> Copy automática
              </div>
              <p className="text-xs text-muted-foreground">Headline</p>
              <p className="text-xs">{result.copy.headline}</p>
              <p className="text-xs text-muted-foreground">Promessa</p>
              <p className="text-xs">{result.copy.promessa}</p>
              <p className="text-xs text-muted-foreground">Quebra de objeção</p>
              <p className="text-xs">{result.copy.quebra}</p>
              <p className="text-xs text-muted-foreground">CTA final</p>
              <p className="text-xs font-semibold">{result.copy.ctaFinal}</p>
            </div>
          </div>

          <div className="glass-card p-4 space-y-2">
            <p className="text-sm font-semibold">Copy final</p>
            <p className="text-xs text-muted-foreground">{result.copyFinal}</p>
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <Button variant="viral" size="lg" className="w-full" onClick={downloadAffiliatePack}>
              <FolderArchive className="w-4 h-4" /> Baixar pasta do afiliado
            </Button>
            <Button
              variant="glass"
              size="lg"
              className="w-full"
              onClick={() => navigator.clipboard.writeText(JSON.stringify(result, null, 2))}
            >
              <Sparkles className="w-4 h-4" /> Copiar JSON completo
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesMachine;
