import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type LiveData = {
  users: number;
  videos: number;
  jobs: number;
};

type CardProps = {
  title: string;
  value: number;
};

export default function AdminLiveLayer() {
  const [data, setData] = useState<LiveData>({
    users: 0,
    videos: 0,
    jobs: 0,
  });

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

  return (
    <div className="p-6 text-white">
      <h1 className="text-xl font-bold mb-4">Dashboard CEO — Seu Vídeo Pronto 🚀</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card title="Usuários" value={data.users} />
        <Card title="Vídeos" value={data.videos} />
        <Card title="Processando" value={data.jobs} />
      </div>

      <div className="bg-[#111827] p-4 rounded-xl border border-[#1F2937]">
        <h2 className="font-bold mb-2">Status do Sistema</h2>
        <p className="text-green-400">● Sistema online</p>
        <p className="text-blue-400">● Supabase conectado</p>
        <p className="text-yellow-400">● APIs prontas</p>
      </div>

      <div className="mt-6 bg-gradient-to-r from-purple-600 to-blue-600 p-6 rounded-xl">
        <h2 className="text-xl font-bold">🎬 Máquina de Vídeo</h2>
        <p className="text-sm opacity-80">Gere vídeos cinematográficos automaticamente com IA</p>

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

function Card({ title, value }: CardProps) {
  return (
    <div className="bg-[#0B0F1A] p-4 rounded-xl border border-[#1F2937]">
      <p className="text-gray-400">{title}</p>
      <h2 className="text-2xl font-bold">{value}</h2>
    </div>
  );
}
