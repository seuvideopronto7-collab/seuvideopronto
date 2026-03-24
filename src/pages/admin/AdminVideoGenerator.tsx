import AdminLayout from "@/components/admin/AdminLayout";
import VideoGeneratorUI from "@/components/VideoGeneratorUI";

const AdminVideoGenerator = () => (
  <AdminLayout title="Geração de Vídeo" description="Pipeline real por imagem" actionLabel="Nova renderização">
    <VideoGeneratorUI />
  </AdminLayout>
);

export default AdminVideoGenerator;
