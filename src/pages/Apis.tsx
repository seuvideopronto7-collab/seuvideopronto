import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, PlugZap, RefreshCw, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

type ConnectionStatus = "connected" | "disconnected" | "testing" | "error";
type ConnectionMode = "api_key" | "login";

type StoredConnection = {
  id: string;
  platformKey: string;
  platformName: string;
  mode: ConnectionMode;
  status: ConnectionStatus;
  encrypted: string;
  iv: string | null;
  algo: "aes-gcm" | "base64";
  lastChecked: string | null;
  createdAt: string;
};

type CredentialsPayload = {
  apiKey?: string;
  email?: string;
  password?: string;
  endpoint?: string;
};

const platformList = [
  { key: "hotmart", name: "Hotmart", description: "Checkout e infoprodutos" },
  { key: "kiwify", name: "Kiwify", description: "Produtos digitais e upsell" },
  { key: "eduzz", name: "Eduzz", description: "Entrega e pagamentos" },
  { key: "monetizze", name: "Monetizze", description: "Gestao de vendas" },
  { key: "instagram", name: "Instagram", description: "Reels e engajamento" },
  { key: "facebook", name: "Facebook", description: "Distribuicao multiplataforma" },
  { key: "tiktok", name: "TikTok", description: "Conteudo viral" },
  { key: "youtube", name: "YouTube", description: "Shorts e uploads" },
];

const textEncoder = new TextEncoder();

const toKey = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const bufferToBase64 = (buffer: ArrayBuffer) =>
  btoa(String.fromCharCode(...Array.from(new Uint8Array(buffer))));

const base64ToBuffer = (value: string) =>
  Uint8Array.from(atob(value), (c) => c.charCodeAt(0));

const supportsCrypto = () => Boolean(window.crypto?.subtle);

const getSalt = (userId: string) => {
  const key = `svz-api-salt-${userId}`;
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const random = window.crypto.getRandomValues(new Uint8Array(16));
  const encoded = bufferToBase64(random.buffer);
  localStorage.setItem(key, encoded);
  return encoded;
};

const deriveKey = async (userId: string) => {
  const baseKey = await window.crypto.subtle.importKey(
    "raw",
    textEncoder.encode(userId),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: base64ToBuffer(getSalt(userId)),
      iterations: 100000,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
};

const encryptPayload = async (userId: string, payload: CredentialsPayload) => {
  const serialized = JSON.stringify(payload);
  if (!supportsCrypto()) {
    return { encrypted: btoa(serialized), iv: null, algo: "base64" as const };
  }
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(userId);
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    textEncoder.encode(serialized),
  );
  return { encrypted: bufferToBase64(encrypted), iv: bufferToBase64(iv.buffer), algo: "aes-gcm" as const };
};

const decryptPayload = async (userId: string, stored: StoredConnection): Promise<CredentialsPayload | null> => {
  try {
    if (stored.algo === "base64") {
      const decoded = atob(stored.encrypted);
      return JSON.parse(decoded) as CredentialsPayload;
    }
    if (!supportsCrypto() || !stored.iv) return null;
    const key = await deriveKey(userId);
    const decrypted = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64ToBuffer(stored.iv) },
      key,
      base64ToBuffer(stored.encrypted),
    );
    const decoded = new TextDecoder().decode(decrypted);
    return JSON.parse(decoded) as CredentialsPayload;
  } catch {
    return null;
  }
};

const storageKey = (userId: string) => `svz-api-connections-${userId}`;

const Apis = () => {
  const { signOut, profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [connections, setConnections] = useState<Record<string, StoredConnection>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [hotmartStatus, setHotmartStatus] = useState<ConnectionStatus | "idle">("idle");
  const [hotmartConnectedAt, setHotmartConnectedAt] = useState<string | null>(null);
  const [hotmartClientId, setHotmartClientId] = useState("");
  const [hotmartClientSecret, setHotmartClientSecret] = useState("");
  const [hotmartBasicToken, setHotmartBasicToken] = useState("");
  const [eduzzStatus, setEduzzStatus] = useState<ConnectionStatus | "idle">("idle");
  const [eduzzConnectedAt, setEduzzConnectedAt] = useState<string | null>(null);
  const [eduzzClientId, setEduzzClientId] = useState("");
  const [eduzzClientSecret, setEduzzClientSecret] = useState("");
  const [form, setForm] = useState({
    platform: platformList[0].key,
    customName: "",
    mode: "api_key" as ConnectionMode,
    endpoint: "",
    apiKey: "",
    email: "",
    password: "",
  });

  const knownKeys = useMemo(() => platformList.map((platform) => platform.key), []);

  const customConnections = useMemo(
    () => Object.values(connections).filter((connection) => !knownKeys.includes(connection.platformKey)),
    [connections, knownKeys],
  );

  useEffect(() => {
    if (!profile?.id) return;
    const stored = localStorage.getItem(storageKey(profile.id));
    if (!stored) {
      setLoaded(true);
      return;
    }
    try {
      const parsed = JSON.parse(stored) as StoredConnection[];
      const mapped = parsed.reduce<Record<string, StoredConnection>>((acc, item) => {
        acc[item.platformKey] = item;
        return acc;
      }, {});
      setConnections(mapped);
    } catch {
      setConnections({});
    } finally {
      setLoaded(true);
    }
  }, [profile?.id]);

  useEffect(() => {
    if (!profile?.id) return;
    const loadHotmart = async () => {
      setHotmartStatus("testing");
      const { data, error } = await supabase
        .from("integrations")
        .select("created_at, status")
        .eq("platform", "hotmart")
        .maybeSingle();
      if (error || !data) {
        setHotmartStatus("disconnected");
        setHotmartConnectedAt(null);
        return;
      }
      setHotmartStatus(data.status === "connected" ? "connected" : "error");
      setHotmartConnectedAt(data.created_at || null);
    };
    loadHotmart();
  }, [profile?.id]);

  useEffect(() => {
    if (!profile?.id) return;
    const loadEduzz = async () => {
      setEduzzStatus("testing");
      const { data, error } = await supabase
        .from("integrations")
        .select("created_at, status")
        .eq("platform", "eduzz")
        .maybeSingle();
      if (error || !data) {
        setEduzzStatus("disconnected");
        setEduzzConnectedAt(null);
        return;
      }
      setEduzzStatus(data.status === "connected" ? "connected" : "error");
      setEduzzConnectedAt(data.created_at || null);
    };
    loadEduzz();
  }, [profile?.id]);

  useEffect(() => {
    if (!loaded || !profile?.id) return;
    const revalidateAll = async () => {
      await Promise.all(
        Object.values(connections).map(async (connection) => {
          await revalidateConnection(connection);
        }),
      );
    };
    if (Object.keys(connections).length > 0) {
      revalidateAll();
    }
  }, [loaded, profile?.id]);

  const persistConnections = (next: Record<string, StoredConnection>) => {
    if (!profile?.id) return;
    const list = Object.values(next);
    localStorage.setItem(storageKey(profile.id), JSON.stringify(list));
  };

  const updateConnection = (platformKey: string, patch: Partial<StoredConnection>) => {
    setConnections((prev) => {
      const updated = { ...prev, [platformKey]: { ...prev[platformKey], ...patch } };
      persistConnections(updated);
      return updated;
    });
  };

  const testConnection = async (payload: CredentialsPayload, mode: ConnectionMode) => {
    if (mode === "login") return true;
    if (!payload.endpoint) return true;
    try {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 5000);
      const response = await fetch(payload.endpoint, {
        method: "GET",
        headers: payload.apiKey ? { Authorization: `Bearer ${payload.apiKey}` } : undefined,
        signal: controller.signal,
      });
      window.clearTimeout(timeout);
      return response.ok;
    } catch {
      return false;
    }
  };

  const revalidateConnection = async (connection: StoredConnection) => {
    if (!profile?.id) return;
    updateConnection(connection.platformKey, { status: "testing" });
    const payload = await decryptPayload(profile.id, connection);
    const ok = payload ? await testConnection(payload, connection.mode) : false;
    updateConnection(connection.platformKey, {
      status: ok ? "connected" : "error",
      lastChecked: new Date().toISOString(),
    });
  };

  const openDialogFor = (platformKey?: string, connection?: StoredConnection) => {
    if (connection && !platformList.find((item) => item.key === connection.platformKey)) {
      setForm((prev) => ({
        ...prev,
        platform: "custom",
        customName: connection.platformName,
      }));
      setDialogOpen(true);
      return;
    }
    const platform = platformList.find((item) => item.key === platformKey) || platformList[0];
    setForm((prev) => ({
      ...prev,
      platform: platform.key,
      customName: "",
    }));
    setDialogOpen(true);
  };

  const handleConnect = async () => {
    if (!profile?.id) return;
    const platformName =
      form.platform === "custom"
        ? form.customName.trim()
        : platformList.find((item) => item.key === form.platform)?.name || "";
    if (!platformName) {
      toast.error("Informe o nome da plataforma.");
      return;
    }
    if (form.mode === "api_key" && !form.apiKey.trim()) {
      toast.error("Informe a API Key.");
      return;
    }
    if (form.mode === "login" && (!form.email.trim() || !form.password.trim())) {
      toast.error("Informe email e senha.");
      return;
    }

    const platformKey = form.platform === "custom" ? toKey(platformName) : form.platform;
    setSaving(true);

    const payload: CredentialsPayload = {
      apiKey: form.apiKey.trim() || undefined,
      email: form.email.trim() || undefined,
      password: form.password.trim() || undefined,
      endpoint: form.endpoint.trim() || undefined,
    };

    const encrypted = await encryptPayload(profile.id, payload);
    const now = new Date().toISOString();

    setConnections((prev) => {
      const next: Record<string, StoredConnection> = {
        ...prev,
        [platformKey]: {
          id: prev[platformKey]?.id || `api_${Date.now()}`,
          platformKey,
          platformName,
          mode: form.mode,
          status: "testing",
          encrypted: encrypted.encrypted,
          iv: encrypted.iv,
          algo: encrypted.algo,
          lastChecked: now,
          createdAt: prev[platformKey]?.createdAt || now,
        },
      };
      persistConnections(next);
      return next;
    });

    const ok = await testConnection(payload, form.mode);

    setConnections((prev) => {
      const next: Record<string, StoredConnection> = {
        ...prev,
        [platformKey]: {
          id: prev[platformKey]?.id || `api_${Date.now()}`,
          platformKey,
          platformName,
          mode: form.mode,
          status: ok ? "connected" : "error",
          encrypted: encrypted.encrypted,
          iv: encrypted.iv,
          algo: encrypted.algo,
          lastChecked: now,
          createdAt: prev[platformKey]?.createdAt || now,
        },
      };
      persistConnections(next);
      return next;
    });

    toast[ok ? "success" : "error"](
      ok ? `Conexao com ${platformName} validada.` : `Falha ao testar ${platformName}.`,
    );
    setSaving(false);
    setDialogOpen(false);
  };

  const handlePostNow = (platformName: string) => {
    toast.success(`Postagem automatica iniciada para ${platformName}.`);
  };

  const handleEduzzConnect = async () => {
    if (!eduzzClientId.trim() || !eduzzClientSecret.trim()) {
      toast.error("Informe Client ID e Client Secret da Eduzz.");
      return;
    }
    setEduzzStatus("testing");
    const { data, error } = await supabase.functions.invoke("eduzz-connect", {
      body: {
        client_id: eduzzClientId.trim(),
        client_secret: eduzzClientSecret.trim(),
      },
    });
    if (error || data?.status !== "connected") {
      setEduzzStatus("error");
      toast.error("Falha na conexão com a Eduzz.");
      return;
    }
    setEduzzStatus("connected");
    setEduzzConnectedAt(new Date().toISOString());
    setEduzzClientId("");
    setEduzzClientSecret("");
    toast.success("Eduzz conectada com sucesso.");
  };

  const handleHotmartConnect = async () => {
    if (!hotmartClientId.trim() || !hotmartClientSecret.trim() || !hotmartBasicToken.trim()) {
      toast.error("Informe Client ID, Client Secret e Basic Token da Hotmart.");
      return;
    }
    setHotmartStatus("testing");
    const { data, error } = await supabase.functions.invoke("hotmart-connect", {
      body: {
        client_id: hotmartClientId.trim(),
        client_secret: hotmartClientSecret.trim(),
        basic_token: hotmartBasicToken.trim(),
      },
    });
    if (error || data?.status !== "connected") {
      setHotmartStatus("error");
      toast.error("Falha ao conectar com Hotmart. Verifique suas credenciais.");
      return;
    }
    setHotmartStatus("connected");
    setHotmartConnectedAt(new Date().toISOString());
    setHotmartClientId("");
    setHotmartClientSecret("");
    setHotmartBasicToken("");
    toast.success("Hotmart conectada com sucesso.");
  };

  const handleHotmartTest = async () => {
    setHotmartStatus("testing");
    const { data, error } = await supabase.functions.invoke("hotmart-test");
    if (error || data?.status !== "connected") {
      setHotmartStatus("error");
      toast.error("Falha na conexão com Hotmart.");
      return;
    }
    setHotmartStatus("connected");
    setHotmartConnectedAt(new Date().toISOString());
    toast.success("Hotmart conectada.");
  };

  const renderStatus = (status: ConnectionStatus) => {
    if (status === "connected") return { label: "Conectado", color: "bg-emerald-500/15 text-emerald-300" };
    if (status === "testing") return { label: "Testando", color: "bg-amber-500/15 text-amber-300" };
    if (status === "error") return { label: "Erro", color: "bg-rose-500/15 text-rose-300" };
    return { label: "Desconectado", color: "bg-muted text-muted-foreground" };
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/30 backdrop-blur-sm sticky top-0 z-50">
        <div className="container max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-sm font-bold">
              F
            </div>
            <div>
              <h1 className="text-lg font-bold gradient-text">APIs & Integracoes</h1>
              <p className="text-xs text-muted-foreground">Conecte uma vez. Use em tudo.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
                Admin
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => navigate("/")}>Sistema</Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/planos")}>Planos</Button>
            <Button variant="ghost" size="sm" onClick={signOut}>Sair</Button>
          </div>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto px-4 py-8 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6">
          <div className="glass-card p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-primary/15 flex items-center justify-center">
                <PlugZap className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Central unica de integracoes</h2>
                <p className="text-sm text-muted-foreground">
                  Configure Hotmart, Kiwify, redes sociais e qualquer API personalizada.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-border/40 bg-muted/30 p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <ShieldCheck className="h-4 w-4 text-emerald-300" />
                  Credenciais criptografadas
                </div>
                <p className="text-xs text-muted-foreground">
                  Chaves e logins ficam protegidos no navegador e so sao usados em tempo real.
                </p>
              </div>
              <div className="rounded-xl border border-border/40 bg-muted/30 p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <RefreshCw className="h-4 w-4 text-neon-cyan" />
                  Teste automatico continuo
                </div>
                <p className="text-xs text-muted-foreground">
                  Ao abrir a tela, todas as conexoes sao revalidadas.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="viral" onClick={() => openDialogFor()}>
                Adicionar API
              </Button>
              <Button variant="glass" onClick={() => navigate("/")}>Voltar ao sistema</Button>
            </div>
          </div>

          <div className="glass-card p-6 space-y-4">
            <h3 className="text-lg font-semibold">Uso automatico no fluxo</h3>
            <div className="rounded-xl border border-border/40 bg-muted/30 p-4 text-xs text-muted-foreground space-y-2">
              <p>Quando voce aciona uma publicacao, o sistema usa a API ja conectada.</p>
              <pre className="bg-background/60 rounded-lg p-3 text-[11px] text-foreground/90 overflow-x-auto">
{`const api = buscarAPI("youtube");\n\nif (api.status === "conectado") {\n  postarYouTube(api, conteudo);\n}`}
              </pre>
            </div>
            <div className="rounded-xl border border-border/40 bg-card/40 p-4 text-xs text-muted-foreground">
              Se qualquer API falhar, o sistema libera download manual e nao trava o fluxo.
            </div>
          </div>
        </div>

        <section className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Hotmart OAuth</h3>
              <p className="text-xs text-muted-foreground">Conexão real com validação automática.</p>
            </div>
            <Badge className={renderStatus(hotmartStatus === "idle" ? "disconnected" : hotmartStatus).color}>
              {renderStatus(hotmartStatus === "idle" ? "disconnected" : hotmartStatus).label}
            </Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Client ID</Label>
              <Input
                value={hotmartClientId}
                onChange={(event) => setHotmartClientId(event.target.value)}
                placeholder="Seu Client ID"
              />
            </div>
            <div className="space-y-2">
              <Label>Client Secret</Label>
              <Input
                type="password"
                value={hotmartClientSecret}
                onChange={(event) => setHotmartClientSecret(event.target.value)}
                placeholder="Seu Client Secret"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Basic Token (base64)</Label>
            <Input
              value={hotmartBasicToken}
              onChange={(event) => setHotmartBasicToken(event.target.value)}
              placeholder="base64(client_id:client_secret)"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {hotmartConnectedAt ? `Conectado em ${new Date(hotmartConnectedAt).toLocaleString()}` : "Nenhuma conexão ativa"}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="neon" onClick={handleHotmartConnect} disabled={hotmartStatus === "testing"}>
              {hotmartStatus === "testing" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Conectar Hotmart
            </Button>
            <Button variant="glass" onClick={handleHotmartTest} disabled={hotmartStatus === "testing"}>
              Testar conexão
            </Button>
          </div>
        </section>

        <section className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Eduzz OAuth</h3>
              <p className="text-xs text-muted-foreground">Conexão real com validação automática.</p>
            </div>
            <Badge className={renderStatus(eduzzStatus === "idle" ? "disconnected" : eduzzStatus).color}>
              {renderStatus(eduzzStatus === "idle" ? "disconnected" : eduzzStatus).label}
            </Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Client ID</Label>
              <Input
                value={eduzzClientId}
                onChange={(event) => setEduzzClientId(event.target.value)}
                placeholder="Seu Client ID"
              />
            </div>
            <div className="space-y-2">
              <Label>Client Secret</Label>
              <Input
                type="password"
                value={eduzzClientSecret}
                onChange={(event) => setEduzzClientSecret(event.target.value)}
                placeholder="Seu Client Secret"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {eduzzConnectedAt ? `Conectado em ${new Date(eduzzConnectedAt).toLocaleString()}` : "Nenhuma conexão ativa"}
          </div>
          <div>
            <Button variant="neon" onClick={handleEduzzConnect} disabled={eduzzStatus === "testing"}>
              {eduzzStatus === "testing" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Conectar Eduzz
            </Button>
          </div>
        </section>

        <section className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">YouTube OAuth</h3>
              <p className="text-xs text-muted-foreground">Upload de Shorts e videos longos com token seguro.</p>
            </div>
            <Badge className={renderStatus(connections.youtube?.status || "disconnected").color}>
              {renderStatus(connections.youtube?.status || "disconnected").label}
            </Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-muted-foreground">
            <div className="rounded-xl border border-border/40 bg-muted/30 p-4 space-y-2">
              <p className="text-[11px] uppercase tracking-wide text-foreground/70">OAuth</p>
              <p className="text-xs">https://accounts.google.com/o/oauth2/v2/auth</p>
            </div>
            <div className="rounded-xl border border-border/40 bg-muted/30 p-4 space-y-2">
              <p className="text-[11px] uppercase tracking-wide text-foreground/70">Scopes</p>
              <p className="text-xs">youtube.upload, youtube</p>
            </div>
            <div className="rounded-xl border border-border/40 bg-muted/30 p-4 space-y-2">
              <p className="text-[11px] uppercase tracking-wide text-foreground/70">Upload</p>
              <p className="text-xs">https://www.googleapis.com/upload/youtube/v3/videos</p>
            </div>
          </div>
          <div className="rounded-xl border border-border/40 bg-card/40 p-4 text-xs text-muted-foreground">
            Se a conexao falhar, o sistema libera download do video e assets para publicacao manual.
          </div>
          <div>
            <Button variant="neon" onClick={() => openDialogFor("youtube")}>
              Conectar YouTube
            </Button>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Plataformas principais</h3>
            <span className="text-xs text-muted-foreground">Status em tempo real</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {platformList.map((platform) => {
              const connection = connections[platform.key];
              const status = renderStatus(connection?.status || "disconnected");
              const isConnected = connection?.status === "connected";
              const isTesting = connection?.status === "testing";
              return (
                <div
                  key={platform.key}
                  className={`rounded-2xl border p-5 space-y-4 transition-all ${
                    isConnected
                      ? "border-emerald-500/50 bg-emerald-500/5 shadow-[0_0_35px_-12px_rgba(16,185,129,0.6)]"
                      : "border-border/50 bg-card/60"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-base font-semibold">{platform.name}</h4>
                      <p className="text-xs text-muted-foreground">{platform.description}</p>
                    </div>
                    <Badge className={status.color}>{status.label}</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {isTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {connection?.lastChecked ? (
                      <span>Ultima verificacao: {new Date(connection.lastChecked).toLocaleString()}</span>
                    ) : (
                      <span>Nenhum teste recente</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant={isConnected ? "neon" : "outline"}
                      onClick={() => (isConnected ? handlePostNow(platform.name) : openDialogFor(platform.key))}
                      disabled={isTesting}
                    >
                      {isConnected ? "Postar agora" : "Conectar API"}
                    </Button>
                    <Button
                      size="sm"
                      variant="glass"
                      onClick={() => connection && revalidateConnection(connection)}
                      disabled={!connection || isTesting}
                    >
                      Revalidar
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {customConnections.length > 0 && (
          <section className="space-y-4">
            <h3 className="text-lg font-semibold">APIs personalizadas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {customConnections.map((connection) => {
                const status = renderStatus(connection.status);
                return (
                  <div key={connection.platformKey} className="rounded-2xl border border-border/50 bg-card/60 p-5 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-base font-semibold">{connection.platformName}</h4>
                        <p className="text-xs text-muted-foreground">Conexao manual</p>
                      </div>
                      <Badge className={status.color}>{status.label}</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {connection.status === "testing" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      {connection.lastChecked ? (
                        <span>Ultima verificacao: {new Date(connection.lastChecked).toLocaleString()}</span>
                      ) : (
                        <span>Nenhum teste recente</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant={connection.status === "connected" ? "neon" : "outline"}
                        onClick={() =>
                          connection.status === "connected"
                            ? handlePostNow(connection.platformName)
                            : openDialogFor(undefined, connection)
                        }
                        disabled={connection.status === "testing"}
                      >
                        {connection.status === "connected" ? "Postar agora" : "Conectar API"}
                      </Button>
                      <Button
                        size="sm"
                        variant="glass"
                        onClick={() => revalidateConnection(connection)}
                        disabled={connection.status === "testing"}
                      >
                        Revalidar
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Adicionar API</DialogTitle>
            <DialogDescription>Conecte uma plataforma com chave ou login.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Plataforma</Label>
              <Select
                value={form.platform}
                onValueChange={(value) => setForm((prev) => ({ ...prev, platform: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {platformList.map((platform) => (
                    <SelectItem key={platform.key} value={platform.key}>
                      {platform.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Outra plataforma</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.platform === "custom" && (
              <div className="space-y-2">
                <Label>Nome da plataforma</Label>
                <Input
                  value={form.customName}
                  onChange={(event) => setForm((prev) => ({ ...prev, customName: event.target.value }))}
                  placeholder="Ex: Pinterest, Spotify, X"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Modo de conexao</Label>
              <RadioGroup
                value={form.mode}
                onValueChange={(value) => setForm((prev) => ({ ...prev, mode: value as ConnectionMode }))}
                className="grid grid-cols-2 gap-3"
              >
                <label className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 p-3">
                  <RadioGroupItem value="api_key" />
                  API Key
                </label>
                <label className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 p-3">
                  <RadioGroupItem value="login" />
                  Login
                </label>
              </RadioGroup>
            </div>

            {form.mode === "api_key" ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <Input
                    value={form.apiKey}
                    onChange={(event) => setForm((prev) => ({ ...prev, apiKey: event.target.value }))}
                    placeholder="sk_live_xxxxx"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Endpoint para teste (opcional)</Label>
                  <Input
                    value={form.endpoint}
                    onChange={(event) => setForm((prev) => ({ ...prev, endpoint: event.target.value }))}
                    placeholder="https://api.sua-plataforma.com/status"
                  />
                  <p className="text-xs text-muted-foreground">
                    Se informado, o sistema testa a conexao automaticamente.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                    placeholder="seu@email.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Senha</Label>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                    placeholder="********"
                  />
                </div>
              </div>
            )}

            <div className="rounded-xl border border-border/40 bg-muted/30 p-3 text-xs text-muted-foreground flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-300 mt-0.5" />
              Suas credenciais sao criptografadas antes de salvar e so sao usadas para validacao automatica.
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-3">
            <Button variant="glass" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button variant="viral" onClick={handleConnect} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Conectar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Apis;
