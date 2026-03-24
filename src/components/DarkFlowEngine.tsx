import { useMemo, useState, type CSSProperties } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { zipSync, strToU8 } from "fflate";
import { Sparkles, Zap, Download, Flame, Mic2, Video, Palette, Link2 } from "lucide-react";

interface DarkFlowResult {
  hook?: string;
  contexto?: string;
  lista?: string[];
  solucao?: string;
  cta?: string;
  legenda?: string;
  hashtags?: string[];
  texto_falado?: string;
  design?: {
    fundo?: string;
    texto?: string;
    destaque?: string;
    check?: string;
    tipografia?: string;
    efeitos?: string[];
  };
  imagem?: {
    prompt?: string;
    elementos?: string[];
    formato?: string;
  };
  video?: {
    narracao?: string;
    texto_animado?: string[];
    fundo_dinamico?: string;
    musica?: string;
    formatos?: string[];
  };
  voz?: {
    estilo?: string;
    tom?: string;
    ritmo?: string;
    naturalidade?: string;
  };
  avatar?: {
    opcional?: boolean;
    servicos?: string[];
    persona?: string;
  };
  links?: {
    checkout?: string;
    landing?: string;
  };
  niches?: {
    nichos_quentes?: string[];
    temas_sugeridos?: string[];
  };
  assets?: {
    copies?: string[];
    scripts?: string[];
    imagens?: string[];
    videos?: string[];
  };
}

const buildFallbackDarkFlow = (payload: {
  produto?: string;
  nicho?: string;
  objetivo?: string;
  marca?: string;
  publico?: string;
  plataforma?: string;
  checkout?: string;
  landing?: string;
}): DarkFlowResult => {
  const temaBase = payload.nicho || payload.produto || "produto";
  const publicoBase = payload.publico || "seu público";
  const objetivoBase = payload.objetivo || "vendas";
  const marcaBase = payload.marca || "sua marca";
  const cleanHashtag = (value: string) => `#${value.replace(/[^a-z0-9]/gi, "")}`.toLowerCase();

  return {
    hook: `Você está perdendo vendas em ${temaBase} por um erro simples.`,
    contexto: `Conteúdo rápido para ${publicoBase} com foco em ${objetivoBase}.`,
    lista: [
      "Você comunica o benefício errado",
      "Seu gancho não cria urgência",
      "Seu CTA não deixa claro o próximo passo",
    ],
    solucao: `Ajuste o gancho, a promessa e o CTA para fechar mais com ${marcaBase}.`,
    cta: "LINK NA BIO",
    legenda: `Se ${temaBase} é sua prioridade, mude isso hoje.`,
    hashtags: [cleanHashtag(temaBase), "#darkflow", "#marketing", "#vendas", "#conteudoviral"],
    texto_falado: `Se você quer ${objetivoBase}, pare de fazer isso em ${temaBase}. Aqui vai o ajuste que muda o jogo.`,
    design: {
      fundo: "#000000",
      texto: "#FFFFFF",
      destaque: "#FF0000",
      check: "#00FF7F",
      tipografia: "BOLD, CAIXA ALTA, ALTA LEGIBILIDADE",
      efeitos: ["glow vermelho leve", "sombra leve", "centralizado"],
    },
    imagem: {
      prompt: `Imagem dark com texto central destacando ${temaBase}, estilo agressivo e contraste alto.`,
      elementos: ["texto central", "destaque vermelho", "check verde"],
      formato: "9:16",
    },
    video: {
      narracao: `Narracao direta para ${publicoBase}, com promessa clara e CTA final para ${marcaBase}.`,
      texto_animado: ["ERRO", "AJUSTE", "CTA"],
      fundo_dinamico: "texturas dark + motion blur",
      musica: "leve e tensa",
      formatos: ["9:16", "1:1"],
    },
    voz: {
      estilo: "Masculina brasileira",
      tom: "confiante",
      ritmo: "medio",
      naturalidade: "natural",
    },
    avatar: {
      opcional: true,
      servicos: ["HeyGen", "Runway ML"],
      persona: "Homem 30-40 anos, aparencia profissional, comunicacao direta",
    },
    links: {
      checkout: payload.checkout || "",
      landing: payload.landing || "",
    },
    assets: {
      copies: ["hook + contexto + lista + solucao + cta"],
      scripts: ["roteiro completo"],
      imagens: ["prompt de imagem"],
      videos: ["spec de video"],
    },
  };
};

const DarkFlowEngine = () => {
  const [form, setForm] = useState({
    produto: "",
    nicho: "",
    objetivo: "vendas",
    marca: "",
    publico: "",
    plataforma: "tiktok",
    checkout: "",
    landing: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [result, setResult] = useState<DarkFlowResult | null>(null);
  const [niches, setNiches] = useState<string[]>([]);
  const [themes, setThemes] = useState<string[]>([]);

  const update = (key: string, value: string) => setForm((p) => ({ ...p, [key]: value }));

  const withTimeout = async <T,>(fn: () => Promise<T>, ms: number) => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error("Timeout ao gerar conteudo")), ms);
    });
    try {
      return await Promise.race([fn(), timeoutPromise]);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  };

  const buildFallbackNiches = () => {
    const base = form.nicho || form.produto || "Negocios digitais";
    return {
      nichos_quentes: [
        `${base} para iniciantes`,
        `${base} rapido`,
        `${base} sem aparecer`,
        `${base} com baixo investimento`,
        `${base} com prova social`,
      ],
      temas_sugeridos: [
        "Erro comum que trava resultados",
        "Metodo simples em 3 passos",
        "Checklist de execucao diaria",
        "Antes e depois real",
        "Porque voce ainda nao conseguiu",
      ],
    };
  };

  const runDarkFlowPipeline = (payload: DarkFlowResult, sourceLabel: string) => {
    setResult(payload);
    toast.success(`Conteudo Dark gerado (${sourceLabel})`);
  };

  const handleDetectNiches = async () => {
    setIsDetecting(true);
    try {
      const { data, error } = await withTimeout(
        () =>
          supabase.functions.invoke("generate-viral", {
            body: {
              ...form,
              tipo: "dark_flow_niches",
            },
          }),
        10000
      );
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setNiches(data?.nichos_quentes || []);
      setThemes(data?.temas_sugeridos || []);
      toast.success("Nichos quentes detectados");
    } catch (err: any) {
      console.warn("API falhou, usando modo local");
      const local = buildFallbackNiches();
      setNiches(local.nichos_quentes || []);
      setThemes(local.temas_sugeridos || []);
      toast.message("Nichos detectados no modo local");
    } finally {
      setIsDetecting(false);
    }
  };

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const payload = {
        ...form,
        tipo: "dark_flow_engine",
        contextoMestre: {
          tema: form.nicho || form.produto,
          publico: form.publico,
          problema: "",
          objetivo: form.objetivo,
          linguagem: "pt-BR",
          tom: "especialista",
        },
      };
      const { data, error } = await withTimeout(
        () =>
          supabase.functions.invoke("generate-viral", {
            body: payload,
          }),
        10000
      );
      if (error) throw error;
      if (data?.error || data?.success === false) throw new Error(data?.error || "Erro ao gerar conteudo dark");
      if (!data) throw new Error("Resposta vazia ao gerar conteudo dark");
      runDarkFlowPipeline(data || buildFallbackDarkFlow(form), "API");
    } catch (err: any) {
      console.warn("API falhou, usando modo local");
      const fallback = buildFallbackDarkFlow(form);
      runDarkFlowPipeline(fallback, "Local");
      toast.warning("Falha ao gerar conteudo dark. Usando fallback local.");
    } finally {
      setIsLoading(false);
    }
  };

  const designPreview = useMemo(() => {
    const design = result?.design;
    return {
      backgroundColor: design?.fundo || "#000000",
      color: design?.texto || "#FFFFFF",
      borderColor: design?.destaque || "#FF0000",
      boxShadow: "0 0 18px rgba(255, 0, 0, 0.35)",
    } as CSSProperties;
  }, [result]);

  const downloadAffiliatePack = () => {
    if (!result) return;
    const copyText = [
      `HOOK: ${result.hook || ""}`,
      `CONTEXTO: ${result.contexto || ""}`,
      `LISTA: ${(result.lista || []).join(" | ")}`,
      `SOLUCAO: ${result.solucao || ""}`,
      `CTA: ${result.cta || ""}`,
      `LEGENDA: ${result.legenda || ""}`,
      `HASHTAGS: ${(result.hashtags || []).join(" ")}`,
    ].join("\n");
    const scriptText = [
      result.texto_falado || "",
      result.video?.narracao || "",
    ].filter(Boolean).join("\n\n");

    const files: Record<string, Uint8Array> = {
      "copy.txt": strToU8(copyText),
      "script.txt": strToU8(scriptText),
      "design.json": strToU8(JSON.stringify(result.design || {}, null, 2)),
      "imagem_prompt.txt": strToU8(result.imagem?.prompt || ""),
      "video_spec.json": strToU8(JSON.stringify(result.video || {}, null, 2)),
      "links.txt": strToU8(`checkout: ${result.links?.checkout || ""}\nlanding: ${result.links?.landing || ""}`),
      "README.txt": strToU8("Pasta do afiliado: copies, scripts, prompts e specs do Dark Flow."),
    };

    const zipped = zipSync(files, { level: 6 });
    const blob = new Blob([zipped], { type: "application/zip" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "pasta-afiliado-dark-flow.zip";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="glass-card p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <Flame className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-bold">Dark Flow Engine</h3>
          <p className="text-xs text-muted-foreground">Copy + design + video + voz prontos em segundos</p>
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
          <label className="text-sm text-muted-foreground">Plataforma</label>
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
        <div className="space-y-1.5">
          <label className="text-sm text-muted-foreground">Link checkout</label>
          <Input value={form.checkout} onChange={(e) => update("checkout", e.target.value)} placeholder="https://..." />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm text-muted-foreground">Link landing page</label>
          <Input value={form.landing} onChange={(e) => update("landing", e.target.value)} placeholder="https://..." />
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <Button variant="glass" size="lg" className="w-full" onClick={handleDetectNiches} disabled={isDetecting}>
          <Zap className="w-4 h-4" /> {isDetecting ? "Detectando nichos..." : "Detectar nichos quentes"}
        </Button>
        <Button variant="neon" size="lg" className="w-full" onClick={handleGenerate} disabled={isLoading}>
          <Sparkles className="w-4 h-4" /> {isLoading ? "Gerando..." : "GERAR CONTEÚDO DARK"}
        </Button>
      </div>

      {(niches.length > 0 || themes.length > 0) && (
        <div className="rounded-lg border border-border/30 bg-muted/30 p-4 space-y-2">
          {niches.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Nichos quentes</p>
              <div className="flex flex-wrap gap-2 text-xs">
                {niches.map((item) => (
                  <span key={item} className="rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-primary">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}
          {themes.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Temas sugeridos</p>
              <div className="flex flex-wrap gap-2 text-xs">
                {themes.map((item) => (
                  <span key={item} className="rounded-full border border-accent/30 bg-accent/10 px-2 py-1 text-accent">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="glass-card p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Sparkles className="w-4 h-4 text-primary" /> Copy Dark Flow
              </div>
              <p className="text-xs text-muted-foreground">HOOK</p>
              <p className="text-sm font-semibold">{result.hook}</p>
              <p className="text-xs text-muted-foreground">CONTEXTO</p>
              <p className="text-sm">{result.contexto}</p>
              <p className="text-xs text-muted-foreground">LISTA</p>
              <ul className="text-sm list-disc pl-5">
                {(result.lista || []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">SOLUCAO</p>
              <p className="text-sm">{result.solucao}</p>
              <p className="text-xs text-muted-foreground">CTA</p>
              <p className="text-sm font-semibold">{result.cta}</p>
              <p className="text-xs text-muted-foreground">LEGENDA</p>
              <p className="text-sm">{result.legenda}</p>
              <p className="text-xs text-muted-foreground">HASHTAGS</p>
              <p className="text-xs text-muted-foreground">{(result.hashtags || []).join(" ")}</p>
            </div>

            <div className="glass-card p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Palette className="w-4 h-4 text-primary" /> Design automatico
              </div>
              <div className="rounded-xl border p-4 text-center" style={designPreview}>
                <p className="text-xs" style={{ color: result.design?.destaque || "#FF0000" }}>
                  EXEMPLO DARK FLOW
                </p>
                <p className="text-lg font-bold tracking-wide">{(result.hook || "SEU HOOK AQUI").toUpperCase()}</p>
                <p className="text-xs mt-2" style={{ color: result.design?.check || "#00FF7F" }}>
                  ✓ ALTA LEGIBILIDADE
                </p>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>Fundo: {result.design?.fundo}</div>
                <div>Texto: {result.design?.texto}</div>
                <div>Destaque: {result.design?.destaque}</div>
                <div>Check: {result.design?.check}</div>
                <div>Tipografia: {result.design?.tipografia}</div>
                <div>Efeitos: {(result.design?.efeitos || []).join(", ")}</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-card p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Video className="w-4 h-4 text-primary" /> Video
              </div>
              <p className="text-xs text-muted-foreground">Texto falado</p>
              <p className="text-xs">{result.texto_falado}</p>
              <p className="text-xs text-muted-foreground">Prompt de imagem</p>
              <p className="text-xs">{result.imagem?.prompt}</p>
              <p className="text-xs text-muted-foreground">Texto animado</p>
              <p className="text-xs">{(result.video?.texto_animado || []).join(" | ")}</p>
              <p className="text-xs text-muted-foreground">Narração</p>
              <p className="text-xs">{result.video?.narracao}</p>
              <p className="text-xs text-muted-foreground">Fundo dinamico</p>
              <p className="text-xs">{result.video?.fundo_dinamico}</p>
              <p className="text-xs text-muted-foreground">Musica</p>
              <p className="text-xs">{result.video?.musica}</p>
              <p className="text-xs text-muted-foreground">Formatos</p>
              <p className="text-xs">{(result.video?.formatos || []).join(" • ")}</p>
            </div>
            <div className="glass-card p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Mic2 className="w-4 h-4 text-primary" /> Voz Dark Flow
              </div>
              <p className="text-xs">{result.voz?.estilo}</p>
              <p className="text-xs text-muted-foreground">Tom: {result.voz?.tom}</p>
              <p className="text-xs text-muted-foreground">Ritmo: {result.voz?.ritmo}</p>
              <p className="text-xs text-muted-foreground">Naturalidade: {result.voz?.naturalidade}</p>
            </div>
            <div className="glass-card p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Link2 className="w-4 h-4 text-primary" /> Links de venda
              </div>
              <p className="text-xs text-muted-foreground">Checkout</p>
              <p className="text-xs break-all">{result.links?.checkout}</p>
              <p className="text-xs text-muted-foreground">Landing</p>
              <p className="text-xs break-all">{result.links?.landing}</p>
            </div>
          </div>

          <div className="glass-card p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Zap className="w-4 h-4 text-primary" /> Avatar (opcional)
            </div>
            <p className="text-xs">Servicos: {(result.avatar?.servicos || []).join(" / ")}</p>
            <p className="text-xs text-muted-foreground">Persona: {result.avatar?.persona}</p>
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <Button variant="viral" size="lg" className="w-full" onClick={downloadAffiliatePack}>
              <Download className="w-4 h-4" /> Baixar pasta do afiliado
            </Button>
            <Button variant="glass" size="lg" className="w-full" onClick={() => navigator.clipboard.writeText(JSON.stringify(result, null, 2))}>
              <Sparkles className="w-4 h-4" /> Copiar JSON completo
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DarkFlowEngine;
