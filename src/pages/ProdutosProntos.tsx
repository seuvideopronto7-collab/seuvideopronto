import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface ProdutoGerado {
  id: string;
  user_id: string;
  nome: string;
  tipo: string | null;
  nicho: string | null;
  estrutura: any;
  status: "rascunho" | "finalizado" | "publicado" | null;
  created_at: string;
}

const ProdutosProntos = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [produtos, setProdutos] = useState<ProdutoGerado[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"sucesso" | "vazio" | "erro">("sucesso");

  const cacheKey = useMemo(() => (user ? `produtos_prontos_${user.id}` : "produtos_prontos"), [user]);

  const loadFromCache = () => {
    const cached = sessionStorage.getItem(cacheKey);
    if (!cached) return false;
    try {
      const parsed = JSON.parse(cached) as { data: ProdutoGerado[]; ts: number };
      if (Date.now() - parsed.ts > 5 * 60 * 1000) return false;
      const cachedData = parsed.data || [];
      setProdutos(cachedData);
      setStatus(cachedData.length ? "sucesso" : "vazio");
      setLoading(false);
      return true;
    } catch {
      return false;
    }
  };

  const saveCache = (data: ProdutoGerado[]) => {
    sessionStorage.setItem(cacheKey, JSON.stringify({ data, ts: Date.now() }));
  };

  const carregarProdutos = async (userId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("produtos_gerados" as any)
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const nextData = ((data as any) as ProdutoGerado[]) || [];
      setProdutos(nextData);
      setStatus(nextData.length ? "sucesso" : "vazio");
      saveCache(nextData);
      return { status: nextData.length ? "sucesso" : "vazio", data: nextData } as const;
    } catch (err) {
      console.error("Erro ao carregar produtos:", err);
      toast.error("Erro ao carregar produtos prontos");
      setStatus("erro");
      return { status: "erro", data: [] } as const;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadFromCache();
    void carregarProdutos(user.id);

    const channel = supabase
      .channel(`produtos_gerados_${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "produtos_gerados", filter: `user_id=eq.${user.id}` },
        () => {
          void carregarProdutos(user.id);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user]);

  const handleUse = (produto: ProdutoGerado) => {
    navigate("/", { state: { produto, autoStart: true } });
  };

  const handleEdit = (produto: ProdutoGerado) => {
    navigate("/", { state: { produto, autoStart: false } });
  };

  const handleDuplicate = async (produto: ProdutoGerado) => {
    if (!user) return;
    const { data, error } = await supabase
      .from("produtos_gerados" as any)
      .insert({
        user_id: user.id,
        nome: `${produto.nome} (Copia)`,
        tipo: produto.tipo,
        nicho: produto.nicho,
        estrutura: produto.estrutura,
        status: "rascunho",
      })
      .select("*")
      .single();
    if (error) {
      toast.error("Erro ao duplicar produto");
      return;
    }
    const next = [(data as any) as ProdutoGerado, ...produtos];
    setProdutos(next);
    saveCache(next);
    toast.success("Produto duplicado");
  };

  const handleDelete = async (produto: ProdutoGerado) => {
    const { error } = await supabase.from("produtos_gerados" as any).delete().eq("id", produto.id);
    if (error) {
      toast.error("Erro ao excluir produto");
      return;
    }
    const next = produtos.filter((item) => item.id !== produto.id);
    setProdutos(next);
    saveCache(next);
    toast.success("Produto excluido");
  };

  const statusBadge = (status: ProdutoGerado["status"]) => {
    const label = status === "publicado" ? "Publicado" : status === "finalizado" ? "Finalizado" : "Rascunho";
    const variant = status === "publicado" ? "secondary" : status === "finalizado" ? "outline" : "default";
    return <Badge variant={variant}>{label}</Badge>;
  };

  const isPlayableVideoUrl = (url?: string | null) => {
    if (!url) return false;
    const clean = url.split("?")[0].toLowerCase();
    return /\.(mp4|webm|mov|m4v)$/.test(clean);
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
              <h1 className="text-lg font-bold gradient-text">Produtos Prontos</h1>
              <p className="text-xs text-muted-foreground">Reutilize e escale mais rapido</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")}>Voltar</Button>
          </div>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Biblioteca de produtos</h2>
            <p className="text-sm text-muted-foreground">Nao crie do zero. Reuse, escale e venda mais rapido.</p>
          </div>
          <Button variant="neon" onClick={() => navigate("/")}>Criar novo</Button>
        </div>

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass-card p-5 space-y-3">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-24 w-full" />
              </div>
            ))}
          </div>
        )}

        {!loading && status === "vazio" && produtos.length === 0 && (
          <div className="glass-card p-8 text-center text-muted-foreground space-y-4">
            <p>Voce ainda nao criou produtos. Comece agora.</p>
            <Button variant="neon" onClick={() => navigate("/")}>Criar produto</Button>
          </div>
        )}

        {!loading && status === "erro" && produtos.length === 0 && (
          <div className="glass-card p-8 text-center text-muted-foreground space-y-4">
            <p>Erro ao carregar produtos</p>
            <Button variant="outline" onClick={() => user && carregarProdutos(user.id)}>Tentar novamente</Button>
          </div>
        )}

        {!loading && produtos.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {produtos.map((produto) => (
              <div
                key={produto.id}
                className="glass-card p-5 space-y-4 transition-all duration-200 hover:scale-[1.01] hover:shadow-[0_0_26px_-10px_hsl(var(--primary)/0.5)]"
              >
                {(() => {
                  const estrutura = produto.estrutura || {};
                  const seo = estrutura.seoData?.seo || estrutura.seoData;
                  const roteiro = estrutura.roteiroData?.roteiro || estrutura.roteiroData?.novo_roteiro;
                  const video = estrutura.videoUrl || estrutura.videoLink;
                  const canPlay = isPlayableVideoUrl(video);
                  return (
                    <>
                      {video && canPlay ? (
                        <div className="rounded-xl overflow-hidden border border-border/40 bg-muted/40">
                          <video
                            src={video}
                            className="w-full aspect-video object-cover"
                            muted
                            controls
                            playsInline
                          />
                        </div>
                      ) : (
                        <div className="rounded-xl border border-border/40 bg-muted/40 p-4 text-xs text-muted-foreground text-center">
                          {video ? "Preview indisponivel" : "Sem preview de video"}
                        </div>
                      )}
                      <div className="space-y-2">
                        {seo?.descricao_youtube && (
                          <p className="text-xs text-muted-foreground max-h-12 overflow-hidden">
                            {seo.descricao_youtube}
                          </p>
                        )}
                        {seo?.hashtags && (
                          <p className="text-[10px] text-muted-foreground/70 truncate">{seo.hashtags.join(" ")}</p>
                        )}
                        {roteiro?.hook && (
                          <p className="text-xs font-medium">{roteiro.hook}</p>
                        )}
                      </div>
                    </>
                  );
                })()}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-base">{produto.nome}</h3>
                    <p className="text-xs text-muted-foreground">{produto.nicho || "Nicho nao definido"}</p>
                  </div>
                  {statusBadge(produto.status)}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="px-2 py-1 rounded bg-muted/50">{produto.tipo || "Tipo nao definido"}</span>
                  <span className="px-2 py-1 rounded bg-muted/50">
                    {new Date(produto.created_at).toLocaleDateString("pt-BR")}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button size="sm" variant="neon" onClick={() => handleUse(produto)}>Usar produto</Button>
                  <Button size="sm" variant="outline" onClick={() => handleEdit(produto)}>Editar</Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDuplicate(produto)}>Duplicar</Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(produto)}>Excluir</Button>
                </div>
              </div>
            ))}
          </div>
        )}

      </main>
    </div>
  );
};

export default ProdutosProntos;
