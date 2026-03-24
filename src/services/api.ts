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
  created_at: string | null;
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
  const { data, error } = await supabase.from("video_jobs" as any).select("*").eq("id", jobId).maybeSingle();
  if (error) throw error;
  return (data as any) as VideoJob | null;
};
