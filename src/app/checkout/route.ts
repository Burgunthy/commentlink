import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createCheckoutUrl } from '@/lib/lemonsqueezy'

// GET /api/checkout?plan=pro|business → redirect to a LemonSqueezy checkout,
// tagged with the Supabase user id so the webhook can resolve the buyer.
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const plan = request.nextUrl.searchParams.get('plan') === 'business' ? 'business' : 'pro'
  const variantId =
    plan === 'business'
      ? process.env.LEMONSQUEZY_BUSINESS_VARIANT_ID
      : process.env.LEMONSQUEZY_PRO_VARIANT_ID
  if (!variantId) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  try {
    const url = await createCheckoutUrl({
      variantId,
      email: user.email || '',
      userId: user.id,
    })
    return NextResponse.redirect(url)
  } catch (err) {
    console.error('[checkout]', err)
    return NextResponse.json({ error: 'Checkout failed' }, { status: 500 })
  }
}
