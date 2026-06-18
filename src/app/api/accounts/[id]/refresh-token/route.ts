import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/server'
import { refreshLongLivedToken } from '@/lib/instagram'

type RouteContext = { params: Promise<{ id: string }> }

// POST /api/accounts/[id]/refresh-token — refresh the account's long-lived
// Instagram access token (~60-day lifetime, refreshable once per 24h).
//
// Note: uses the `ig_refresh_token` grant (refreshLongLivedToken), NOT the
// `ig_exchange_token` grant — the latter only converts a short-lived token to
// a long-lived one and cannot refresh an already long-lived token.
export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const supabase = await getServiceClient()

    const { data: account, error } = await supabase
      .from('accounts')
      .select('id, access_token')
      .eq('id', id)
      .single()

    if (error || !account) {
      return NextResponse.json({ error: 'Account not found.' }, { status: 404 })
    }

    const refreshed = await refreshLongLivedToken(account.access_token)
    if (!refreshed) {
      return NextResponse.json(
        {
          error:
            'Token refresh failed. The token may be expired or revoked — re-connect the account.',
        },
        { status: 502 }
      )
    }

    const newExpiresAt = new Date(
      Date.now() + refreshed.expiresInSeconds * 1000
    ).toISOString()

    const { error: updateError } = await supabase
      .from('accounts')
      .update({ access_token: refreshed.accessToken, token_expires_at: newExpiresAt })
      .eq('id', id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ data: { token_expires_at: newExpiresAt } })
  } catch (err) {
    console.error('[accounts refresh-token]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
