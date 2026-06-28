import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getServerUserId } from "@/lib/auth-user";
import { DashboardContent } from "./dashboard-content";
import { UsageMeter } from "./usage-meter";
import { UpgradeBanner } from "./upgrade-banner";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const userId = await getServerUserId();
  if (!userId) redirect("/auth/login");

  const supabase = await createClient();

  // Current plan
  const { data: userRow } = await supabase
    .from("users")
    .select("plan")
    .eq("id", userId)
    .maybeSingle();
  const plan = userRow?.plan ?? "free";

  // DM limit for the plan (-1 means unlimited)
  const { data: planConfig } = await supabase
    .from("plan_config")
    .select("max_dms_per_month")
    .eq("plan", plan)
    .maybeSingle();
  const limit = planConfig?.max_dms_per_month ?? 100;

  // This month's DM usage
  const month = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  const { data: usageRow } = await supabase
    .from("usage")
    .select("dms_sent")
    .eq("user_id", userId)
    .eq("month", month)
    .maybeSingle();
  const used = usageRow?.dms_sent ?? 0;

  // Accounts whose Instagram token is expiring soon (<7d) or failed to refresh.
  const horizon = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
  const { data: failing } = await supabase
    .from("accounts")
    .select("id, ig_username")
    .not("token_refresh_failed_at", "is", null);
  const { data: expiring } = await supabase
    .from("accounts")
    .select("id, ig_username")
    .lt("token_expires_at", horizon);
  const staleAccounts = Array.from(
    new Map(
      [...(failing ?? []), ...(expiring ?? [])].map((a) => [a.id, a])
    ).values()
  );

  return (
    <div className="space-y-6">
      <UsageMeter plan={plan} used={used} limit={limit} />
      {plan === "free" && <UpgradeBanner />}
      {staleAccounts.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
          ⚠ {staleAccounts.length}개 계정의 Instagram 연결이 만료 임박이거나 토큰 갱신에
          실패했습니다. 계정 설정에서 재연결해 주세요.
        </div>
      )}
      <DashboardContent />
    </div>
  );
}
