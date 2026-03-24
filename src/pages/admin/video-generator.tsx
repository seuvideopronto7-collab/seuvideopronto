import AdminLayout from "@/components/admin/AdminLayout";
import SafeRender from "@/components/SafeRender";
import VideoGeneratorUI from "@/components/VideoGeneratorUI";

const VideoGeneratorPage = () => (
  <AdminLayout title="Geração de Vídeo" description="Pipeline real por imagem" actionLabel="Nova renderização">
    <SafeRender label="Video Generator">
      {VideoGeneratorUI ? <VideoGeneratorUI /> : <div>Erro ao carregar módulo</div>}
    </SafeRender>
  </AdminLayout>
);

export default VideoGeneratorPage;
