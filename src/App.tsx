import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import UserDashboard from "./pages/UserDashboard";
import AdminOverview from "./pages/admin/AdminOverview";
import AdminVideoGenerator from "./pages/admin/AdminVideoGenerator";
import AdminRenders from "./pages/admin/AdminRenders";
import AdminScripts from "./pages/admin/AdminScripts";
import AdminVoices from "./pages/admin/AdminVoices";
import AdminSoundtracks from "./pages/admin/AdminSoundtracks";
import AdminIntegrations from "./pages/admin/AdminIntegrations";
import AdminSocialPublishing from "./pages/admin/AdminSocialPublishing";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminPlans from "./pages/admin/AdminPlans";
import AdminLogs from "./pages/admin/AdminLogs";
import AdminSettings from "./pages/admin/AdminSettings";
import Infoproduct from "./pages/Infoproduct";
import ProdutosProntos from "./pages/ProdutosProntos";
import Planos from "./pages/Planos";
import NotFound from "./pages/NotFound";
import Apis from "./pages/Apis";
import EditorProReal from "./pages/EditorProReal";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              }
            />
            <Route
              path="/perfil"
              element={
                <ProtectedRoute>
                  <UserDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute requireAdmin>
                  <Navigate to="/admin/overview" replace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/overview"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminOverview />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/video-generator"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminVideoGenerator />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/renders"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminRenders />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/scripts"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminScripts />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/voices"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminVoices />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/soundtracks"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminSoundtracks />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/integrations"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminIntegrations />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/social-publishing"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminSocialPublishing />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/analytics"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminAnalytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminUsers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/plans"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminPlans />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/logs"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminLogs />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminSettings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/infoproduto"
              element={
                <ProtectedRoute>
                  <Infoproduct />
                </ProtectedRoute>
              }
            />
            <Route
              path="/produtos-prontos"
              element={
                <ProtectedRoute>
                  <ProdutosProntos />
                </ProtectedRoute>
              }
            />
            <Route
              path="/planos"
              element={
                <ProtectedRoute>
                  <Planos />
                </ProtectedRoute>
              }
            />
            <Route
              path="/apis"
              element={
                <ProtectedRoute>
                  <Apis />
                </ProtectedRoute>
              }
            />
            <Route
              path="/editor-pro-real"
              element={
                <ProtectedRoute>
                  <EditorProReal />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
