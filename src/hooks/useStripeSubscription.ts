import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { PlanId } from "@/lib/plans";

interface SubscriptionState {
  subscribed: boolean;
  plan: PlanId;
  videos_limit: number | null;
  subscription_end?: string;
}

export const useStripeSubscription = () => {
  const { user } = useAuth();
  const [state, setState] = useState<SubscriptionState>({
    subscribed: false,
    plan: "free",
    videos_limit: 2,
  });
  const [loading, setLoading] = useState(true);

  const checkSubscription = useCallback(async () => {
    if (!user) {
      setState({ subscribed: false, plan: "free", videos_limit: 2 });
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) throw error;
      setState({
        subscribed: data.subscribed ?? false,
        plan: (data.plan as PlanId) ?? "free",
        videos_limit: data.videos_limit ?? 2,
        subscription_end: data.subscription_end,
      });
    } catch (e) {
      console.error("check-subscription error:", e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void checkSubscription();
  }, [checkSubscription]);

  // Auto-refresh every 60s
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(checkSubscription, 60_000);
    return () => clearInterval(interval);
  }, [user, checkSubscription]);

  const startCheckout = useCallback(
    async (priceId: string) => {
      if (!user) return;
      try {
        const { data, error } = await supabase.functions.invoke("create-checkout", {
          body: { priceId },
        });
        if (error) throw error;
        if (data?.url) {
          window.open(data.url, "_blank");
        }
      } catch (e) {
        console.error("create-checkout error:", e);
        throw e;
      }
    },
    [user],
  );

  const openPortal = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (e) {
      console.error("customer-portal error:", e);
    }
  }, [user]);

  return { ...state, loading, refresh: checkSubscription, startCheckout, openPortal };
};
