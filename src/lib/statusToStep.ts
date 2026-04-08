export function statusToStep(status: string) {
  switch (status) {
    case "queued":
    case "pending":
      return { label: "Na fila", progress: 5 };
    case "uploading":
      return { label: "Upload concluído", progress: 10 };
    case "processing":
      return { label: "Processando", progress: 30 };
    case "generating_script":
      return { label: "Gerando roteiro", progress: 20 };
    case "generating_images":
      return { label: "Gerando cenas", progress: 40 };
    case "generating_video":
      return { label: "Gerando vídeo", progress: 50 };
    case "generating_voice":
    case "generating_audio":
      return { label: "Gerando narração", progress: 70 };
    case "rendering":
    case "composing":
      return { label: "Renderizando final", progress: 90 };
    case "completed":
    case "done":
      return { label: "Finalizado", progress: 100 };
    case "failed":
    case "error":
      return { label: "Erro", progress: 100 };
    case "fallback":
      return { label: "Fallback aplicado", progress: 100 };
    default:
      return { label: "Processando", progress: 0 };
  }
}
