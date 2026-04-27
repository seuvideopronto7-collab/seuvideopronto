import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2,
  Users,
  Video,
  Activity,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
  RefreshCw,
  Ban,
  UserX,
  RotateCcw,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type LiveData = {
  users: number;
  videos: number;
  jobs: number;
};

type FilterType = "users" | "videos" | "jobs" | null;

const PAGE_SIZE = 20;

export default function AdminLiveLayer() {
  const [data, setData] = useState<LiveData>({ users: 0, videos: 0, jobs: 0 });
  const [activeFilter, setActiveFilter] = useState<FilterType>(null);
  const [filterRows, setFilterRows] = useState<any[]>([]);
  const [filterLoading, setFilterLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeFilter) loadFilterRows(activeFilter, page);
  }, [page]);

  async function loadData() {
    try {
      const [usersResult, videosResult, jobsResult] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("assets" as any).select("*", { count: "exact", head: true }),
        supabase.from("video_jobs" as any).select("*", { count: "exact", head: true }),
      ]);

      setData({
        users: usersResult.count || 0,
        videos: videosResult.count || 0,
        jobs: jobsResult.count || 0,
      });
    } catch (err) {
      console.log("Erro ao carregar dashboard", err);
    }
  }

  async function openFilter(type: FilterType) {
    if (!type) return;
    if (activeFilter === type) {
      setActiveFilter(null);
      setFilterRows([]);
      setPage(0);
      return;
    }
    setActiveFilter(type);
    setSearch("");
    setPage(0);
    await loadFilterRows(type, 0);
  }

  async function loadFilterRows(type: FilterType, currentPage: number) {
    if (!type) return;
    setFilterLoading(true);
    try {
      const from = currentPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let query;
      if (type === "users") {
        query = supabase
          .from("profiles")
          .select("id, full_name, email, whatsapp, is_active, created_at", {
            count: "exact",
          })
          .order("created_at", { ascending: false })
          .range(from, to);
      } else if (type === "videos") {
        query = supabase
          .from("assets" as any)
          .select("*", { count: "exact" })
          .order("created_at", { ascending: false })
          .range(from, to);
      } else {
        query = supabase
          .from("video_jobs" as any)
          .select("*", { count: "exact" })
          .order("created_at", { ascending: false })
          .range(from, to);
      }
      const { data: rows, error, count } = await query;
      if (error) throw error;
      setFilterRows(rows || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.log("Erro ao carregar filtro", err);
      setFilterRows([]);
    } finally {
      setFilterLoading(false);
    }
  }

  function match(row: any, s: string) {
    if (!s.trim()) return true;
    const q = s.toLowerCase();
    return (
      row.full_name?.toLowerCase().includes(q) ||
      row.email?.toLowerCase().includes(q) ||
      row.id?.toLowerCase().includes(q) ||
      row.status?.toLowerCase().includes(q) ||
      row.title?.toLowerCase().includes(q) ||
      row.name?.toLowerCase().includes(q)
    );
  }

  const filteredRows = filterRows.filter((row) => match(row, search));

  async function handleAction(action: string, row: any) {
    setActionLoading(true);
    try {
      if (action === "cancel-job") {
        const { error } = await supabase
          .from("video_jobs" as any)
          .update({ status: "cancelled" })
          .eq("id", row.id);
        if (error) throw error;
        toast.success("Job cancelado");
      } else if (action === "retry-job") {
        const { error } = await supabase
          .from("video_jobs" as any)
          .update({ status: "pending", progress: 0, error: null })
          .eq("id", row.id);
        if (error) throw error;
        toast.success("Job reenfileirado");
      } else if (action === "toggle-user") {
        const { error } = await supabase
          .from("profiles")
          .update({ is_active: !row.is_active })
          .eq("id", row.id);
        if (error) throw error;
        toast.success(row.is_active ? "Usuário desativado" : "Usuário ativado");
      }
      await loadFilterRows(activeFilter, page);
      setSelectedItem(null);
    } catch (err: any) {
      toast.error("Falha: " + (err?.message || "erro desconhecido"));
    } finally {
      setActionLoading(false);
    }
  }

  function exportCSV(rows: any[]) {
    if (!rows.length) {
      toast.error("Nada para exportar");
      return;
    }
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        headers
          .map((h) => {
            const v = r[h];
            if (v === null || v === undefined) return "";
            const s = typeof v === "object" ? JSON.stringify(v) : String(v);
            return `"${s.replace(/"/g, '""')}"`;
          })
          .join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeFilter}-page${page + 1}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado");
  }

  const filterTitle =
    activeFilter === "users"
      ? "Usuários"
      : activeFilter === "videos"
      ? "Vídeos"
      : activeFilter === "jobs"
      ? "Jobs em Processamento"
      : "";

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="p-6 text-white">
      <h1 className="text-xl font-bold mb-4">Dashboard CEO — Seu Vídeo Pronto 🚀</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card
          title="Usuários"
          value={data.users}
          icon={<Users className="w-5 h-5" />}
          active={activeFilter === "users"}
          onClick={() => openFilter("users")}
          accent="from-blue-500/20 to-blue-500/5 border-blue-500/30 hover:shadow-blue-500/20"
        />
        <Card
          title="Vídeos"
          value={data.videos}
          icon={<Video className="w-5 h-5" />}
          active={activeFilter === "videos"}
          onClick={() => openFilter("videos")}
          accent="from-purple-500/20 to-purple-500/5 border-purple-500/30 hover:shadow-purple-500/20"
        />
        <Card
          title="Processando"
          value={data.jobs}
          icon={<Activity className="w-5 h-5" />}
          active={activeFilter === "jobs"}
          onClick={() => openFilter("jobs")}
          accent="from-amber-500/20 to-amber-500/5 border-amber-500/30 hover:shadow-amber-500/20"
        />
      </div>

      {activeFilter && (
        <div className="bg-[#0B0F1A]/80 backdrop-blur-xl border border-[#1F2937] rounded-2xl p-5 mb-6 animate-in fade-in slide-in-from-top-2 duration-300 shadow-2xl">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <h3 className="font-bold text-lg">{filterTitle}</h3>
              <Badge variant="secondary" className="font-mono">
                {totalCount} total
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportCSV(filteredRows)}
                className="bg-transparent border-[#1F2937] hover:bg-[#111827]"
              >
                <Download className="w-4 h-4 mr-1" /> CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadFilterRows(activeFilter, page)}
                className="bg-transparent border-[#1F2937] hover:bg-[#111827]"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setActiveFilter(null);
                  setFilterRows([]);
                  setPage(0);
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar por nome, email, ID, status..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-[#111827] border-[#1F2937]"
            />
          </div>

          {filterLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
            </div>
          ) : filteredRows.length === 0 ? (
            <p className="text-center text-gray-500 py-10 text-sm">
              Nenhum resultado encontrado
            </p>
          ) : (
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {filteredRows.map((row, idx) => (
                <RowItem
                  key={row.id || idx}
                  row={row}
                  type={activeFilter}
                  onClick={() => setSelectedItem({ ...row, __type: activeFilter })}
                />
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#1F2937]">
            <p className="text-xs text-gray-400">
              Página {page + 1} de {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0 || filterLoading}
                onClick={() => setPage((p) => Math.max(p - 1, 0))}
                className="bg-transparent border-[#1F2937]"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page + 1 >= totalPages || filterLoading}
                onClick={() => setPage((p) => p + 1)}
                className="bg-transparent border-[#1F2937]"
              >
                Próxima <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-[#111827] p-4 rounded-xl border border-[#1F2937]">
        <h2 className="font-bold mb-2">Status do Sistema</h2>
        <p className="text-green-400">
          <span className="animate-pulse">●</span> Sistema Operacional
        </p>
        <p className="text-blue-400">
          <span className="animate-pulse">●</span> Supabase conectado
        </p>
        <p className="text-yellow-400">
          <span className="animate-pulse">●</span> APIs prontas
        </p>
      </div>

      <div className="mt-6 bg-gradient-to-r from-purple-600 to-blue-600 p-6 rounded-xl">
        <h2 className="text-xl font-bold">🎬 Máquina de Vídeo</h2>
        <p className="text-sm opacity-80">
          Gere vídeos cinematográficos automaticamente com IA
        </p>

        <a
          href="/admin/video-generator"
          className="mt-4 inline-block bg-black px-4 py-2 rounded-lg"
        >
          Abrir Gerador
        </a>
      </div>

      {selectedItem && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-in fade-in"
            onClick={() => setSelectedItem(null)}
          />
          <div className="fixed right-0 top-0 h-full w-full sm:w-[440px] bg-[#0B0F1A] border-l border-[#1F2937] z-50 flex flex-col animate-in slide-in-from-right duration-300 shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-[#1F2937] sticky top-0 bg-[#0B0F1A]">
              <div>
                <h2 className="text-lg font-bold">Detalhes</h2>
                <p className="text-xs text-gray-400 font-mono truncate max-w-[280px]">
                  {selectedItem.id}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedItem(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {selectedItem.__type === "users" && (
                <div className="space-y-2">
                  <Field label="Nome" value={selectedItem.full_name} />
                  <Field label="Email" value={selectedItem.email} />
                  <Field label="WhatsApp" value={selectedItem.whatsapp} />
                  <Field
                    label="Status"
                    value={selectedItem.is_active ? "Ativo" : "Inativo"}
                  />
                  <Field
                    label="Criado"
                    value={
                      selectedItem.created_at
                        ? new Date(selectedItem.created_at).toLocaleString("pt-BR")
                        : "—"
                    }
                  />
                </div>
              )}

              {selectedItem.__type === "jobs" && (
                <div className="space-y-2">
                  <Field label="Status" value={selectedItem.status} />
                  <Field label="Progresso" value={`${selectedItem.progress || 0}%`} />
                  <Field label="Erro" value={selectedItem.error || "—"} />
                  <Field label="Prompt" value={selectedItem.prompt || "—"} />
                </div>
              )}

              <details className="bg-[#111827] rounded-lg border border-[#1F2937]">
                <summary className="cursor-pointer p-3 text-sm font-medium text-gray-300">
                  JSON completo
                </summary>
                <pre className="text-xs p-3 overflow-x-auto text-gray-400">
                  {JSON.stringify(selectedItem, null, 2)}
                </pre>
              </details>
            </div>

            <div className="border-t border-[#1F2937] p-4 space-y-2 bg-[#0B0F1A]">
              {selectedItem.__type === "jobs" && (
                <>
                  <Button
                    className="w-full"
                    variant="outline"
                    disabled={actionLoading}
                    onClick={() => handleAction("retry-job", selectedItem)}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" /> Reprocessar
                  </Button>
                  <Button
                    className="w-full"
                    variant="destructive"
                    disabled={actionLoading}
                    onClick={() => handleAction("cancel-job", selectedItem)}
                  >
                    <Ban className="w-4 h-4 mr-2" /> Cancelar Job
                  </Button>
                </>
              )}
              {selectedItem.__type === "users" && (
                <Button
                  className="w-full"
                  variant={selectedItem.is_active ? "destructive" : "default"}
                  disabled={actionLoading}
                  onClick={() => handleAction("toggle-user", selectedItem)}
                >
                  <UserX className="w-4 h-4 mr-2" />
                  {selectedItem.is_active ? "Desativar usuário" : "Ativar usuário"}
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Card({
  title,
  value,
  icon,
  active,
  onClick,
  accent,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
  accent: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-left bg-gradient-to-br ${accent} p-4 rounded-xl border transition-all duration-300 ease-out hover:scale-[1.02] hover:shadow-2xl ${
        active ? "ring-2 ring-white/40 scale-[1.02] shadow-2xl" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-gray-300 text-sm">{title}</p>
        <div className="text-white/70">{icon}</div>
      </div>
      <h2 className="text-2xl font-bold">{value}</h2>
      <p className="text-xs text-gray-400 mt-1">
        {active ? "Clique para fechar" : "Clique para filtrar"}
      </p>
    </button>
  );
}

function Field({ label, value }: { label: string; value: any }) {
  return (
    <div className="bg-[#111827] p-3 rounded-lg border border-[#1F2937]">
      <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className="text-sm text-white break-words">{value || "—"}</p>
    </div>
  );
}

function RowItem({
  row,
  type,
  onClick,
}: {
  row: any;
  type: FilterType;
  onClick: () => void;
}) {
  if (type === "users") {
    return (
      <button
        onClick={onClick}
        className="w-full text-left bg-[#111827] hover:bg-[#1a2332] p-3 rounded-lg border border-[#1F2937] flex items-center justify-between transition-colors"
      >
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm truncate">{row.full_name || "—"}</p>
          <p className="text-xs text-gray-400 truncate">{row.email}</p>
        </div>
        <Badge
          variant={row.is_active ? "default" : "destructive"}
          className={
            row.is_active
              ? "bg-green-500/20 text-green-400 border-green-500/30"
              : ""
          }
        >
          {row.is_active ? "Ativo" : "Inativo"}
        </Badge>
      </button>
    );
  }

  if (type === "videos") {
    return (
      <button
        onClick={onClick}
        className="w-full text-left bg-[#111827] hover:bg-[#1a2332] p-3 rounded-lg border border-[#1F2937] transition-colors"
      >
        <p className="font-medium text-sm truncate">
          {row.title || row.name || row.id}
        </p>
        <p className="text-xs text-gray-400 truncate">
          {row.created_at ? new Date(row.created_at).toLocaleString("pt-BR") : ""}
        </p>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-[#111827] hover:bg-[#1a2332] p-3 rounded-lg border border-[#1F2937] flex items-center justify-between transition-colors"
    >
      <div className="min-w-0 flex-1">
        <p className="font-medium text-sm truncate">
          {row.id?.slice(0, 8) || "Job"}
        </p>
        <p className="text-xs text-gray-400 truncate">
          {row.created_at ? new Date(row.created_at).toLocaleString("pt-BR") : ""}
        </p>
      </div>
      <Badge variant="secondary" className="text-xs">
        {row.status || "pending"}
      </Badge>
    </button>
  );
}
