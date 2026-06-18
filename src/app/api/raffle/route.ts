import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/server'

interface RaffleEntry {
  id: string
  username: string | null
  comment_text: string | null
  user_igsid: string
  is_following: boolean | null
}

// GET /api/raffle?post_id=...&keyword=...&must_follow=true&count=5
// Draw `count` random winners from the conversations on a post, optionally
// filtered by a keyword in the comment text and/or a follow requirement.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const postId = searchParams.get('post_id')
    const keyword = searchParams.get('keyword')?.trim()
    const mustFollow = searchParams.get('must_follow') === 'true'
    const countRaw = Number(searchParams.get('count') ?? '5')
    const count = Number.isFinite(countRaw) && countRaw > 0 ? Math.floor(countRaw) : 5

    if (!postId) {
      return NextResponse.json({ error: 'post_id is required.' }, { status: 400 })
    }

    const supabase = await getServiceClient()

    let query = supabase
      .from('conversations')
      .select('id, username, comment_text, user_igsid, is_following')
      .eq('post_id', postId)

    if (mustFollow) {
      query = query.eq('is_following', true)
    }

    const { data, error } = await query
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    let entries = (data ?? []) as RaffleEntry[]

    // Keyword filter is applied client-side (pools per post are small).
    if (keyword) {
      const kw = keyword.toLowerCase()
      entries = entries.filter((e) => (e.comment_text || '').toLowerCase().includes(kw))
    }

    // Fisher–Yates shuffle. Math.random is fine here (this is a route handler,
    // not a deterministic workflow script).
    for (let i = entries.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[entries[i], entries[j]] = [entries[j], entries[i]]
    }

    const winners = entries.slice(0, count)

    return NextResponse.json({
      data: {
        winners,
        pool_size: entries.length,
        selected: winners.length,
      },
    })
  } catch (err) {
    console.error('[raffle GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
