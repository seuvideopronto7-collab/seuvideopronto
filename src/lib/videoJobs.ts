export type CreateVideoJobPayload = {
  imageUrl: string;
  productType: string;
  style: string;
  useDarkflow?: boolean;
  useViral?: boolean;
};

export type VideoJobResponse = {
  id: string;
};

export const createVideoJob = async (payload: CreateVideoJobPayload) => {
  const res = await fetch("/api/video-jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error("Falha ao criar job");
  return res.json() as Promise<VideoJobResponse>;
};

export const pollVideoJob = async (jobId: string, onUpdate: (job: any) => void) => {
  let active = true;

  while (active) {
    const res = await fetch(`/api/video-jobs/${jobId}`);
    const job = await res.json();
    onUpdate(job);

    if (job.status === "completed" || job.status === "failed") break;
    await new Promise((r) => setTimeout(r, 3000));
  }

  return () => {
    active = false;
  };
};
