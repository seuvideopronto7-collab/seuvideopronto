export function statusToStep(status: string) {
  switch (status) {
    case "queued":
      return { label: "Na fila", progress: 5 };
    case "uploading":
      return { label: "Upload concluído", progress: 10 };
    case "generating_script":
      return { label: "Gerando roteiro", progress: 20 };
    case "generating_video":
      return { label: "Gerando vídeo", progress: 50 };
    case "generating_voice":
      return { label: "Gerando narração", progress: 70 };
    case "composing":
      return { label: "Renderizando final", progress: 90 };
    case "completed":
      return { label: "Finalizado", progress: 100 };
    case "failed":
      return { label: "Erro", progress: 100 };
    default:
      return { label: "Processando", progress: 0 };
  }
}
