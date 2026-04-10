import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import Landing from "@/pages/Landing";
import Index from "@/pages/Index";

/** Shows Landing for visitors, Index (dashboard) for authenticated users */
const HomeGate = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return user ? <Index /> : <Landing />;
};

export default HomeGate;
