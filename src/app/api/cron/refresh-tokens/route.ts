import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/server'
import { refreshAndPersistAccount } from '@/lib/instagram'

export const maxDuration = 30

const REFRESH_WITHIN_DAYS = 7

export async function GET(request: NextRequest) {
  const expected = `Bearer ${process.env.CRON_SECRET}`
  if (process.env.CRON_SECRET && request.headers.get('authorization') !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await getServiceClient()
  const horizon = new Date(
    Date.now() + REFRESH_WITHIN_DAYS * 24 * 3600 * 1000
  ).toISOString()

  const { data: accounts, error } = await supabase
    .from('accounts')
    .select('id, access_token, token_expires_at, ig_username')
    .or(`token_expires_at.is.null,token_expires_at.lte.${horizon}`)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const results = await Promise.all(
    (accounts ?? []).map(async (a) => {
      const ok = (await refreshAndPersistAccount(supabase, a)) !== null
      // Track refresh failure so the dashboard can warn about stale tokens.
      await supabase
        .from('accounts')
        .update({ token_refresh_failed_at: ok ? null : new Date().toISOString() })
        .eq('id', a.id)
      return { id: a.id, username: a.ig_username, ok }
    })
  )

  const refreshed = results.filter((r) => r.ok).length
  const failed = results.length - refreshed
  console.log(
    `[cron:refresh] total=${results.length} refreshed=${refreshed} failed=${failed}`
  )
  return NextResponse.json({
    total: results.length,
    refreshed,
    failed,
    failedAccounts: results.filter((r) => !r.ok),
  })
}
