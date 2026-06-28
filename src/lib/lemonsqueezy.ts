import crypto from 'crypto'

const LS_API = 'https://api.lemonsqueezy.com/v1'

/** Map a LemonSqueezy variant id to an internal plan name. */
export function planForVariant(variantId: string | number | undefined): string {
  const id = String(variantId ?? '')
  if (id && id === process.env.LEMONSQUEZY_PRO_VARIANT_ID) return 'pro'
  if (id && id === process.env.LEMONSQUEZY_BUSINESS_VARIANT_ID) return 'business'
  return 'free'
}

/**
 * Create a LemonSqueezy checkout URL via the REST API (no SDK dependency).
 * Tags the checkout with the Supabase user id via `checkout_data.custom` so the
 * webhook can resolve the buyer back to a user without email matching.
 */
export async function createCheckoutUrl(opts: {
  variantId: string
  email: string
  userId: string
}): Promise<string> {
  const res = await fetch(`${LS_API}/checkouts`, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
      Authorization: `Bearer ${process.env.LEMONSQUEZY_API_KEY}`,
    },
    body: JSON.stringify({
      data: {
        type: 'checkouts',
        attributes: {
          // LemonSqueezy expects store/variant as strings in JSON:API payloads.
          store_id: String(process.env.LEMONSQUEZY_STORE_ID),
          variant_id: opts.variantId,
          checkout_data: {
            email: opts.email,
            custom: { user_id: opts.userId },
          },
          product_options: {
            redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?upgraded=true`,
          },
        },
      },
    }),
  })

  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`LemonSqueezy checkout failed: ${res.status} ${txt.slice(0, 300)}`)
  }

  const json = (await res.json()) as { data?: { attributes?: { url?: string } } }
  const url = json?.data?.attributes?.url
  if (!url) throw new Error('LemonSqueezy checkout returned no url')
  return url
}

/**
 * Verify a LemonSqueezy webhook signature. LemonSqueezy sends `X-Signature`
 * (hex HMAC-SHA256 of the raw body, keyed by the webhook signing secret).
 * Returns true in dev when no secret is configured.
 */
export function verifyLemonSqueezyWebhook(rawBody: string, signature: string): boolean {
  const secret = process.env.LEMONSQUEZY_WEBHOOK_SECRET
  if (!secret) return true
  const digest = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  try {
    if (digest.length !== signature.length) return false
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature))
  } catch {
    return false
  }
}
