import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getNextResetAt, getPlanLimits, isResetDue, type PlanId, type PlanLimits } from "@/lib/plans";

interface PlanRecord {
  id: string;
  user_id: string;
  plano: PlanId;
  limite_diario_json: PlanLimits;
  uso_hoje_json: Record<string, number>;
  reset_at: string | null;
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
        .from("usuarios_planos" as any)
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle() as any);

      if (error) {
        console.error("PDG PLAN ERROR: fetch", error);
      }

      if (!data) {
        const defaults = getPlanLimits("start");
        const { data: created, error: createError } = await (supabase
          .from("usuarios_planos" as any)
          .insert({
            user_id: user.id,
            plano: "start",
            limite_diario_json: defaults,
            uso_hoje_json: {},
            reset_at: getNextResetAt(),
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
        if (!isResetDue(current.reset_at)) return current;
        const nextReset = getNextResetAt();
        const { data, error } = await (supabase
          .from("usuarios_planos" as any)
          .update({ uso_hoje_json: {}, reset_at: nextReset } as any)
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
      ? getPlanLimits("pro")
      : record?.limite_diario_json || getPlanLimits(record?.plano || "start");
    if (!isFounder) return baseLimits;
    return Object.fromEntries(
      Object.entries(baseLimits).map(([key, value]) => [
        key,
        typeof value === "number" ? Number.POSITIVE_INFINITY : true,
      ]),
    ) as PlanLimits;
  }, [record, isFounder]);

  const usage = useMemo(() => record?.uso_hoje_json || {}, [record]);

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

        const currentUsage = record.uso_hoje_json || {};
        const nextUsage = {
          ...currentUsage,
          [key]: (currentUsage[key] || 0) + amount,
        };

        const { data, error } = await supabase
          .from("usuarios_planos")
          .update({ uso_hoje_json: nextUsage })
          .eq("user_id", user.id)
          .select("*")
          .single();

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
        const { data, error } = await supabase
          .from("usuarios_planos")
          .update({ plano: plan, limite_diario_json: getPlanLimits(plan) })
          .eq("user_id", user.id)
          .select("*")
          .single();
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
    planId: isFounder ? "pro" : record?.plano || "start",
    limits,
    usage,
    loading,
    refresh: ensureRecord,
    checkLimit,
    consume,
    updatePlan,
  };
};
