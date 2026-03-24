import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import UserDashboard from "./pages/UserDashboard";
import AdminDashboard from "./pages/AdminDashboard";
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
                  <AdminDashboard />
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
