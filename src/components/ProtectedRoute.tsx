import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Loader2, ShieldAlert } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

const ProtectedRoute = ({ children, requireAdmin }: ProtectedRouteProps) => {
  const { user, loading, isActive, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  if (requireAdmin && !isAdmin) return <Navigate to="/" replace />;

  // Check if user is active (admins bypass this)
  if (!isActive && !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="glass-card p-8 max-w-md text-center space-y-4">
          <ShieldAlert className="w-12 h-12 text-neon-yellow mx-auto" />
          <h2 className="text-xl font-bold">Acesso Pendente</h2>
          <p className="text-muted-foreground text-sm">
            Seu acesso ainda não foi liberado pelo administrador.
          </p>
          <p className="text-xs text-muted-foreground">
            Entre em contato com o suporte para ativação.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
