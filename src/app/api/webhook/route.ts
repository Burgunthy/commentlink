import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import * as crypto from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

// Meta App config
const APP_SECRET = process.env.META_APP_SECRET || ''
const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || 'commentlink_verify'

// Simple in-memory dedup (use Redis in production)
const processedComments = new Set<string>()
const DEDUP_TTL_MS = 60_000 // 1 minute

// Instagram Graph API
function igApi(path: string, params: Record<string, string>, method = 'GET') {
  const url = new URL(`https://graph.instagram.com/v25.0/${path}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const options: RequestInit = method === 'POST' ? { method: 'POST' } : {}
  return fetch(url.toString(), options).then(r => r.json())
}

// Verify webhook signature
function verifySignature(payload: string, signature: string): boolean {
  if (!APP_SECRET) return true // dev mode
  const expected = 'sha256=' + crypto.createHmac('sha256', APP_SECRET).update(payload).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
}

// GET: Webhook verification (Meta requirement)
export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get('hub.mode')
  const token = request.nextUrl.searchParams.get('hub.verify_token')
  const challenge = request.nextUrl.searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return new Response(challenge || '', { status: 200 })
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
}

// POST: Handle incoming webhook
export async function POST(request: NextRequest) {
  const signature = request.headers.get('x-hub-signature-256') || ''
  const body = await request.text()

  if (!verifySignature(body, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const data = JSON.parse(body) as {
    object: string
    entry?: Array<{ changes: Array<{ field: string; value: WebhookCommentValue }> }>
  }
  console.log('[webhook] received:', JSON.stringify(data, null, 2))

  if (data.object !== 'instagram') {
    return NextResponse.json({ ok: true })
  }

  const supabase = await createClient()

  for (const entry of data.entry || []) {
    for (const change of entry.changes) {
      if (change.field === 'comments') {
        await handleComment(supabase, change.value)
      }
    }
  }

  return NextResponse.json({ ok: true })
}

interface WebhookCommentValue {
  id: string
  media_id: string
  from?: { id: string; username: string }
  text: string
}

interface AccountRow {
  id: string
  access_token: string
  ig_username: string
  reply_comment_text: string
  public_reply_enabled: boolean
  follow_check_enabled: boolean
  private_reply_text: string
}

interface PostRow {
  id: string
  account_id: string
  accounts: AccountRow
}

async function handleComment(supabase: SupabaseClient, value: WebhookCommentValue) {
  const { id: commentId, media_id: mediaId, from, text: commentText } = value
  const igUserId = from?.id || ''
  const username = from?.username || ''

  if (!commentId || !mediaId) return

  // Dedup check
  if (processedComments.has(commentId)) return
  processedComments.add(commentId)
  setTimeout(() => processedComments.delete(commentId), DEDUP_TTL_MS)

  // Find account by media_id
  const { data: post } = await supabase
    .from('posts')
    .select('id, account_id, accounts!inner(id, access_token, ig_username, reply_comment_text, public_reply_enabled, follow_check_enabled, private_reply_text)')
    .eq('media_id', mediaId)
    .eq('is_active', true)
    .single()

  if (!post) {
    console.log(`[webhook] No active account found for media ${mediaId}`)
    return
  }

  const typedPost = post as unknown as PostRow
  const account = typedPost.accounts

  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('comment_id', commentId)
    .single()

  if (existing) return // Already processed

  // Record conversation
  await supabase.from('conversations').insert({
    account_id: account.id,
    post_id: typedPost.id,
    comment_id: commentId,
    user_igsid: igUserId,
    username,
    comment_text: commentText,
    media_id: mediaId,
    status: 'received',
  })

  // Step 1: Public reply to comment
  if (account.public_reply_enabled && account.reply_comment_text) {
    await igApi(`${mediaId}/comments`, {
      access_token: account.access_token,
      message: `@${username} ${account.reply_comment_text}`,
    }, 'POST')

    await supabase.from('conversations')
      .update({ status: 'replied', replied_at: new Date().toISOString() })
      .eq('comment_id', commentId)
  }

  // Step 2: Private Reply with follow check button
  if (account.follow_check_enabled) {
    await igApi('me/message_threads', {
      access_token: account.access_token,
      recipient: igUserId,
      message: account.private_reply_text,
    }, 'POST')

    await supabase.from('conversations')
      .update({ status: 'confirmed' })
      .eq('comment_id', commentId)
  }

  console.log(`[webhook] Processed comment ${commentId} from @${username}`)
}
