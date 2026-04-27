import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Users, Video, Activity, X, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type LiveData = {
  users: number;
  videos: number;
  jobs: number;
};

type FilterType = "users" | "videos" | "jobs" | null;

type CardProps = {
  title: string;
  value: number;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
  accent: string;
};

export default function AdminLiveLayer() {
  const [data, setData] = useState<LiveData>({ users: 0, videos: 0, jobs: 0 });
  const [activeFilter, setActiveFilter] = useState<FilterType>(null);
  const [filterRows, setFilterRows] = useState<any[]>([]);
  const [filterLoading, setFilterLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadData();
  }, []);

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
      return;
    }
    setActiveFilter(type);
    setFilterLoading(true);
    setSearch("");
    try {
      let query;
      if (type === "users") {
        query = supabase
          .from("profiles")
          .select("id, full_name, email, whatsapp, is_active, created_at")
          .order("created_at", { ascending: false })
          .limit(100);
      } else if (type === "videos") {
        query = supabase
          .from("assets" as any)
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100);
      } else {
        query = supabase
          .from("video_jobs" as any)
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100);
      }
      const { data: rows, error } = await query;
      if (error) throw error;
      setFilterRows(rows || []);
    } catch (err) {
      console.log("Erro ao carregar filtro", err);
      setFilterRows([]);
    } finally {
      setFilterLoading(false);
    }
  }

  const filteredRows = filterRows.filter((row) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return JSON.stringify(row).toLowerCase().includes(s);
  });

  const filterTitle =
    activeFilter === "users"
      ? "Usuários"
      : activeFilter === "videos"
      ? "Vídeos"
      : activeFilter === "jobs"
      ? "Jobs em Processamento"
      : "";

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
          accent="from-blue-500/20 to-blue-500/5 border-blue-500/30"
        />
        <Card
          title="Vídeos"
          value={data.videos}
          icon={<Video className="w-5 h-5" />}
          active={activeFilter === "videos"}
          onClick={() => openFilter("videos")}
          accent="from-purple-500/20 to-purple-500/5 border-purple-500/30"
        />
        <Card
          title="Processando"
          value={data.jobs}
          icon={<Activity className="w-5 h-5" />}
          active={activeFilter === "jobs"}
          onClick={() => openFilter("jobs")}
          accent="from-amber-500/20 to-amber-500/5 border-amber-500/30"
        />
      </div>

      {activeFilter && (
        <div className="bg-[#0B0F1A] border border-[#1F2937] rounded-2xl p-5 mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h3 className="font-bold text-lg">{filterTitle}</h3>
              <Badge variant="secondary" className="font-mono">
                {filteredRows.length}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setActiveFilter(null);
                setFilterRows([]);
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar..."
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
            <div className="space-y-2 max-h-[420px] overflow-y-auto">
              {filteredRows.map((row, idx) => (
                <RowItem key={row.id || idx} row={row} type={activeFilter} />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="bg-[#111827] p-4 rounded-xl border border-[#1F2937]">
        <h2 className="font-bold mb-2">Status do Sistema</h2>
        <p className="text-green-400">● Sistema online</p>
        <p className="text-blue-400">● Supabase conectado</p>
        <p className="text-yellow-400">● APIs prontas</p>
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
    </div>
  );
}

function Card({ title, value, icon, active, onClick, accent }: CardProps) {
  return (
    <button
      onClick={onClick}
      className={`text-left bg-gradient-to-br ${accent} p-4 rounded-xl border transition-all duration-200 hover:scale-[1.02] hover:shadow-lg ${
        active ? "ring-2 ring-white/40 scale-[1.02]" : ""
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

function RowItem({ row, type }: { row: any; type: FilterType }) {
  if (type === "users") {
    return (
      <div className="bg-[#111827] p-3 rounded-lg border border-[#1F2937] flex items-center justify-between">
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
      </div>
    );
  }

  if (type === "videos") {
    return (
      <div className="bg-[#111827] p-3 rounded-lg border border-[#1F2937]">
        <p className="font-medium text-sm truncate">
          {row.title || row.name || row.id}
        </p>
        <p className="text-xs text-gray-400 truncate">
          {row.created_at ? new Date(row.created_at).toLocaleString("pt-BR") : ""}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#111827] p-3 rounded-lg border border-[#1F2937] flex items-center justify-between">
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
    </div>
  );
}
