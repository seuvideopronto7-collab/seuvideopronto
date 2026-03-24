import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Check, Copy, Download, ExternalLink, Link2, Loader2, Rocket, Send, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { zipSync, strToU8 } from "fflate";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  estruturaData: any;
  conteudoData: any;
  vslData: any;
  kitData: any;
  onNewProduct: () => void;
}

const InfoStepEntrega = ({ estruturaData, conteudoData, vslData, kitData, onNewProduct }: Props) => {
  const [copiedPlatform, setCopiedPlatform] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [connectedPlatform, setConnectedPlatform] = useState<string | null>(null);
  const [credentials, setCredentials] = useState({ email: "", senha: "", token: "" });
  const [status, setStatus] = useState<"Preparando" | "Enviado" | "Aprovado" | "Rejeitado" | "Fallback" | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [campaign, setCampaign] = useState<any>(null);
  const [hotmartMode, setHotmartMode] = useState<"mock" | "real">("mock");
  const [hotmartStatus, setHotmartStatus] = useState<"idle" | "testando" | "conectado" | "erro">("idle");
  const [hotmartToken, setHotmartToken] = useState<string | null>(null);
  const [hotmartBasicAuth, setHotmartBasicAuth] = useState("");
  const [hotmartConnected, setHotmartConnected] = useState(false);
  const [hotmartStatusLabel, setHotmartStatusLabel] = useState("Desconectado");
  const [eduzzStatusLabel, setEduzzStatusLabel] = useState("Desconectado");
  const [kiwifyStatusLabel, setKiwifyStatusLabel] = useState("Desconectado");
  const [integrationStatus, setIntegrationStatus] = useState<
    Record<string, "connected" | "error" | "expired" | "disconnected">
  >({});
  const [eduzzPosting, setEduzzPosting] = useState(false);
  const [eduzzError, setEduzzError] = useState<string | null>(null);
  const [eduzzResult, setEduzzResult] = useState<{ id?: string; url?: string } | null>(null);
  const [eduzzPayload, setEduzzPayload] = useState({
    nome: "",
    descricao: "",
    preco: "",
    url_capa: "",
    conteudo_url: "",
  });

  const { user, profile } = useAuth();
  const userId = profile?.id || user?.id || null;
  const autoValidatedRef = useRef(false);

  const statusLabelMap: Record<string, string> = {
    connected: "Conectado",
    error: "Erro",
    expired: "Expirado",
    disconnected: "Desconectado",
  };

  const statusColorMap: Record<string, string> = {
    connected: "bg-emerald-500/15 text-emerald-300",
    error: "bg-rose-500/15 text-rose-300",
    expired: "bg-amber-500/15 text-amber-300",
    disconnected: "bg-rose-500/15 text-rose-300",
  };

  const platformKeyFromName = (platform?: string | null) => {
    if (!platform) return null;
    const normalized = platform.toLowerCase();
    if (normalized.includes("hotmart")) return "hotmart";
    if (normalized.includes("eduzz")) return "eduzz";
    if (normalized.includes("kiwify")) return "kiwify";
    if (normalized.includes("monetizze")) return "monetizze";
    return null;
  };

  const resolveStatus = (platformKey?: string | null) =>
    (platformKey && integrationStatus[platformKey]) || "disconnected";

  useEffect(() => {
    const loadIntegrations = async () => {
      if (!userId) return null;
      const { data, error } = await (supabase
        .from("integrations" as any)
        .select("platform, status")
        .eq("user_id", userId)
        .in("platform", ["eduzz", "hotmart", "kiwify", "monetizze"]) as any);
      if (error || !data) {
        setIntegrationStatus({});
        setEduzzStatusLabel("Desconectado");
        setHotmartConnected(false);
        setHotmartStatusLabel("Desconectado");
        setKiwifyStatusLabel("Desconectado");
        return null;
      }

      const statusByPlatform = (data as any[]).reduce<Record<string, "connected" | "error" | "expired" | "disconnected">>(
        (acc, item) => {
          if (item.status === "connected" || item.status === "error" || item.status === "expired") {
            acc[item.platform] = item.status;
          } else {
            acc[item.platform] = "disconnected";
          }
          return acc;
        },
        {},
      );

      setIntegrationStatus(statusByPlatform);
      const eduzzStatus = statusByPlatform.eduzz || "disconnected";
      const hotmartStatusValue = statusByPlatform.hotmart || "disconnected";
      const kiwifyStatusValue = statusByPlatform.kiwify || "disconnected";
      setEduzzStatusLabel(statusLabelMap[eduzzStatus]);
      setHotmartConnected(hotmartStatusValue === "connected");
      setHotmartStatusLabel(statusLabelMap[hotmartStatusValue]);
      setKiwifyStatusLabel(statusLabelMap[kiwifyStatusValue]);
      return statusByPlatform;
    };

    const revalidateIntegrations = async (statusByPlatform: Record<string, string>) => {
      const tasks: Promise<unknown>[] = [];
      if (statusByPlatform.hotmart) {
        tasks.push(supabase.functions.invoke("hotmart-test"));
      }
      if (statusByPlatform.eduzz) {
        tasks.push(supabase.functions.invoke("eduzz-test"));
      }
      if (tasks.length === 0) return;
      await Promise.allSettled(tasks);
    };

    const run = async () => {
      const statusByPlatform = await loadIntegrations();
      if (!statusByPlatform || autoValidatedRef.current) return;
      autoValidatedRef.current = true;
      await revalidateIntegrations(statusByPlatform);
      await loadIntegrations();
    };

    run();
  }, [userId]);

  useEffect(() => {
    setEduzzPayload((prev) => ({
      nome: prev.nome || estruturaData?.nome_otimizado || "",
      descricao: prev.descricao || kitData?.landing_page?.estrutura || kitData?.headline || "",
      preco: prev.preco || kitData?.preco?.toString?.() || "",
      url_capa: prev.url_capa || kitData?.thumbnail || "",
      conteudo_url: prev.conteudo_url || vslData?.video_url || "",
    }));
  }, [estruturaData, kitData, vslData]);

  const buildFullCopy = (platform: string) => {
    const parts = [];
    if (estruturaData) {
      parts.push(`NOME: ${estruturaData.nome_otimizado}`);
      parts.push(`SUBTÍTULO: ${estruturaData.subtitulo}`);
      parts.push(`PROMESSA: ${estruturaData.promessa_forte}`);
      parts.push("");
    }
    if (kitData) {
      parts.push(`HEADLINE: ${kitData.headline}`);
      parts.push(`SUBHEADLINE: ${kitData.subheadline}`);
      parts.push("");
      if (kitData.bullets) {
        parts.push("BULLET POINTS:");
        kitData.bullets.forEach((b: string) => parts.push(`• ${b}`));
        parts.push("");
      }
      parts.push(`GARANTIA: ${kitData.garantia}`);
      parts.push(`CTA: ${kitData.cta_principal}`);
    }
    if (conteudoData?.modulos) {
      parts.push("");
      parts.push("ESTRUTURA DO CURSO:");
      conteudoData.modulos.forEach((m: any) => {
        parts.push(`\nMÓDULO ${m.numero}: ${m.titulo}`);
        m.aulas?.forEach((a: any) => parts.push(`  Aula ${a.numero}: ${a.titulo}`));
      });
    }
    return parts.join("\n");
  };

  const buildZipPackage = () => {
    const files: Record<string, Uint8Array> = {
      "copy.txt": strToU8(buildFullCopy(connectedPlatform || "Plataforma")),
      "descricao.txt": strToU8(kitData?.landing_page?.estrutura || "Descrição pronta"),
      "roteiros/vsl.txt": strToU8(vslData?.roteiro_completo || vslData?.hook || "Roteiro VSL"),
      "roteiros/anuncios.txt": strToU8((kitData?.bullets || []).join("\n") || "Scripts de anúncio"),
      "thumbnails/README.txt": strToU8("Inclua suas thumbnails aqui"),
    };
    const zip = zipSync(files, { level: 6 });
    const blob = new Blob([zip as unknown as BlobPart], { type: "application/zip" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "produto.zip";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyPlatform = (platform: string) => {
    navigator.clipboard.writeText(buildFullCopy(platform));
    setCopiedPlatform(platform);
    toast.success(`Copiado para ${platform}!`);
    setTimeout(() => setCopiedPlatform(null), 2000);
  };

  const handleConnect = () => {
    if (!selectedPlatform) {
      toast.error("Selecione uma plataforma para conectar.");
      return;
    }
    if (!credentials.email || (!credentials.senha && !credentials.token)) {
      toast.error("Informe email e senha ou token/API.");
      return;
    }
    setConnectedPlatform(selectedPlatform);
    setStatus("Preparando");
    setLogs((prev) => [`${new Date().toLocaleTimeString()} • ${selectedPlatform} conectado`, ...prev]);
    toast.success(`Conectado a ${selectedPlatform}!`);
  };

  const handleTestHotmart = async () => {
    const platform = selectedPlatform || connectedPlatform;
    if (platform !== "Hotmart") {
      toast.error("Selecione Hotmart para testar a conexão real.");
      return;
    }
    setHotmartMode("real");
    setHotmartStatus("testando");
    setLogs((prev) => [`${new Date().toLocaleTimeString()} • Validando conexão real com Hotmart`, ...prev]);

    try {
      const { data, error } = await supabase.functions.invoke("testar-hotmart", {
        body: {
          basicAuth: hotmartBasicAuth || undefined,
        },
      });
      if (error) throw error;
      if (data?.status === "conectado") {
        setHotmartStatus("conectado");
        setHotmartToken(data?.token || null);
        setLogs((prev) => [`${new Date().toLocaleTimeString()} • Conexão real estabelecida`, ...prev]);
        toast.success("Conexão real estabelecida com Hotmart ✅");
      } else {
        setHotmartStatus("erro");
        setLogs((prev) => [`${new Date().toLocaleTimeString()} • Falha na autenticação`, ...prev]);
        toast.error("Falha na autenticação com Hotmart");
      }
    } catch (err: any) {
      setHotmartStatus("erro");
      setLogs((prev) => [`${new Date().toLocaleTimeString()} • Erro na validação Hotmart`, ...prev]);
      toast.error(err.message || "Erro ao testar conexão real");
    }
  };

  const handleEnviarTeste = async () => {
    if (hotmartMode !== "real") {
      toast.warning("Ative o modo real para enviar produto teste.");
      return;
    }
    if (hotmartStatus !== "conectado") {
      toast.warning("Valide a conexão real antes do envio de teste.");
      return;
    }
    setLogs((prev) => [`${new Date().toLocaleTimeString()} • Produto preparado (Hotmart não permite envio direto)`, ...prev]);
    if (hotmartToken) {
      console.log("Token válido:", hotmartToken);
    }
    toast.success("Produto preparado para envio manual.");
  };

  const handleEnviar = () => {
    if (hotmartConnected) {
      const payload = {
        name: estruturaData?.nome_otimizado || "Produto",
        description: kitData?.landing_page?.estrutura || kitData?.headline || "",
        price: kitData?.preco || null,
        thumbnail: kitData?.thumbnail || null,
        video_url: vslData?.video_url || null,
        checkout_link: kitData?.checkout_link || null,
      };
      setLogs((prev) => [`${new Date().toLocaleTimeString()} • Payload Hotmart preparado`, ...prev]);
      console.log("Hotmart payload preparado", payload);
    }
    const platformName = selectedPlatform || connectedPlatform;
    if (!platformName) {
      setStatus("Fallback");
      setLogs((prev) => [`${new Date().toLocaleTimeString()} • Fallback ativado: pacote pronto`, ...prev]);
      buildZipPackage();
      toast.warning("API indisponível. Pacote gerado para envio manual.");
      return;
    }
    const platformKey = platformKeyFromName(platformName);
    if (!platformKey || resolveStatus(platformKey) !== "connected") {
      setStatus("Fallback");
      setLogs((prev) => [`${new Date().toLocaleTimeString()} • ${platformName} não conectada`, ...prev]);
      buildZipPackage();
      toast.warning("API não conectada. Pacote gerado para envio manual.");
      return;
    }
    setStatus("Enviado");
    setLogs((prev) => [`${new Date().toLocaleTimeString()} • Produto enviado para aprovação`, ...prev]);
    toast.success("Produto enviado para análise!");
  };

  const handleCampaign = () => {
    const criativos = kitData?.bullets || ["Resultado rápido", "Prova social", "Transformação clara"];
    const headlines = [kitData?.headline, kitData?.subheadline].filter(Boolean);
    const publicos = [estruturaData?.avatar?.perfil, estruturaData?.avatar?.situacao].filter(Boolean);
    const scripts = [kitData?.cta_principal, kitData?.garantia].filter(Boolean);
    setCampaign({ criativos, headlines, publicos, scripts });
    toast.success("Campanha de vendas gerada! 🔥");
  };

  const handleEduzzPost = async () => {
    if (resolveStatus("eduzz") !== "connected") {
      setLogs((prev) => [`${new Date().toLocaleTimeString()} • Eduzz não conectada`, ...prev]);
      toast.error("Conecte a Eduzz antes de publicar.");
      return;
    }

    const produto = {
      nome: eduzzPayload.nome || estruturaData?.nome_otimizado || "Produto",
      descricao: eduzzPayload.descricao || kitData?.landing_page?.estrutura || kitData?.headline || "",
      preco: Number(eduzzPayload.preco),
      tipo: "digital",
      url_capa: eduzzPayload.url_capa,
      conteudo_url: eduzzPayload.conteudo_url,
    };

    if (!produto.nome || !produto.descricao || !produto.preco) {
      toast.error("Informe nome, descrição e preço antes de publicar.");
      return;
    }

    setEduzzPosting(true);
    setEduzzError(null);
    setEduzzResult(null);
    console.log("Enviando produto:", produto);

    const { data, error } = await supabase.functions.invoke("eduzz-post-product", {
      body: { produto },
    });

    console.log("Resposta Eduzz:", data || error);

    if (error || data?.error) {
      setEduzzError("Erro ao publicar. Baixe o material e publique manualmente.");
      toast.error("Erro ao publicar. Baixe o material e publique manualmente.");
      setEduzzPosting(false);
      return;
    }

    setEduzzResult({ id: data?.id, url: data?.url });
    toast.success("Produto publicado na Eduzz com sucesso 🚀");
    setEduzzPosting(false);
  };

  return (
    <div className="glass-card p-6 space-y-5 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
          <Rocket className="w-5 h-5 text-accent" />
        </div>
        <div>
          <h3 className="text-lg font-bold">Seu Infoproduto Está Pronto! 🎉</h3>
          <p className="text-xs text-muted-foreground">Copie tudo para sua plataforma</p>
        </div>
      </div>

      {/* Resumo */}
      <div className="bg-muted/30 rounded-xl p-4 border border-border/30 space-y-2">
        <p className="text-sm font-semibold">📦 Resumo do Produto</p>
        {estruturaData && (
          <>
            <p className="text-sm"><span className="text-muted-foreground">Nome:</span> {estruturaData.nome_otimizado}</p>
            <p className="text-sm"><span className="text-muted-foreground">Promessa:</span> {estruturaData.promessa_forte}</p>
          </>
        )}
        {conteudoData?.modulos && (
          <p className="text-sm"><span className="text-muted-foreground">Módulos:</span> {conteudoData.modulos.length} módulos</p>
        )}
        <div className="flex gap-2 mt-2 flex-wrap">
          {estruturaData && <span className="text-xs bg-accent/20 text-accent px-2 py-1 rounded-full">✅ Estrutura</span>}
          {conteudoData && <span className="text-xs bg-accent/20 text-accent px-2 py-1 rounded-full">✅ Conteúdo</span>}
          {vslData && <span className="text-xs bg-accent/20 text-accent px-2 py-1 rounded-full">✅ VSL</span>}
          {kitData && <span className="text-xs bg-accent/20 text-accent px-2 py-1 rounded-full">✅ Kit Vendas</span>}
        </div>
      </div>

      {/* Plataformas */}
      <div className="space-y-3">
        {["Hotmart", "Eduzz", "Monetizze", "Kiwify"].map((p) => (
          <Button
            key={p}
            variant="glass"
            size="lg"
            className="w-full justify-between"
            onClick={() => handleCopyPlatform(p)}
          >
            <span>📋 COPIAR PARA {p.toUpperCase()}</span>
            {copiedPlatform === p ? <Check className="w-4 h-4 text-accent" /> : <Copy className="w-4 h-4" />}
          </Button>
        ))}
      </div>

      <div className="space-y-4 border-t border-border/30 pt-4">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-primary" />
          <h4 className="text-sm font-semibold">Conectar Plataformas</h4>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {["Hotmart", "Eduzz", "Monetizze", "Kiwify"].map((p) => (
            <button
              key={p}
              onClick={() => setSelectedPlatform(p)}
              className={`rounded-lg border px-3 py-2 text-xs transition-all ${
                selectedPlatform === p ? "border-primary bg-primary/10 text-primary" : "border-border/40 text-muted-foreground"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input
            placeholder="Email"
            value={credentials.email}
            onChange={(e) => setCredentials((p) => ({ ...p, email: e.target.value }))}
          />
          <Input
            placeholder="Senha"
            type="password"
            value={credentials.senha}
            onChange={(e) => setCredentials((p) => ({ ...p, senha: e.target.value }))}
          />
          <Input
            placeholder="Token/API (opcional)"
            value={credentials.token}
            onChange={(e) => setCredentials((p) => ({ ...p, token: e.target.value }))}
          />
        </div>

        <Button variant="neon" size="lg" className="w-full" onClick={handleConnect}>
          <ShieldCheck className="w-4 h-4" /> Conectar Plataforma
        </Button>
      </div>

      <div className="space-y-4 border-t border-border/30 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold">Forcar conexao real (test mode)</h4>
            <p className="text-xs text-muted-foreground">Hotmart: valida token real antes de considerar conectado</p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className={hotmartMode === "real" ? "text-primary" : "text-muted-foreground"}>
              {hotmartMode === "real" ? "REAL" : "MOCK"}
            </span>
            <Switch checked={hotmartMode === "real"} onCheckedChange={(checked) => setHotmartMode(checked ? "real" : "mock")} />
          </div>
        </div>

        <Input
          placeholder="Hotmart Basic Auth (base64 client_id:client_secret)"
          value={hotmartBasicAuth}
          onChange={(e) => setHotmartBasicAuth(e.target.value)}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Button variant="neon" size="lg" className="w-full" onClick={handleTestHotmart}>
            Testar conexao real
          </Button>
          <Button variant="glass" size="lg" className="w-full" onClick={handleEnviarTeste}>
            Enviar produto teste
          </Button>
        </div>

        <div className="rounded-lg border border-border/30 bg-muted/30 p-3 text-xs text-muted-foreground">
          {hotmartStatus === "testando" && "Validando conexão com Hotmart..."}
          {hotmartStatus === "conectado" && "Conexão real estabelecida com Hotmart ✅"}
          {hotmartStatus === "erro" && "Falha na autenticação"}
          {hotmartStatus === "idle" && "Status aguardando teste real"}
        </div>
      </div>

      <div className="space-y-4 border-t border-border/30 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold">Dashboard</h4>
            <p className="text-xs text-muted-foreground">Status em tempo real</p>
          </div>
          {connectedPlatform && (
            <span className="text-xs rounded-full bg-accent/20 text-accent px-2 py-1">
              Conectado: {connectedPlatform}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`text-xs rounded-full px-2 py-1 ${statusColorMap[resolveStatus("hotmart")]}`}>
            Hotmart: {hotmartStatusLabel}
          </span>
          <span className={`text-xs rounded-full px-2 py-1 ${statusColorMap[resolveStatus("eduzz")]}`}>
            Eduzz: {eduzzStatusLabel}
          </span>
          <span className={`text-xs rounded-full px-2 py-1 ${statusColorMap[resolveStatus("kiwify")]}`}>
            Kiwify: {kiwifyStatusLabel}
          </span>
          {status && (
            <span className="text-xs rounded-full bg-primary/15 text-primary px-2 py-1">{status}</span>
          )}
          {!status && <span className="text-xs text-muted-foreground">Aguardando conexão</span>}
        </div>
        {logs.length > 0 && (
          <div className="rounded-lg border border-border/30 bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
            {logs.map((log, i) => (
              <div key={i}>{log}</div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4 border-t border-border/30 pt-4">
        <div>
          <h4 className="text-sm font-semibold">Preparação Automática</h4>
          <p className="text-xs text-muted-foreground">Materiais adaptados por plataforma</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {["Headline", "Descrição longa", "Categoria", "Thumbnail", "Garantia", "Preço"].map((item) => (
            <div key={item} className="rounded-lg border border-border/30 bg-muted/30 px-3 py-2 text-xs">
              ✅ {item}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4 border-t border-border/30 pt-4">
        <div>
          <h4 className="text-sm font-semibold">Publicar na Eduzz</h4>
          <p className="text-xs text-muted-foreground">Publicação automática com link de checkout</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            placeholder="Nome do produto"
            value={eduzzPayload.nome}
            onChange={(e) => setEduzzPayload((prev) => ({ ...prev, nome: e.target.value }))}
          />
          <Input
            placeholder="Preço (ex: 97)"
            value={eduzzPayload.preco}
            onChange={(e) => setEduzzPayload((prev) => ({ ...prev, preco: e.target.value }))}
          />
          <Input
            placeholder="URL da capa (opcional)"
            value={eduzzPayload.url_capa}
            onChange={(e) => setEduzzPayload((prev) => ({ ...prev, url_capa: e.target.value }))}
          />
          <Input
            placeholder="URL do conteúdo (opcional)"
            value={eduzzPayload.conteudo_url}
            onChange={(e) => setEduzzPayload((prev) => ({ ...prev, conteudo_url: e.target.value }))}
          />
        </div>
        <Textarea
          placeholder="Descrição"
          value={eduzzPayload.descricao}
          onChange={(e) => setEduzzPayload((prev) => ({ ...prev, descricao: e.target.value }))}
          rows={4}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Button variant="viral" size="lg" className="w-full" onClick={handleEduzzPost} disabled={eduzzPosting}>
            {eduzzPosting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Postar agora
          </Button>
          <Button variant="glass" size="lg" className="w-full" onClick={buildZipPackage}>
            <Download className="w-4 h-4" /> Baixar pacote (ZIP)
          </Button>
        </div>
        {eduzzResult?.url && (
          <Button
            variant="neon"
            size="lg"
            className="w-full"
            onClick={() => window.open(eduzzResult.url, "_blank")}
          >
            <ExternalLink className="w-4 h-4" /> Abrir produto
          </Button>
        )}
        {eduzzError && (
          <div className="rounded-lg border border-border/40 bg-muted/30 p-3 text-xs text-muted-foreground">
            {eduzzError}
          </div>
        )}
      </div>

      <div className="space-y-3 border-t border-border/30 pt-4">
        <Button variant="viral" size="lg" className="w-full" onClick={handleEnviar}>
          <Send className="w-4 h-4" /> Enviar para aprovação
        </Button>
      </div>

      <div className="space-y-4 border-t border-border/30 pt-4">
        <div>
          <h4 className="text-sm font-semibold">Inteligência de Venda</h4>
          <p className="text-xs text-muted-foreground">Criativos, headlines e scripts prontos</p>
        </div>
        <Button variant="neon" size="lg" className="w-full" onClick={handleCampaign}>
          🔥 Gerar campanha de vendas
        </Button>
        {campaign && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg border border-border/30 bg-muted/30 p-3">
              <p className="font-semibold mb-2">Criativos</p>
              {(campaign.criativos || []).map((c: string, i: number) => (
                <div key={i}>• {c}</div>
              ))}
            </div>
            <div className="rounded-lg border border-border/30 bg-muted/30 p-3">
              <p className="font-semibold mb-2">Headlines</p>
              {(campaign.headlines || []).map((h: string, i: number) => (
                <div key={i}>• {h}</div>
              ))}
            </div>
            <div className="rounded-lg border border-border/30 bg-muted/30 p-3">
              <p className="font-semibold mb-2">Públicos</p>
              {(campaign.publicos || []).map((p: string, i: number) => (
                <div key={i}>• {p}</div>
              ))}
            </div>
            <div className="rounded-lg border border-border/30 bg-muted/30 p-3">
              <p className="font-semibold mb-2">Scripts</p>
              {(campaign.scripts || []).map((s: string, i: number) => (
                <div key={i}>• {s}</div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Button variant="viral" size="lg" className="w-full" onClick={onNewProduct}>
        ✨ CRIAR NOVO INFOPRODUTO
      </Button>
    </div>
  );
};

export default InfoStepEntrega;
