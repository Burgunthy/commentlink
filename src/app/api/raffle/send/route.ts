import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/server'
import { ensureFreshToken } from '@/lib/instagram'
import { sendInstagramDm } from '@/lib/dm'

interface SendBody {
  message?: string
  conversation_ids?: string[]
}

// POST /api/raffle/send — send a congratulation DM to the given winners.
// Body: { message: string, conversation_ids: string[] }
// Winners usually share one account, so access tokens are cached per account.
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SendBody
    const message = (body.message || '').trim()
    const ids = Array.isArray(body.conversation_ids) ? body.conversation_ids : []

    if (!message) {
      return NextResponse.json({ error: 'message is required.' }, { status: 400 })
    }
    if (ids.length === 0) {
      return NextResponse.json({ error: 'conversation_ids is required.' }, { status: 400 })
    }

    const supabase = await getServiceClient()

    const { data: convs, error } = await supabase
      .from('conversations')
      .select('id, user_igsid, accounts ( id, access_token, token_expires_at )')
      .in('id', ids)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // accounts is a many-to-one embed → single object at runtime (the client
    // infers it as an array without generated DB types), cast through unknown.
    const rows = (convs ?? []) as unknown as Array<{
      id: string
      user_igsid: string
      accounts: { id: string; access_token: string; token_expires_at: string | null } | null
    }>

    if (rows.length === 0) {
      return NextResponse.json({ error: 'No matching conversations.' }, { status: 404 })
    }

    const tokenCache = new Map<string, string>()
    const getAccessToken = async (acc: {
      id: string
      access_token: string
      token_expires_at: string | null
    }): Promise<string> => {
      const cached = tokenCache.get(acc.id)
      if (cached) return cached
      const token = await ensureFreshToken(supabase, acc)
      tokenCache.set(acc.id, token)
      return token
    }

    const results: Array<{ id: string; ok: boolean; error?: string }> = []
    for (const row of rows) {
      if (!row.accounts) {
        results.push({ id: row.id, ok: false, error: 'account missing' })
        continue
      }
      const token = await getAccessToken(row.accounts)
      const res = await sendInstagramDm(token, row.user_igsid, message)
      results.push({ id: row.id, ok: res.ok, error: res.error })
    }

    const sent = results.filter((r) => r.ok).length
    return NextResponse.json({
      data: { sent, total: results.length, results },
    })
  } catch (err) {
    console.error('[raffle send POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
