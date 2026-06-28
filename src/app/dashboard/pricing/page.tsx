import { redirect } from "next/navigation";
import { Check, X, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getServerUserId } from "@/lib/auth-user";
import { CheckoutButton } from "./checkout-button";

export const dynamic = "force-dynamic";

interface Feature {
  label: string;
  included: boolean;
}

interface Plan {
  id: string;
  name: string;
  price: string;
  period: string;
  accounts: string;
  dms: string;
  features: Feature[];
  recommended?: boolean;
}

const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: "₩0",
    period: "",
    accounts: "1계정",
    dms: "100 DM/월",
    features: [
      { label: "공개 댓글 답장", included: true },
      { label: "키워드 DM 자동 발송", included: false },
      { label: "랜덤 추첨 (래플)", included: false },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "₩4,900",
    period: "/월",
    accounts: "3계정",
    dms: "500 DM/월",
    recommended: true,
    features: [
      { label: "공개 댓글 답장", included: true },
      { label: "키워드 DM 자동 발송", included: true },
      { label: "랜덤 추첨 (래플)", included: true },
    ],
  },
  {
    id: "business",
    name: "Business",
    price: "₩14,900",
    period: "/월",
    accounts: "무제한 계정",
    dms: "무제한 DM",
    features: [
      { label: "공개 댓글 답장", included: true },
      { label: "키워드 DM 자동 발송", included: true },
      { label: "랜덤 추첨 (래플)", included: true },
    ],
  },
];

export default async function PricingPage() {
  const userId = await getServerUserId();
  if (!userId) redirect("/auth/login");

  const supabase = await createClient();
  const { data: userRow } = await supabase
    .from("users")
    .select("plan")
    .eq("id", userId)
    .maybeSingle();

  const currentPlan = userRow?.plan ?? "free";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">요금제</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          비즈니스 성장에 맞춰 가장 적합한 플랜을 선택하세요.
        </p>
      </div>

      {/* Plan cards */}
      <div className="grid gap-5 md:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrent = plan.id === currentPlan;
          return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-2xl border bg-white p-6 dark:bg-zinc-900 ${
                plan.recommended
                  ? "border-primary shadow-lg shadow-primary/10 dark:border-primary"
                  : "border-zinc-200 dark:border-zinc-800"
              }`}
            >
              {plan.recommended && (
                <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white">
                  <Star className="h-3 w-3 fill-current" />
                  추천
                </span>
              )}

              {/* Name + price */}
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                {plan.name}
              </h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                  {plan.price}
                </span>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">{plan.period}</span>
              </div>

              {/* Limits */}
              <div className="mt-4 space-y-1.5 text-sm text-zinc-600 dark:text-zinc-300">
                <p className="font-medium">{plan.accounts}</p>
                <p className="font-medium">{plan.dms}</p>
              </div>

              <div className="my-5 h-px bg-zinc-100 dark:bg-zinc-800" />

              {/* Features */}
              <ul className="flex-1 space-y-2.5">
                {plan.features.map((feature) => (
                  <li key={feature.label} className="flex items-center gap-2 text-sm">
                    {feature.included ? (
                      <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                    ) : (
                      <X className="h-4 w-4 shrink-0 text-zinc-300 dark:text-zinc-600" />
                    )}
                    <span
                      className={
                        feature.included
                          ? "text-zinc-700 dark:text-zinc-200"
                          : "text-zinc-400 dark:text-zinc-500 line-through"
                      }
                    >
                      {feature.label}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <div className="mt-6">
                {isCurrent ? (
                  <div className="flex w-full items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-semibold text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-400">
                    현재 요금제
                  </div>
                ) : plan.id !== "free" ? (
                  <CheckoutButton plan={plan.id} />
                ) : (
                  <div className="flex w-full items-center justify-center rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-400 dark:border-zinc-700 dark:text-zinc-500">
                    기본 제공
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-zinc-400 dark:text-zinc-500">
        결제는 LemonSqueezy를 통해 안전하게 처리됩니다. 언제든 구독을 변경하거나 취소할 수 있습니다.
      </p>
    </div>
  );
}
