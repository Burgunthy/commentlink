import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/server'

// GET /api/accounts — list all accounts for the authenticated user
export async function GET() {
  try {
    const supabase = await getServiceClient()

    const { data, error } = await supabase
      .from('accounts')
      .select('*')
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
      ig_user_id,
      access_token,
      reply_comment_text,
      public_reply_enabled = true,
      follow_check_enabled = true,
      private_reply_text,
    } = body as {
      ig_username?: string
      ig_user_id?: string
      access_token?: string
      reply_comment_text?: string
      public_reply_enabled?: boolean
      follow_check_enabled?: boolean
      private_reply_text?: string
    }

    // Validate required fields
    if (!ig_username || !ig_user_id || !access_token) {
      return NextResponse.json(
        { error: 'ig_username, ig_user_id, access_token 필드가 필요합니다.' },
        { status: 400 }
      )
    }

    const supabase = await getServiceClient()

    const { data, error } = await supabase
      .from('accounts')
      .insert({
        ig_username,
        ig_user_id,
        access_token,
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
