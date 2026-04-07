import { supabase } from "@/integrations/supabase/client";

export type CreateVideoJobInput = {
  imageUrl: string;
  productType: string;
  style: string;
  useDarkflow?: boolean;
  useViral?: boolean;
  prompt?: string;
  textoNaTela?: string[];
  narracao?: string;
  modePro?: boolean;
  script?: unknown;
};

export type VideoJob = {
  id: string;
  status: string | null;
  progress: number | null;
  video_url: string | null;
  audio_url: string | null;
  images: unknown[] | null;
  scenes: unknown[] | null;
  caption_text: string | null;
  error: string | null;
  created_at: string | null;
};

export const startVideoPipeline = async (params: {
  jobId: string;
  imageUrl: string;
  script: string;
  scenes: Array<{ texto: string; visual: string; emocao: string; prompt_imagem: string }>;
}) => {
  const { data, error } = await supabase.functions.invoke("video-pipeline", {
    body: params,
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as { jobId: string; status: string; videoUrl?: string; audioUrl?: string; images?: string[] };
};

export const createVideoJob = async (payload: CreateVideoJobInput) => {
  const { data, error } = await supabase.functions.invoke("generate-video", {
    body: { ...payload, createJob: true },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as { jobId: string; status?: string; videoUrl?: string | null; error?: string | null };
};

export const fetchVideoJob = async (jobId: string) => {
  const { data, error } = await supabase.from("video_jobs" as any).select("id, status, progress, video_url, audio_url, error, caption_text, created_at, images, scenes").eq("id", jobId).maybeSingle();
  if (error) throw error;
  return (data as any) as VideoJob | null;
};
