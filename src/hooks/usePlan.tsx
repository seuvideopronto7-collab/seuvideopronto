import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getPlanLimits, type PlanId, type PlanLimits } from "@/lib/plans";
import { handleSecurityError } from "@/lib/secureErrors";

interface PlanRecord {
  id: string;
  user_id: string;
  plan: PlanId;
  videos_limit: number | null;
  videos_used: number;
  reset_date: string | null;
  status: string;
}

interface LimitCheckResult {
  allowed: boolean;
  reason?: string;
}

/**
 * READ-ONLY hook for the user's subscription/plan.
 * All writes (create plan, change plan, change limits, reset usage) are
 * performed server-side via secure edge functions / SECURITY DEFINER RPCs.
 * The client NEVER inserts/updates `subscriptions` or `usuarios_planos`.
 */
export const usePlan = () => {
  const { user, isFounder } = useAuth();
  const [record, setRecord] = useState<PlanRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRecord = useCallback(async () => {
    try {
      if (!user) {
        setRecord(null);
        setLoading(false);
        return;
      }

      const { data, error } = await (supabase
        .from("subscriptions" as any)
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle() as any);

      if (error) {
        handleSecurityError(error, "consulta de plano");
      }

      // If row missing, ask backend to bootstrap. Never insert from the client.
      if (!data) {
        try {
          await supabase.functions.invoke("auth-bootstrap", { body: {} });
          const { data: retry } = await (supabase
            .from("subscriptions" as any)
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle() as any);
          setRecord((retry as PlanRecord) || null);
        } catch (e) {
          handleSecurityError(e, "inicialização de plano");
          setRecord(null);
        }
        setLoading(false);
        return;
      }

      setRecord(data as PlanRecord);
      setLoading(false);
    } catch (error) {
      handleSecurityError(error, "consulta de plano");
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void fetchRecord();
  }, [fetchRecord]);

  const limits = useMemo(() => {
    const baseLimits = isFounder
      ? getPlanLimits("premium")
      : getPlanLimits(record?.plan || "free");
    if (isFounder) {
      return Object.fromEntries(
        Object.entries(baseLimits).map(([key, value]) => [
          key,
          typeof value === "number" ? Number.POSITIVE_INFINITY : true,
        ]),
      ) as PlanLimits;
    }

    if (record?.videos_limit !== undefined) {
      return {
        ...baseLimits,
        videos_dia:
          record.videos_limit === null ? Number.POSITIVE_INFINITY : record.videos_limit,
      } as PlanLimits;
    }

    return baseLimits;
  }, [record, isFounder]);

  const usage = useMemo(() => ({ videos_dia: record?.videos_used || 0 }), [record]);

  const checkLimit = useCallback(
    (key: string, amount = 1): LimitCheckResult => {
      if (isFounder) return { allowed: true };
      const limit = limits?.[key];
      if (typeof limit === "boolean") {
        if (!limit) return { allowed: false, reason: "Seu plano não inclui este recurso." };
        return { allowed: true };
      }
      if (typeof limit === "number") {
        const used = usage?.[key] || 0;
        if (used + amount > limit) {
          return { allowed: false, reason: `Limite diário atingido (${used}/${limit}).` };
        }
      }
      return { allowed: true };
    },
    [limits, usage, isFounder],
  );

  /**
   * Increment video usage via SECURITY DEFINER RPC.
   * The client cannot directly UPDATE subscriptions.videos_used.
   */
  const consume = useCallback(
    async (key: string, amount = 1): Promise<LimitCheckResult> => {
      try {
        if (!user) return { allowed: false, reason: "Usuário não autenticado." };
        if (isFounder) return { allowed: true };
        if (!record) return { allowed: false, reason: "Plano indisponível." };

        const check = checkLimit(key, amount);
        if (!check.allowed) return check;

        if (key === "videos_dia") {
          for (let i = 0; i < amount; i++) {
            const { error } = await (supabase as any).rpc("increment_videos_used", {
              _user_id: user.id,
            });
            if (error) {
              handleSecurityError(error, "registro de uso");
              return { allowed: false, reason: "Falha ao registrar uso." };
            }
          }
          // Refresh local record (read-only)
          await fetchRecord();
        }

        return { allowed: true };
      } catch (error) {
        handleSecurityError(error, "registro de uso");
        return { allowed: false, reason: "Erro inesperado ao registrar uso." };
      }
    },
    [user, record, checkLimit, isFounder, fetchRecord],
  );

  /**
   * Plan changes are handled exclusively by the billing backend
   * (Stripe/Hotmart/Eduzz webhooks + check-subscription edge function).
   * Client cannot mutate `subscriptions.plan` or `videos_limit` directly.
   */
  const updatePlan = useCallback(
    async (_plan: PlanId) => {
      try {
        await supabase.functions.invoke("check-subscription", { body: {} });
        await fetchRecord();
      } catch (error) {
        handleSecurityError(error, "atualização de plano");
      }
    },
    [fetchRecord],
  );

  return {
    record,
    planId: isFounder ? "premium" : record?.plan || "free",
    limits,
    usage,
    loading,
    refresh: fetchRecord,
    checkLimit,
    consume,
    updatePlan,
  };
};
