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
};

export type VideoJob = {
  id: string;
  status: string | null;
  progress: number | null;
  video_url: string | null;
  created_at: string | null;
};

export const createVideoJob = async (payload: CreateVideoJobInput) => {
  const { data, error } = await supabase.functions.invoke("create-video-job", {
    body: payload,
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as { id: string };
};

export const processVideoJob = async (payload: CreateVideoJobInput & { jobId: string }) => {
  const { data, error } = await supabase.functions.invoke("process-video-job", {
    body: payload,
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as VideoJob;
};

export const fetchVideoJob = async (jobId: string) => {
  const { data, error } = await supabase.from("video_jobs").select("*").eq("id", jobId).maybeSingle();
  if (error) throw error;
  return data as VideoJob | null;
};
