import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import SafeRender from "@/components/SafeRender";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import UserDashboard from "./pages/UserDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import VideoGeneratorPage from "./pages/admin/video-generator";
import Infoproduct from "./pages/Infoproduct";
import ProdutosProntos from "./pages/ProdutosProntos";
import Planos from "./pages/Planos";
import NotFound from "./pages/NotFound";
import Apis from "./pages/Apis";
import EditorProReal from "./pages/EditorProReal";

const queryClient = new QueryClient();

const wrapSafe = (label: string, element: ReactNode) => (
  <SafeRender label={label}>{element}</SafeRender>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={wrapSafe("Auth", <Auth />)} />
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
              path="/admin"
              element={
                wrapSafe(
                  "Admin",
                  <ProtectedRoute requireAdmin>
                    <AdminDashboard />
                  </ProtectedRoute>,
                )
              }
            />
            <Route
              path="/admin/video-generator"
              element={
                wrapSafe(
                  "Admin Video Generator",
                  <ProtectedRoute requireAdmin>
                    <VideoGeneratorPage />
                  </ProtectedRoute>,
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
            <Route path="*" element={wrapSafe("Not Found", <NotFound />)} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
