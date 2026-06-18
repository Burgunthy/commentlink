import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/server'
import { ensureFreshToken } from '@/lib/instagram'
import {
  buildDmMessage,
  sendInstagramDm,
  type AccountRow,
  type PostRow,
} from '@/lib/dm'

type RouteContext = { params: Promise<{ id: string }> }

// Conversation row with its many-to-one post + account embeds. The Supabase
// client infers these as arrays (no generated DB types), so the query result is
// cast through `unknown` to this single-object shape.
interface ResendConversation {
  id: string
  user_igsid: string
  username: string | null
  is_following: boolean | null
  status: string | null
  posts: PostRow | null
  accounts: AccountRow | null
}

// POST /api/conversations/[id]/resend-dm — manually re-send the DM for a
// conversation, rebuilding the message with the *same* buildDmMessage logic the
// webhook uses, then re-delivering it via the Graph API.
export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const supabase = await getServiceClient()

    const { data: conv, error } = await supabase
      .from('conversations')
      .select(
        `id, user_igsid, username, is_following, status,
         posts ( id, account_id, media_id, caption, dm_message, dm_link_url, public_reply_text, not_following_dm, not_following_link ),
         accounts ( id, access_token, token_expires_at, ig_username, reply_comment_text, public_reply_enabled, follow_check_enabled, private_reply_text, not_following_text )`
      )
      .eq('id', id)
      .single()

    if (error || !conv) {
      return NextResponse.json({ error: 'Conversation not found.' }, { status: 404 })
    }

    const conversation = conv as unknown as ResendConversation
    const account = conversation.accounts
    const post = conversation.posts

    if (!account) {
      return NextResponse.json({ error: 'Account missing for this conversation.' }, { status: 400 })
    }
    if (!post) {
      return NextResponse.json({ error: 'Post missing for this conversation.' }, { status: 400 })
    }
    if (!conversation.user_igsid) {
      return NextResponse.json({ error: 'No recipient (user_igsid) for this conversation.' }, { status: 400 })
    }

    // Rebuild the DM exactly as the webhook would (no keyword context here, so
    // it resolves to the post-level / account-level message). Treat a null
    // is_following as a follower to avoid suppressing the resend.
    const isFollower = conversation.is_following !== false
    const dmMessage = buildDmMessage(account, post, undefined, isFollower)

    if (!dmMessage) {
      return NextResponse.json(
        { error: 'No DM message configured for this post.' },
        { status: 400 }
      )
    }

    const accessToken = await ensureFreshToken(supabase, {
      id: account.id,
      access_token: account.access_token,
      token_expires_at: account.token_expires_at,
    })

    const result = await sendInstagramDm(accessToken, conversation.user_igsid, dmMessage)
    if (!result.ok) {
      // Persist the failure reason so it surfaces in the history detail view.
      await supabase
        .from('conversations')
        .update({ status: 'failed', error_message: (result.error ?? 'unknown').slice(0, 500) })
        .eq('id', id)
      return NextResponse.json({ error: result.error ?? 'DM send failed.' }, { status: 502 })
    }

    const nowIso = new Date().toISOString()
    await supabase
      .from('conversations')
      .update({ status: 'dm_sent', dm_sent_at: nowIso, error_message: null })
      .eq('id', id)

    return NextResponse.json({ data: { status: 'dm_sent', dm_sent_at: nowIso } })
  } catch (err) {
    console.error('[conversations resend-dm]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
