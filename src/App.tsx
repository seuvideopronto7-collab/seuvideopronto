import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";
import Index from "./pages/Index";
import Landing from "./pages/Landing";
import HomeGate from "./components/HomeGate";
import Auth from "./pages/Auth";
import UserDashboard from "./pages/UserDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import VideoGeneratorPage from "./pages/admin/video-generator";
import AdminMasterDashboard from "./pages/admin/AdminMasterDashboard";
import AdminDistribution from "./pages/admin/AdminDistribution";
import AdminIntegrations from "./pages/admin/AdminIntegrations";
import AdminLogs from "./pages/admin/AdminLogs";
import AdminSettings from "./pages/admin/AdminSettings";
import Infoproduct from "./pages/Infoproduct";
import ProdutosProntos from "./pages/ProdutosProntos";
import Planos from "./pages/Planos";
import NotFound from "./pages/NotFound";
import Apis from "./pages/Apis";
import EditorProReal from "./pages/EditorProReal";
import SvpGeradorVideoPremium from "./pages/SvpGeradorVideoPremium";
import ImageToVideo from "./pages/ImageToVideo";
import TransformImage from "./pages/TransformImage";
import VideoMachine from "./pages/VideoMachine";
import ViralMachine from "./pages/ViralMachine";

const queryClient = new QueryClient();

const wrapSafe = (_label: string, element: ReactNode) => element;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/landing" element={wrapSafe("Landing", <Landing />)} />
            <Route path="/auth" element={wrapSafe("Auth", <Auth />)} />
            <Route path="/login" element={wrapSafe("Login", <Auth />)} />
            <Route
              path="/"
              element={
                wrapSafe(
                  "Index",
                  <ProtectedRoute>
                    <Index />
                  </ProtectedRoute>,
                )
              }
            />
            <Route
              path="/perfil"
              element={
                wrapSafe(
                  "Perfil",
                  <ProtectedRoute>
                    <UserDashboard />
                  </ProtectedRoute>,
                )
              }
            />
            <Route
              path="/dashboard"
              element={
                wrapSafe(
                  "Dashboard",
                  <ProtectedRoute>
                    <UserDashboard />
                  </ProtectedRoute>,
                )
              }
            />
            <Route
              path="/admin"
              element={
                wrapSafe(
                  "Admin",
                  <AdminRoute>
                    <Navigate to="/admin/dashboard" replace />
                  </AdminRoute>,
                )
              }
            />
            <Route
              path="/admin/dashboard"
              element={
                wrapSafe(
                  "Admin Dashboard",
                  <AdminRoute>
                    <AdminMasterDashboard />
                  </AdminRoute>,
                )
              }
            />
            <Route
              path="/admin/video-generator"
              element={
                wrapSafe(
                  "Admin Video Generator",
                  <AdminRoute>
                    <VideoGeneratorPage />
                  </AdminRoute>,
                )
              }
            />
            <Route
              path="/admin/distribution"
              element={
                wrapSafe(
                  "Admin Distribution",
                  <AdminRoute>
                    <AdminDistribution />
                  </AdminRoute>,
                )
              }
            />
            <Route
              path="/admin/users"
              element={
                wrapSafe(
                  "Admin Users",
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>,
                )
              }
            />
            <Route
              path="/admin/apis"
              element={
                wrapSafe(
                  "Admin APIs",
                  <AdminRoute>
                    <AdminIntegrations />
                  </AdminRoute>,
                )
              }
            />
            <Route
              path="/admin/logs"
              element={
                wrapSafe(
                  "Admin Logs",
                  <AdminRoute>
                    <AdminLogs />
                  </AdminRoute>,
                )
              }
            />
            <Route
              path="/admin/settings"
              element={
                wrapSafe(
                  "Admin Settings",
                  <AdminRoute>
                    <AdminSettings />
                  </AdminRoute>,
                )
              }
            />
            <Route
              path="/infoproduto"
              element={
                wrapSafe(
                  "Infoproduto",
                  <ProtectedRoute>
                    <Infoproduct />
                  </ProtectedRoute>,
                )
              }
            />
            <Route
              path="/produtos-prontos"
              element={
                wrapSafe(
                  "Produtos Prontos",
                  <ProtectedRoute>
                    <ProdutosProntos />
                  </ProtectedRoute>,
                )
              }
            />
            <Route
              path="/planos"
              element={
                wrapSafe(
                  "Planos",
                  <ProtectedRoute>
                    <Planos />
                  </ProtectedRoute>,
                )
              }
            />
            <Route
              path="/apis"
              element={
                wrapSafe(
                  "APIs",
                  <ProtectedRoute>
                    <Apis />
                  </ProtectedRoute>,
                )
              }
            />
            <Route
              path="/editor-pro-real"
              element={
                wrapSafe(
                  "Editor Pro Real",
                  <ProtectedRoute>
                    <EditorProReal />
                  </ProtectedRoute>,
                )
              }
            />
            <Route
              path="/svp-gerador-video-premium"
              element={
                wrapSafe(
                  "SVP Gerador Video Premium",
                  <ProtectedRoute>
                    <SvpGeradorVideoPremium />
                  </ProtectedRoute>,
                )
              }
            />
            <Route
              path="/imagem-para-video"
              element={
                wrapSafe(
                  "Imagem para Video",
                  <ProtectedRoute>
                    <ImageToVideo />
                  </ProtectedRoute>,
                )
              }
            />
            <Route
              path="/transformar-imagem"
              element={
                wrapSafe(
                  "Transformar Imagem",
                  <ProtectedRoute>
                    <TransformImage />
                  </ProtectedRoute>,
                )
              }
            />
            <Route
              path="/video-machine"
              element={
                wrapSafe(
                  "Video Machine",
                  <ProtectedRoute>
                    <VideoMachine />
                  </ProtectedRoute>,
                )
              }
            />
            <Route
              path="/viral-machine"
              element={
                wrapSafe(
                  "Viral Machine",
                  <ProtectedRoute>
                    <ViralMachine />
                  </ProtectedRoute>,
                )
              }
            />
            <Route path="*" element={<Navigate to="/auth" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
