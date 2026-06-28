import type { SupabaseClient } from "@supabase/supabase-js";

interface PlanCheckResult {
  allowed: boolean;
  reason?: string;
  used: number;
  limit: number;
}

/**
 * Check whether the user can send a DM under their current plan's monthly limit.
 * Returns { allowed, reason?, used, limit }.
 * A limit of -1 means unlimited.
 */
export async function canSendDm(
  supabase: SupabaseClient,
  userId: string
): Promise<PlanCheckResult> {
  const { data: user } = await supabase
    .from("users")
    .select("plan")
    .eq("id", userId)
    .single();

  const plan = user?.plan || "free";

  const { data: config } = await supabase
    .from("plan_config")
    .select("max_dms_per_month")
    .eq("plan", plan)
    .single();

  const limit = config?.max_dms_per_month ?? 100;
  if (limit === -1) return { allowed: true, used: 0, limit: -1 };

  const month = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  const { data: usageRow } = await supabase
    .from("usage")
    .select("dms_sent")
    .eq("user_id", userId)
    .eq("month", month)
    .single();

  const used = usageRow?.dms_sent ?? 0;
  if (used >= limit) {
    return {
      allowed: false,
      reason: `Monthly DM limit reached (${used}/${limit}). Upgrade your plan.`,
      used,
      limit,
    };
  }
  return { allowed: true, used, limit };
}

/**
 * Atomically increment the user's monthly DM-sent counter via the `increment_dms`
 * RPC (INSERT … ON CONFLICT DO UPDATE). Best-effort: logs on failure but does
 * not throw, so it cannot break the webhook response.
 */
export async function incrementDmUsage(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const month = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  const { error } = await supabase.rpc("increment_dms", {
    p_user_id: userId,
    p_month: month,
  });
  if (error) {
    console.error("[plan-guard] increment_dms failed:", error.message);
  }
}

/**
 * Check whether the user can add another Instagram account under their plan.
 * Returns { allowed, reason?, count, limit }.
 * A limit of -1 means unlimited.
 */
export async function canAddAccount(
  supabase: SupabaseClient,
  userId: string
): Promise<{ allowed: boolean; reason?: string; count: number; limit: number }> {
  const { data: user } = await supabase
    .from("users")
    .select("plan")
    .eq("id", userId)
    .single();

  const plan = user?.plan || "free";

  const { data: config } = await supabase
    .from("plan_config")
    .select("max_accounts")
    .eq("plan", plan)
    .single();

  const limit = config?.max_accounts ?? 1;
  if (limit === -1) return { allowed: true, count: 0, limit: -1 };

  const { count } = await supabase
    .from("accounts")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  const accountCount = count ?? 0;
  if (accountCount >= limit) {
    return {
      allowed: false,
      reason: `Account limit reached (${accountCount}/${limit}). Upgrade your plan.`,
      count: accountCount,
      limit,
    };
  }
  return { allowed: true, count: accountCount, limit };
}
