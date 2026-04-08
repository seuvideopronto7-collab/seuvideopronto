UPDATE public.video_jobs 
SET status = 'completed', 
    progress = 100, 
    video_url = '/__l5e/assets-v1/eba1cce2-d9af-4da8-bf91-f573a007474e/detox-commercial.mp4',
    updated_at = now(),
    error = NULL
WHERE id = '333842f4-3d14-4e2a-af72-61ab9d417874';