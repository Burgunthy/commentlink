import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/server'
import { verifyLemonSqueezyWebhook, planForVariant } from '@/lib/lemonsqueezy'

/** LemonSqueezy webhook payload shape (only the fields we use). */
interface LsPayload {
  meta: {
    event_name: string
    custom_data?: { user_id?: string } | null
  }
  data: {
    id: string
    attributes: {
      status: string
      customer_id: string | number
      variant_id: string | number
      renews_at?: string | null
      cancelled?: boolean | null
    }
  }
}

async function upsertSubscription(s: {
  userId: string
  customerId: string
  variantId: string
  subscriptionId: string
  status: string
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
}) {
  const supabase = await getServiceClient()
  await supabase.from('subscriptions').upsert(
    {
      user_id: s.userId,
      customer_id: s.customerId,
      subscription_id: s.subscriptionId,
      variant_id: s.variantId,
      status: s.status,
      current_period_end: s.currentPeriodEnd,
      cancel_at_period_end: s.cancelAtPeriodEnd,
    },
    { onConflict: 'subscription_id' }
  )
}

async function updateUserPlan(userId: string, plan: string) {
  const supabase = await getServiceClient()
  await supabase.from('users').update({ plan }).eq('id', userId)
}

async function markSubscriptionCanceled(subscriptionId: string) {
  const supabase = await getServiceClient()
  await supabase
    .from('subscriptions')
    .update({ status: 'canceled' })
    .eq('subscription_id', subscriptionId)
}

// POST /api/webhook/lemonsqueezy — verify signature, then sync plan on sub events.
export async function POST(request: NextRequest) {
  const raw = await request.text()
  const signature = request.headers.get('x-signature') || ''
  if (!verifyLemonSqueezyWebhook(raw, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const payload = JSON.parse(raw) as LsPayload
  const eventName = payload.meta.event_name
  const userId = payload.meta.custom_data?.user_id ?? null
  const attrs = payload.data.attributes

  if (!userId) {
    console.error(`[lemonsqueezy] ${eventName}: no user_id in custom_data`)
    return NextResponse.json({ ok: true })
  }

  const plan = planForVariant(attrs.variant_id)

  if (eventName === 'subscription_created') {
    await upsertSubscription({
      userId,
      customerId: String(attrs.customer_id),
      variantId: String(attrs.variant_id),
      subscriptionId: payload.data.id,
      status: attrs.status,
      currentPeriodEnd: attrs.renews_at ?? null,
      cancelAtPeriodEnd: Boolean(attrs.cancelled),
    })
    await updateUserPlan(userId, plan)
  } else if (eventName === 'subscription_updated') {
    await upsertSubscription({
      userId,
      customerId: String(attrs.customer_id),
      variantId: String(attrs.variant_id),
      subscriptionId: payload.data.id,
      status: attrs.status,
      currentPeriodEnd: attrs.renews_at ?? null,
      cancelAtPeriodEnd: Boolean(attrs.cancelled),
    })
  } else if (eventName === 'subscription_cancelled' || eventName === 'subscription_expired') {
    await markSubscriptionCanceled(payload.data.id)
    await updateUserPlan(userId, 'free')
  } else {
    console.log(`[lemonsqueezy] unhandled event: ${eventName}`)
  }

  console.log(`[lemonsqueezy] ${eventName}: user ${userId} plan ${plan}`)
  return NextResponse.json({ ok: true })
}
