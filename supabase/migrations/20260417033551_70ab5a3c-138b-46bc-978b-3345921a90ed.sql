UPDATE public.video_jobs 
SET status = 'error', 
    error = 'Job antigo sem mídia gerada — exclua este card e gere um novo vídeo',
    progress = 100,
    updated_at = now()
WHERE status IN ('completed','done') 
  AND video_url IS NULL;