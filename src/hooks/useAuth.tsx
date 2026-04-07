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
  avatar_url: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  isFounder: boolean;
  isActive: boolean;
  loading: boolean;
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

  // Safety timeout: never stay loading forever
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn("PDG AUTH: loading timeout reached, forcing ready state");
        setLoading(false);
      }
    }, 4000);
    return () => clearTimeout(timeout);
  }, [loading]);

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
      const admin = roles?.some((r: any) => r.role === "admin");
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

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
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
            setTimeout(() => fetchProfile(session.user.id, session.user.email), 0);
          } else {
            setProfile(null);
            setIsAdmin(false);
            setIsFounder(false);
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
            fetchProfile(session.user.id, session.user.email);
          }
          setLoading(false);
        })
        .catch((error) => {
          console.error("PDG AUTH ERROR: getSession", error);
          setLoading(false);
        });
    } catch (error) {
      console.error("PDG AUTH ERROR: bootstrap", error);
      setLoading(false);
    }

    return () => {
      try {
        subscription?.unsubscribe();
      } catch (error) {
        console.error("PDG AUTH ERROR: unsubscribe", error);
      }
    };
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("PDG AUTH ERROR: signOut", error);
    } finally {
      setUser(null);
      setSession(null);
      setProfile(null);
      setIsAdmin(false);
      setIsFounder(false);
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
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
