import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getNextResetAt, getPlanLimits, isResetDue, type PlanId, type PlanLimits } from "@/lib/plans";

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

export const usePlan = () => {
  const { user, isFounder } = useAuth();
  const [record, setRecord] = useState<PlanRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const ensureRecord = useCallback(async () => {
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
        console.error("PDG PLAN ERROR: fetch", error);
      }

      if (!data) {
        const { data: created, error: createError } = await (supabase
          .from("subscriptions" as any)
          .insert({
            user_id: user.id,
            plan: "free",
            videos_limit: 2,
            videos_used: 0,
            reset_date: getNextResetAt(),
            status: "active",
          } as any)
          .select("*")
          .single() as any);

        if (createError) {
          console.error("PDG PLAN ERROR: create", createError);
        }
        setRecord((created as PlanRecord) || null);
        setLoading(false);
        return;
      }

      setRecord(data as PlanRecord);
      setLoading(false);
    } catch (error) {
      console.error("PDG PLAN ERROR: ensureRecord", error);
      setLoading(false);
    }
  }, [user]);

  const maybeResetUsage = useCallback(
    async (current: PlanRecord | null) => {
      try {
        if (!current || !user) return current;
        if (!isResetDue(current.reset_date)) return current;
        const nextReset = getNextResetAt();
        const { data, error } = await (supabase
          .from("subscriptions" as any)
          .update({ videos_used: 0, reset_date: nextReset } as any)
          .eq("user_id", user.id)
          .select("*")
          .single() as any);
        if (error) console.error("PDG PLAN ERROR: reset", error);
        return (data as PlanRecord) || current;
      } catch (error) {
        console.error("PDG PLAN ERROR: maybeResetUsage", error);
        return current;
      }
    },
    [user],
  );

  useEffect(() => {
    void ensureRecord();
  }, [ensureRecord]);

  useEffect(() => {
    if (!record) return;
    void (async () => {
      const updated = await maybeResetUsage(record);
      if (updated && updated !== record) setRecord(updated);
    })();
  }, [record, maybeResetUsage]);

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

  const consume = useCallback(
    async (key: string, amount = 1): Promise<LimitCheckResult> => {
      try {
        if (!user) return { allowed: false, reason: "Usuário não autenticado." };
        if (isFounder) return { allowed: true };
        if (!record) return { allowed: false, reason: "Plano indisponível." };

        const check = checkLimit(key, amount);
        if (!check.allowed) return check;

        const nextUsage = Math.max(0, (record.videos_used || 0) + amount);
        const { data, error } = await (supabase
          .from("subscriptions" as any)
          .update({ videos_used: nextUsage } as any)
          .eq("user_id", user.id)
          .select("*")
          .single() as any);

        if (error) {
          console.error("PDG PLAN ERROR: consume", error);
          return { allowed: false, reason: "Falha ao registrar uso." };
        }

        setRecord(data as PlanRecord);
        return { allowed: true };
      } catch (error) {
        console.error("PDG PLAN ERROR: consume", error);
        return { allowed: false, reason: "Erro inesperado ao registrar uso." };
      }
    },
    [user, record, checkLimit, isFounder],
  );

  const updatePlan = useCallback(
    async (plan: PlanId) => {
      try {
        if (!user) return;
        const limitMap: Record<PlanId, number | null> = {
          free: 2,
          pro: 20,
          premium: null,
        };
        const { data, error } = await (supabase
          .from("subscriptions" as any)
          .update({ plan, videos_limit: limitMap[plan] } as any)
          .eq("user_id", user.id)
          .select("*")
          .single() as any);
        if (error) {
          console.error("PDG PLAN ERROR: updatePlan", error);
          return;
        }
        setRecord(data as PlanRecord);
      } catch (error) {
        console.error("PDG PLAN ERROR: updatePlan", error);
      }
    },
    [user],
  );

  return {
    record,
    planId: isFounder ? "premium" : record?.plan || "free",
    limits,
    usage,
    loading,
    refresh: ensureRecord,
    checkLimit,
    consume,
    updatePlan,
  };
};
