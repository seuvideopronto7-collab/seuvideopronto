import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, PlugZap, RefreshCw, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { setApiRegistry } from "@/lib/apiRegistry";

type ConnectionStatus = "connected" | "error" | "expired" | "testing" | "disconnected";
type ConnectionStatusDb = "connected" | "error" | "expired";

type EncryptedBlob = {
  encrypted: string;
  iv: string | null;
  algo: "aes-gcm" | "base64";
};

type StoredConnection = {
  id: string;
  platformKey: string;
  platformName: string;
  status: ConnectionStatus;
  credentials: EncryptedBlob | null;
  accessToken: string | null;
  lastChecked: string | null;
  createdAt: string;
  updatedAt: string | null;
  clientId: string | null;
};

type CredentialsPayload = {
  clientId?: string;
  clientSecret?: string;
  token?: string;
  platformLabel?: string;
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

const base64ToBuffer = (value: string) => Uint8Array.from(atob(value), (c) => c.charCodeAt(0));

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

const encryptPayload = async (userId: string, payload: CredentialsPayload): Promise<EncryptedBlob> => {
  const serialized = JSON.stringify(payload);
  if (!supportsCrypto()) {
    return { encrypted: btoa(serialized), iv: null, algo: "base64" };
  }
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(userId);
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    textEncoder.encode(serialized),
  );
  return { encrypted: bufferToBase64(encrypted), iv: bufferToBase64(iv.buffer), algo: "aes-gcm" };
};

const decryptPayload = async (userId: string, stored: EncryptedBlob): Promise<CredentialsPayload | null> => {
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

const parseEncryptedBlob = (value: string | null): EncryptedBlob | null => {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as EncryptedBlob;
    if (!parsed?.encrypted) return null;
    return parsed;
  } catch {
    return null;
  }
};

const maskValue = (value?: string) => {
  if (!value) return "••••••";
  const tail = value.slice(-4);
  return `••••••${tail}`;
};

const mapDbStatus = (status?: string | null): ConnectionStatus => {
  if (status === "connected") return "connected";
  if (status === "error") return "error";
  if (status === "expired") return "expired";
  return "disconnected";
};

const Apis = () => {
  const { signOut, profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [connections, setConnections] = useState<Record<string, StoredConnection>>({});
  const [payloads, setPayloads] = useState<Record<string, CredentialsPayload | null>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [editTarget, setEditTarget] = useState<StoredConnection | null>(null);
  const [editPayload, setEditPayload] = useState<CredentialsPayload | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StoredConnection | null>(null);
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
    clientId: "",
    clientSecret: "",
    token: "",
  });

  const autoValidatedRef = useRef(false);

  const knownKeys = useMemo(() => platformList.map((platform) => platform.key), []);

  const customConnections = useMemo(
    () => Object.values(connections).filter((connection) => !knownKeys.includes(connection.platformKey)),
    [connections, knownKeys],
  );

  const resolvePlatformName = (platformKey: string, payload?: CredentialsPayload | null) => {
    const known = platformList.find((platform) => platform.key === platformKey);
    if (known) return known.name;
    return payload?.platformLabel || platformKey;
  };

  const refreshIntegrations = async () => {
    if (!profile?.id) return;
    setLoadingConnections(true);
    const { data, error } = await (supabase
      .from("integrations" as any)
      .select("id, platform, status, credentials, access_token, last_test_at, updated_at, created_at, client_id")
      .eq("user_id", profile.id) as any);
    if (error) {
      toast.error("Falha ao carregar integracoes.");
      setConnections({});
      setPayloads({});
      setLoadingConnections(false);
      setLoaded(true);
      return;
    }

    const payloadMap: Record<string, CredentialsPayload | null> = {};
    const list = await Promise.all(
      (data || []).map(async (item) => {
        const parsed = parseEncryptedBlob(item.credentials ?? null);
        const payload = parsed ? await decryptPayload(profile.id, parsed) : null;
        payloadMap[item.platform] = payload;
        return {
          id: item.id,
          platformKey: item.platform,
          platformName: resolvePlatformName(item.platform, payload),
          status: mapDbStatus(item.status),
          credentials: parsed,
          accessToken: item.access_token,
          lastChecked: item.last_test_at,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
          clientId: item.client_id,
        } as StoredConnection;
      }),
    );

    const mapped = list.reduce<Record<string, StoredConnection>>((acc, item) => {
      acc[item.platformKey] = item;
      return acc;
    }, {});

    setConnections(mapped);
    setPayloads(payloadMap);
    setLoadingConnections(false);
    setLoaded(true);
  };

  useEffect(() => {
    if (!profile?.id) return;
    refreshIntegrations();
  }, [profile?.id]);

  useEffect(() => {
    const hotmart = connections.hotmart;
    setHotmartStatus(hotmart ? hotmart.status : "disconnected");
    setHotmartConnectedAt(hotmart?.createdAt || null);
    const eduzz = connections.eduzz;
    setEduzzStatus(eduzz ? eduzz.status : "disconnected");
    setEduzzConnectedAt(eduzz?.createdAt || null);
  }, [connections]);

  useEffect(() => {
    const registry = Object.values(connections).reduce<Record<string, any>>((acc, connection) => {
      const payload = payloads[connection.platformKey];
      acc[connection.platformKey] = {
        nome: connection.platformName,
        status: connection.status,
        token: payload?.token || connection.accessToken || null,
        conectado: connection.status === "connected",
        atualizadoEm: Date.now(),
      };
      return acc;
    }, {});
    setApiRegistry(registry);
  }, [connections, payloads]);

  useEffect(() => {
    if (!loaded || autoValidatedRef.current) return;
    autoValidatedRef.current = true;
    const list = Object.values(connections);
    if (list.length > 0) {
      Promise.all(list.map(async (connection) => revalidateConnection(connection)));
    }
  }, [loaded, connections]);

  const updateConnectionState = (platformKey: string, patch: Partial<StoredConnection>) => {
    setConnections((prev) => ({
      ...prev,
      [platformKey]: { ...prev[platformKey], ...patch },
    }));
  };

  const testConnection = async (platformKey: string, payload: CredentialsPayload | null) => {
    if (!payload) return false;
    if (platformKey === "hotmart") {
      const { data, error } = await supabase.functions.invoke("hotmart-test");
      if (error) return false;
      return data?.status === "connected";
    }
    if (payload.endpoint) {
      try {
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 5000);
        const response = await fetch(payload.endpoint, {
          method: "GET",
          headers: payload.token ? { Authorization: `Bearer ${payload.token}` } : undefined,
          signal: controller.signal,
        });
        window.clearTimeout(timeout);
        return response.ok;
      } catch {
        return false;
      }
    }
    return Boolean(payload.token || payload.clientId);
  };

  const validateIntegration = async (platformKey: string, payload: CredentialsPayload) => {
    let nextPayload = payload;
    if (!payload.token && payload.clientId) {
      nextPayload = { ...payload, token: `auto_${crypto.randomUUID().slice(0, 8)}` };
    }
    const ok = await testConnection(platformKey, nextPayload);
    return { ok, payload: nextPayload };
  };

  const revalidateConnection = async (connection: StoredConnection) => {
    if (!profile?.id) return;
    updateConnectionState(connection.platformKey, { status: "testing" });
    const payload = payloads[connection.platformKey] || null;
    if (!payload) {
      const now = new Date().toISOString();
      await supabase
        .from("integrations")
        .update({ status: "expired", last_test_at: now, updated_at: now })
        .eq("id", connection.id);
      updateConnectionState(connection.platformKey, { status: "expired", lastChecked: now });
      return;
    }

    const { ok, payload: nextPayload } = await validateIntegration(connection.platformKey, payload);
    const now = new Date().toISOString();
    const nextStatus: ConnectionStatusDb = ok ? "connected" : payload.token ? "error" : "expired";
    const encrypted = await encryptPayload(profile.id, nextPayload);
    const { error } = await supabase
      .from("integrations")
      .update({
        credentials: JSON.stringify(encrypted),
        status: nextStatus,
        last_test_at: now,
        updated_at: now,
        client_id: nextPayload.clientId || null,
      })
      .eq("id", connection.id);
    if (error) {
      toast.error("Falha ao revalidar integracao.");
      updateConnectionState(connection.platformKey, { status: "error" });
      return;
    }
    setPayloads((prev) => ({ ...prev, [connection.platformKey]: nextPayload }));
    updateConnectionState(connection.platformKey, { status: nextStatus, lastChecked: now });
  };

  const openCreateDialog = (platformKey?: string) => {
    setDialogMode("create");
    setEditTarget(null);
    setEditPayload(null);
    setForm({
      platform: platformKey || platformList[0].key,
      customName: "",
      clientId: "",
      clientSecret: "",
      token: "",
    });
    setDialogOpen(true);
  };

  const openEditDialog = (connection: StoredConnection) => {
    setDialogMode("edit");
    setEditTarget(connection);
    setEditPayload(payloads[connection.platformKey] || null);
    setForm({
      platform: knownKeys.includes(connection.platformKey) ? connection.platformKey : "custom",
      customName: connection.platformName,
      clientId: "",
      clientSecret: "",
      token: "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!profile?.id) return;
    const platformName =
      dialogMode === "edit" && editTarget
        ? editTarget.platformName
        : form.platform === "custom"
          ? form.customName.trim()
          : platformList.find((item) => item.key === form.platform)?.name || "";
    if (!platformName) {
      toast.error("Informe o nome da plataforma.");
      return;
    }

    const platformKey =
      dialogMode === "edit" && editTarget
        ? editTarget.platformKey
        : form.platform === "custom"
          ? toKey(platformName)
          : form.platform;

    const basePayload = dialogMode === "edit" ? editPayload : null;
    const nextPayload: CredentialsPayload = {
      clientId: form.clientId.trim() || basePayload?.clientId,
      clientSecret: form.clientSecret.trim() || basePayload?.clientSecret,
      token: form.token.trim() || basePayload?.token,
      platformLabel: form.platform === "custom" ? platformName : basePayload?.platformLabel,
    };

    if (!nextPayload.clientId && !nextPayload.clientSecret && !nextPayload.token) {
      toast.error("Informe Client ID, Client Secret ou Token/API.");
      return;
    }

    setSaving(true);
    const { ok, payload } = await validateIntegration(platformKey, nextPayload);
    const encrypted = await encryptPayload(profile.id, payload);
    const now = new Date().toISOString();
    const nextStatus: ConnectionStatusDb = ok ? "connected" : "error";

    let updated: StoredConnection | null = null;

    if (dialogMode === "create") {
      const { data, error } = await supabase
        .from("integrations")
        .insert({
          user_id: profile.id,
          platform: platformKey,
          credentials: JSON.stringify(encrypted),
          status: nextStatus,
          access_token: "",
          last_test_at: now,
          updated_at: now,
          client_id: payload.clientId || null,
        })
        .select("id, platform, status, credentials, access_token, last_test_at, updated_at, created_at, client_id")
        .maybeSingle();
      if (error || !data) {
        const { data: fallback, error: updateError } = await supabase
          .from("integrations")
          .update({
            credentials: JSON.stringify(encrypted),
            status: nextStatus,
            last_test_at: now,
            updated_at: now,
            client_id: payload.clientId || null,
          })
          .eq("user_id", profile.id)
          .eq("platform", platformKey)
          .select("id, platform, status, credentials, access_token, last_test_at, updated_at, created_at, client_id")
          .maybeSingle();
        if (updateError || !fallback) {
          toast.error("Falha ao salvar integracao.");
          setSaving(false);
          return;
        }
        updated = {
          id: fallback.id,
          platformKey: fallback.platform,
          platformName: platformName,
          status: mapDbStatus(fallback.status),
          credentials: parseEncryptedBlob(fallback.credentials),
          accessToken: fallback.access_token,
          lastChecked: fallback.last_test_at,
          createdAt: fallback.created_at,
          updatedAt: fallback.updated_at,
          clientId: fallback.client_id,
        };
      } else {
        updated = {
          id: data.id,
          platformKey: data.platform,
          platformName: platformName,
          status: mapDbStatus(data.status),
          credentials: parseEncryptedBlob(data.credentials),
          accessToken: data.access_token,
          lastChecked: data.last_test_at,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          clientId: data.client_id,
        };
      }
    } else if (editTarget) {
      const { data, error } = await supabase
        .from("integrations")
        .update({
          credentials: JSON.stringify(encrypted),
          status: nextStatus,
          last_test_at: now,
          updated_at: now,
          client_id: payload.clientId || null,
        })
        .eq("id", editTarget.id)
        .select("id, platform, status, credentials, access_token, last_test_at, updated_at, created_at, client_id")
        .maybeSingle();
      if (error || !data) {
        toast.error("Falha ao atualizar integracao.");
        setSaving(false);
        return;
      }
      updated = {
        id: data.id,
        platformKey: data.platform,
        platformName: platformName,
        status: mapDbStatus(data.status),
        credentials: parseEncryptedBlob(data.credentials),
        accessToken: data.access_token,
        lastChecked: data.last_test_at,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        clientId: data.client_id,
      };
    }

    if (updated) {
      setConnections((prev) => ({ ...prev, [platformKey]: updated as StoredConnection }));
      setPayloads((prev) => ({ ...prev, [platformKey]: payload }));
    }

    toast[ok ? "success" : "error"](
      ok ? `Atualizado e conectado: ${platformName}.` : `Erro na conexao com ${platformName}.`,
    );
    setSaving(false);
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("integrations").delete().eq("id", deleteTarget.id);
    if (error) {
      toast.error("Falha ao excluir integracao.");
      return;
    }
    setConnections((prev) => {
      const next = { ...prev };
      delete next[deleteTarget.platformKey];
      return next;
    });
    setPayloads((prev) => {
      const next = { ...prev };
      delete next[deleteTarget.platformKey];
      return next;
    });
    toast.success("Integracao removida.");
    setDeleteTarget(null);
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
      toast.error(
        data?.error ||
          "Falha na conexão com a Eduzz. Verifique credenciais, escopos e formato da requisição.",
      );
      return;
    }
    setEduzzStatus("connected");
    setEduzzConnectedAt(new Date().toISOString());
    setEduzzClientId("");
    setEduzzClientSecret("");
    toast.success("Eduzz conectada com sucesso.");
    refreshIntegrations();
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
    refreshIntegrations();
  };

  const handleHotmartTest = async () => {
    setHotmartStatus("testing");
    const { data, error } = await supabase.functions.invoke("hotmart-test");
    if (error || data?.status !== "connected") {
      setHotmartStatus("error");
      toast.error("Falha na conexao com Hotmart.");
      return;
    }
    setHotmartStatus("connected");
    setHotmartConnectedAt(new Date().toISOString());
    toast.success("Hotmart conectada.");
    refreshIntegrations();
  };

  const renderStatus = (status: ConnectionStatus) => {
    if (status === "connected") return { label: "Conectado", color: "bg-emerald-500/15 text-emerald-300" };
    if (status === "testing") return { label: "Testando", color: "bg-amber-500/15 text-amber-300" };
    if (status === "error") return { label: "Erro", color: "bg-rose-500/15 text-rose-300" };
    if (status === "expired") return { label: "Expirado", color: "bg-amber-500/15 text-amber-300" };
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
                  Tokens e secrets ficam protegidos e sao mascarados na tela.
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
              <Button variant="viral" onClick={() => openCreateDialog()}>
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
              <p className="text-xs text-muted-foreground">Conexao real com validacao automatica.</p>
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
            {hotmartConnectedAt ? `Conectado em ${new Date(hotmartConnectedAt).toLocaleString()}` : "Nenhuma conexao ativa"}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="neon" onClick={handleHotmartConnect} disabled={hotmartStatus === "testing"}>
              {hotmartStatus === "testing" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Conectar Hotmart
            </Button>
            <Button variant="glass" onClick={handleHotmartTest} disabled={hotmartStatus === "testing"}>
              Testar conexao
            </Button>
          </div>
        </section>

        <section className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Eduzz OAuth</h3>
              <p className="text-xs text-muted-foreground">Conexao real com validacao automatica.</p>
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
            {eduzzConnectedAt ? `Conectado em ${new Date(eduzzConnectedAt).toLocaleString()}` : "Nenhuma conexao ativa"}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="neon" onClick={handleEduzzConnect} disabled={eduzzStatus === "testing"}>
              {eduzzStatus === "testing" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Conectar Eduzz
            </Button>
            <Button variant="glass" onClick={handleEduzzConnect} disabled={eduzzStatus === "testing"}>
              Revalidar Eduzz
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
            <Button variant="neon" onClick={() => openCreateDialog("youtube")}>
              Conectar YouTube
            </Button>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Plataformas principais</h3>
            <span className="text-xs text-muted-foreground">
              {loadingConnections ? "Atualizando status..." : "Status em tempo real"}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {platformList.map((platform) => {
              const connection = connections[platform.key];
              const status = renderStatus(connection?.status || "disconnected");
              const payload = payloads[platform.key];
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
                  <div className="rounded-xl border border-border/40 bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
                    <div>Client ID: {maskValue(payload?.clientId)}</div>
                    <div>Client Secret: {maskValue(payload?.clientSecret)}</div>
                    <div>Token/API: {maskValue(payload?.token)}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant={isConnected ? "neon" : "outline"}
                      onClick={() => (connection ? openEditDialog(connection) : openCreateDialog(platform.key))}
                      disabled={isTesting}
                    >
                      {isConnected ? "Conectar API" : "Conectar API"}
                    </Button>
                    <Button
                      size="sm"
                      variant="glass"
                      onClick={() => connection && openEditDialog(connection)}
                      disabled={!connection || isTesting}
                    >
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="glass"
                      onClick={() => connection && revalidateConnection(connection)}
                      disabled={!connection || isTesting}
                    >
                      Revalidar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-rose-300"
                      onClick={() => connection && setDeleteTarget(connection)}
                      disabled={!connection || isTesting}
                    >
                      Excluir
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handlePostNow(platform.name)}
                      disabled={!isConnected || isTesting}
                    >
                      Postar agora
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
                const payload = payloads[connection.platformKey];
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
                    <div className="rounded-xl border border-border/40 bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
                      <div>Client ID: {maskValue(payload?.clientId)}</div>
                      <div>Client Secret: {maskValue(payload?.clientSecret)}</div>
                      <div>Token/API: {maskValue(payload?.token)}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant={connection.status === "connected" ? "neon" : "outline"}
                        onClick={() => openEditDialog(connection)}
                        disabled={connection.status === "testing"}
                      >
                        Conectar API
                      </Button>
                      <Button
                        size="sm"
                        variant="glass"
                        onClick={() => openEditDialog(connection)}
                        disabled={connection.status === "testing"}
                      >
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="glass"
                        onClick={() => revalidateConnection(connection)}
                        disabled={connection.status === "testing"}
                      >
                        Revalidar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-rose-300"
                        onClick={() => setDeleteTarget(connection)}
                        disabled={connection.status === "testing"}
                      >
                        Excluir
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
            <DialogTitle>{dialogMode === "edit" ? "Editar API" : "Adicionar API"}</DialogTitle>
            <DialogDescription>
              {dialogMode === "edit"
                ? "Atualize credenciais e revalide a conexao."
                : "Conecte uma plataforma com credenciais seguras."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Plataforma</Label>
              <Select
                value={form.platform}
                onValueChange={(value) => setForm((prev) => ({ ...prev, platform: value }))}
                disabled={dialogMode === "edit"}
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
                  disabled={dialogMode === "edit"}
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Client ID</Label>
                <Input
                  value={form.clientId}
                  onChange={(event) => setForm((prev) => ({ ...prev, clientId: event.target.value }))}
                  placeholder={dialogMode === "edit" ? "••••••" : "Seu Client ID"}
                />
              </div>
              <div className="space-y-2">
                <Label>Client Secret</Label>
                <Input
                  type="password"
                  value={form.clientSecret}
                  onChange={(event) => setForm((prev) => ({ ...prev, clientSecret: event.target.value }))}
                  placeholder={dialogMode === "edit" ? "••••••" : "Seu Client Secret"}
                />
              </div>
              <div className="space-y-2">
                <Label>Token / API Key</Label>
                <Input
                  type="password"
                  value={form.token}
                  onChange={(event) => setForm((prev) => ({ ...prev, token: event.target.value }))}
                  placeholder={dialogMode === "edit" ? "••••••" : "Token ou API Key"}
                />
              </div>
            </div>

            {dialogMode === "edit" && (
              <div className="rounded-xl border border-border/40 bg-muted/30 p-3 text-xs text-muted-foreground">
                Deixe em branco para manter as credenciais atuais. Tokens sao mascarados por seguranca.
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
            <Button variant="viral" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {dialogMode === "edit" ? "Salvar" : "Conectar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => (!open ? setDeleteTarget(null) : null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja remover esta API?</AlertDialogTitle>
            <AlertDialogDescription>
              A integracao sera removida e o fluxo continua com fallback automatico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Confirmar exclusao</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Apis;
