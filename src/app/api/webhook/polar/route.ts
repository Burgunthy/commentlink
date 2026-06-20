import { Webhooks } from "@polar-sh/nextjs";
import { getServiceClient } from "@/lib/supabase/server";

/** Map Polar product IDs to internal plan names. */
function planForProduct(productId: string): string {
  if (productId === process.env.POLAR_PRO_PRODUCT_ID) return "pro";
  if (productId === process.env.POLAR_BUSINESS_PRODUCT_ID) return "business";
  return "free";
}

/**
 * Resolve a Polar customer back to a Supabase user ID.
 * We store the user's Supabase uid in the Polar customer metadata under the key
 * "supabase_user_id".  Falls back to looking up by polar_customer_id in users table.
 */
async function resolveUserId(
  customerId: string,
  customerMetadata?: Record<string, unknown>
): Promise<string | null> {
  // 1. Check metadata first (most reliable)
  if (customerMetadata?.["supabase_user_id"]) {
    return customerMetadata["supabase_user_id"] as string;
  }

  // 2. Fallback: look up by polar_customer_id in users table
  const supabase = await getServiceClient();
  const { data } = await supabase
    .from("users")
    .select("id")
    .eq("polar_customer_id", customerId)
    .single();

  return data?.id ?? null;
}

/** Upsert a subscription row keyed by polar_subscription_id. */
async function upsertSubscription(sub: {
  userId: string;
  customerId: string;
  productId: string;
  subscriptionId: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}) {
  const supabase = await getServiceClient();
  await supabase.from("subscriptions").upsert(
    {
      user_id: sub.userId,
      polar_customer_id: sub.customerId,
      polar_subscription_id: sub.subscriptionId,
      polar_product_id: sub.productId,
      status: sub.status,
      current_period_start: sub.currentPeriodStart,
      current_period_end: sub.currentPeriodEnd,
      cancel_at_period_end: sub.cancelAtPeriodEnd,
    },
    { onConflict: "polar_subscription_id" }
  );
}

/** Update a user's plan. */
async function updateUserPlan(userId: string, plan: string) {
  const supabase = await getServiceClient();
  await supabase.from("users").update({ plan }).eq("id", userId);
}

export const POST = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,

  onSubscriptionCreated: async (payload) => {
    const sub = payload.data;
    const userId = await resolveUserId(sub.customerId, sub.customer?.metadata as Record<string, unknown> | undefined);
    if (!userId) {
      console.error(`[polar] subscription.created: could not resolve user for customer ${sub.customerId}`);
      return;
    }

    const plan = planForProduct(sub.productId);

    await upsertSubscription({
      userId,
      customerId: sub.customerId,
      subscriptionId: sub.id,
      productId: sub.productId,
      status: sub.status,
      currentPeriodStart: sub.currentPeriodStart instanceof Date ? sub.currentPeriodStart.toISOString() : String(sub.currentPeriodStart),
      currentPeriodEnd: sub.currentPeriodEnd instanceof Date ? sub.currentPeriodEnd.toISOString() : String(sub.currentPeriodEnd),
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    });

    await updateUserPlan(userId, plan);
    console.log(`[polar] subscription.created: user ${userId} → plan ${plan}`);
  },

  onSubscriptionUpdated: async (payload) => {
    const sub = payload.data;
    const userId = await resolveUserId(sub.customerId, sub.customer?.metadata as Record<string, unknown> | undefined);
    if (!userId) {
      console.error(`[polar] subscription.updated: could not resolve user for customer ${sub.customerId}`);
      return;
    }

    await upsertSubscription({
      userId,
      customerId: sub.customerId,
      subscriptionId: sub.id,
      productId: sub.productId,
      status: sub.status,
      currentPeriodStart: sub.currentPeriodStart instanceof Date ? sub.currentPeriodStart.toISOString() : String(sub.currentPeriodStart),
      currentPeriodEnd: sub.currentPeriodEnd instanceof Date ? sub.currentPeriodEnd.toISOString() : String(sub.currentPeriodEnd),
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    });

    console.log(`[polar] subscription.updated: user ${userId} → status ${sub.status}`);
  },

  onSubscriptionCanceled: async (payload) => {
    const sub = payload.data;
    const userId = await resolveUserId(sub.customerId, sub.customer?.metadata as Record<string, unknown> | undefined);
    if (!userId) {
      console.error(`[polar] subscription.canceled: could not resolve user for customer ${sub.customerId}`);
      return;
    }

    const supabase = await getServiceClient();
    await supabase
      .from("subscriptions")
      .update({
        status: "canceled",
        cancel_at_period_end: sub.cancelAtPeriodEnd,
      })
      .eq("polar_subscription_id", sub.id);

    // If subscription ends immediately (not at period end), downgrade now
    if (!sub.cancelAtPeriodEnd) {
      await updateUserPlan(userId, "free");
    }

    console.log(`[polar] subscription.canceled: user ${userId} (cancel_at_period_end=${sub.cancelAtPeriodEnd})`);
  },

  onSubscriptionRevoked: async (payload) => {
    const sub = payload.data;
    const userId = await resolveUserId(sub.customerId, sub.customer?.metadata as Record<string, unknown> | undefined);
    if (!userId) {
      console.error(`[polar] subscription.revoked: could not resolve user for customer ${sub.customerId}`);
      return;
    }

    const supabase = await getServiceClient();
    await supabase
      .from("subscriptions")
      .update({
        status: "canceled",
      })
      .eq("polar_subscription_id", sub.id);

    await updateUserPlan(userId, "free");
    console.log(`[polar] subscription.revoked: user ${userId} → plan free`);
  },

  onPayload: async (payload) => {
    console.log(`[polar] unhandled event: ${payload.type}`);
  },
});
