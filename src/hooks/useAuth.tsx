import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface Profile {
  id: string;
  full_name: string;
  whatsapp: string;
  email: string;
  youtube_channel: string;
  instagram: string;
  tiktok: string;
  is_active: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  isFounder: boolean;
  isActive: boolean;
  loading: boolean;
  isLocalSession: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const defaultAuthContext: AuthContextType = {
  user: null,
  session: null,
  profile: null,
  isAdmin: false,
  isFounder: false,
  isActive: false,
  loading: true,
  isLocalSession: false,
  signOut: async () => {},
  refreshProfile: async () => {},
};

const AuthContext = createContext<AuthContextType>(defaultAuthContext);

export const useAuth = () => useContext(AuthContext) || defaultAuthContext;

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isFounder, setIsFounder] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isLocalSession, setIsLocalSession] = useState(false);

  const fetchProfile = async (userId: string, userEmail?: string | null) => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      if (data) setProfile(data as Profile);

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      const email = (data?.email || userEmail || "").toLowerCase();
      const admin = roles?.some((r: any) => r.role === "admin") || email === "ceo-leandro@svp.com";
      setIsAdmin(admin);

      const founderEmails = (import.meta.env.VITE_FOUNDER_EMAILS || "")
        .split(",")
        .map((email: string) => email.trim().toLowerCase())
        .filter(Boolean);
      const founder = founderEmails.length > 0 ? founderEmails.includes(email) : admin;
      setIsFounder(founder);
    } catch (error) {
      console.error("PDG DEBUG: erro detectado e tratado", error);
      setProfile(null);
      setIsAdmin(false);
      setIsFounder(false);
    }
  };

  const applyLocalSession = () => {
    try {
      const raw = localStorage.getItem("svpa.session");
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      if (!parsed?.user) return false;
      const role = parsed.user.role || parsed.role || "user";
      const email = parsed.user.email || "ceo-leandro@svp.com";
      const id = parsed.user_id || "local-admin";
      const localUser = { id, email } as User;
      setUser(localUser);
      setSession(null);
      setIsAdmin(role === "admin");
      setIsFounder(role === "admin");
      setIsLocalSession(true);
      setProfile({
        id,
        full_name: parsed.user.name || "CEO Leandro",
        whatsapp: "",
        email,
        youtube_channel: "",
        instagram: "",
        tiktok: "",
        is_active: true,
      });
      return true;
    } catch {
      return false;
    }
  };

  const refreshProfile = async () => {
    if (user && !isLocalSession) await fetchProfile(user.id);
  };

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;

    try {
      void supabase.functions.invoke("auth-bootstrap").catch((error) => {
        console.error("PDG AUTH ERROR: auth-bootstrap", error);
      });

      const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
        try {
          setSession(session);
          setUser(session?.user ?? null);
          if (session?.user) {
            setIsLocalSession(false);
            setTimeout(() => fetchProfile(session.user.id, session.user.email), 0);
          } else {
            setProfile(null);
            setIsAdmin(false);
            setIsFounder(false);
            setIsLocalSession(false);
            applyLocalSession();
          }
          setLoading(false);
        } catch (error) {
          console.error("PDG AUTH ERROR: onAuthStateChange", error);
          setLoading(false);
        }
      });

      subscription = data.subscription;

      supabase.auth
        .getSession()
        .then(({ data: { session } }) => {
          setSession(session);
          setUser(session?.user ?? null);
          if (session?.user) {
            setIsLocalSession(false);
            fetchProfile(session.user.id, session.user.email);
          } else {
            applyLocalSession();
          }
          setLoading(false);
        })
        .catch((error) => {
          console.error("PDG AUTH ERROR: getSession", error);
          applyLocalSession();
          setLoading(false);
        });
    } catch (error) {
      console.error("PDG AUTH ERROR: bootstrap", error);
      applyLocalSession();
      setLoading(false);
    }

    return () => {
      try {
        subscription?.unsubscribe();
      } catch (error) {
        console.error("PDG AUTH ERROR: unsubscribe", error);
      }
    };
    const handleLocal = () => applyLocalSession();
    window.addEventListener("storage", handleLocal);
    window.addEventListener("svpa-local-session", handleLocal as EventListener);

    return () => {
      try {
        subscription?.unsubscribe();
      } catch (error) {
        console.error("PDG AUTH ERROR: unsubscribe", error);
      }
      window.removeEventListener("storage", handleLocal);
      window.removeEventListener("svpa-local-session", handleLocal as EventListener);
    };
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("PDG AUTH ERROR: signOut", error);
    } finally {
      localStorage.removeItem("svpa.session");
      sessionStorage.removeItem("svpa.session");
      setUser(null);
      setSession(null);
      setProfile(null);
      setIsAdmin(false);
      setIsFounder(false);
      setIsLocalSession(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isAdmin,
        isFounder,
        isActive: profile?.is_active ?? false,
        loading,
        isLocalSession,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
