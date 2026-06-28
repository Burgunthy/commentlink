import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/server'
import { syncAccountPosts } from '@/lib/syncPosts'

export const maxDuration = 60

// GET /api/cron/sync-posts — periodically re-sync every active account's recent
// media into the posts table so newly published posts get comment→DM automation
// without a manual reconnect. Protected by CRON_SECRET (Vercel Cron sends it as
// a Bearer token). Scheduled in vercel.json.
export async function GET(request: NextRequest) {
  const expected = `Bearer ${process.env.CRON_SECRET}`
  if (process.env.CRON_SECRET && request.headers.get('authorization') !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await getServiceClient()
  const { data: accounts, error } = await supabase
    .from('accounts')
    .select('id, access_token, token_expires_at, ig_username')
    .eq('is_active', true)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const results = await Promise.all(
    (accounts ?? []).map(async (a) => ({
      id: a.id,
      username: a.ig_username,
      synced: await syncAccountPosts(supabase, a),
    }))
  )

  const postsSynced = results.reduce((sum, r) => sum + r.synced, 0)
  console.log(
    `[cron:sync-posts] accounts=${results.length} postsSynced=${postsSynced}`
  )
  return NextResponse.json({
    accounts: results.length,
    postsSynced,
    results,
  })
}
