import { NextRequest, NextResponse } from 'next/server'
import { getServerUserId } from '@/lib/auth-user'
import { encryptToken } from '@/lib/crypto'
import { getServiceClient } from '@/lib/supabase/server'
import { canAddAccount } from '@/lib/plan-guard'

// GET /api/accounts — list the authenticated user's accounts (scoped to them)
export async function GET(request: NextRequest) {
  try {
    const userId = await getServerUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const supabase = await getServiceClient()

    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error('[accounts GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/accounts — create a new Instagram account
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      ig_username,
      ig_id,
      access_token,
      reply_comment_text,
      public_reply_enabled = true,
      follow_check_enabled = true,
      private_reply_text,
    } = body as {
      ig_username?: string
      ig_id?: string
      access_token?: string
      reply_comment_text?: string
      public_reply_enabled?: boolean
      follow_check_enabled?: boolean
      private_reply_text?: string
    }

    // Validate required fields
    if (!ig_username || !ig_id || !access_token) {
      return NextResponse.json(
        { error: 'ig_username, ig_id, and access_token fields are required.' },
        { status: 400 }
      )
    }

    const userId = await getServerUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const supabase = await getServiceClient()

    // Enforce plan account limit before creating a new account.
    const { allowed } = await canAddAccount(supabase, userId)
    if (!allowed) {
      return NextResponse.json(
        { error: '계정 연결 한도에 도달했습니다. 요금제를 업그레이드해주세요.' },
        { status: 403 }
      )
    }

    const { data, error } = await supabase
      .from('accounts')
      .insert({
        user_id: userId,
        ig_username,
        ig_id,
        access_token: encryptToken(access_token),
        reply_comment_text: reply_comment_text || null,
        public_reply_enabled,
        follow_check_enabled,
        private_reply_text: private_reply_text || null,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('[accounts POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
