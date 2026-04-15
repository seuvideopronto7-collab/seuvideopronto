import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useDeviceGuard } from "@/hooks/useDeviceGuard";
import DeviceBlockedDialog from "@/components/DeviceBlockedDialog";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

const ProtectedRoute = ({ children, requireAdmin }: ProtectedRouteProps) => {
  const { user, loading, isAdmin, signOut } = useAuth();
  const { status } = useDeviceGuard(user?.id);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  if (requireAdmin && !isAdmin) return <Navigate to="/" replace />;

  // Device guard: show block dialog if device is blocked or max reached
  if (status === "blocked" || status === "max_reached") {
    return (
      <>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
        <DeviceBlockedDialog
          open={true}
          reason={status === "blocked" ? "blocked" : "max_reached"}
          onSignOut={signOut}
        />
      </>
    );
  }

  // Still checking device — show loading briefly
  if (status === "checking") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
