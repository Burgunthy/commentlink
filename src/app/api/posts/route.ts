import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/server'

// GET /api/posts — list posts with account info
export async function GET(request: NextRequest) {
  try {
    const supabase = await getServiceClient()

    // Optional filters via query params
    const { searchParams } = request.nextUrl
    const accountId = searchParams.get('account_id')
    const isActive = searchParams.get('is_active')

    let query = supabase
      .from('posts')
      .select(`
        *,
        accounts (
          id,
          ig_username,
          is_active
        ),
        products (
          id,
          product_name,
          affiliate_url,
          sort_order
        )
      `)
      .order('created_at', { ascending: false })

    if (accountId) {
      query = query.eq('account_id', accountId)
    }
    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true')
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error('[posts GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/posts — register a new post for monitoring
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      account_id,
      media_id,
      media_type,
      caption,
      media_url,
      dm_message,
      dm_link_url,
      public_reply_text,
      not_following_dm,
      not_following_link,
    } = body as {
      account_id?: string
      media_id?: string
      media_type?: string
      caption?: string | null
      media_url?: string | null
      dm_message?: string | null
      dm_link_url?: string | null
      public_reply_text?: string | null
      not_following_dm?: string | null
      not_following_link?: string | null
    }

    if (!account_id || !media_id) {
      return NextResponse.json(
        { error: 'account_id and media_id are required.' },
        { status: 400 }
      )
    }

    const supabase = await getServiceClient()

    const upsertData: Record<string, unknown> = {
      account_id,
      media_id,
      media_type: media_type || null,
      caption: caption || null,
      media_url: media_url || null,
      is_active: true,
    }

    // Only include post-level settings if explicitly provided
    if (dm_message !== undefined) upsertData.dm_message = dm_message || null
    if (dm_link_url !== undefined) upsertData.dm_link_url = dm_link_url || null
    if (public_reply_text !== undefined) upsertData.public_reply_text = public_reply_text || null
    if (not_following_dm !== undefined) upsertData.not_following_dm = not_following_dm || null
    if (not_following_link !== undefined) upsertData.not_following_link = not_following_link || null

    // Upsert: insert new post or update if already exists
    const { data, error } = await supabase
      .from('posts')
      .upsert(upsertData, { onConflict: 'account_id,media_id' })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('[posts POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/posts — toggle is_active or update post-level settings
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      id,
      is_active,
      dm_message,
      dm_link_url,
      public_reply_text,
      not_following_dm,
      not_following_link,
    } = body as {
      id?: string
      is_active?: boolean
      dm_message?: string | null
      dm_link_url?: string | null
      public_reply_text?: string | null
      not_following_dm?: string | null
      not_following_link?: string | null
    }

    if (!id) {
      return NextResponse.json(
        { error: 'id is required.' },
        { status: 400 }
      )
    }

    const supabase = await getServiceClient()

    const updateData: Record<string, unknown> = {}
    if (is_active !== undefined) updateData.is_active = is_active
    if (dm_message !== undefined) updateData.dm_message = dm_message || null
    if (dm_link_url !== undefined) updateData.dm_link_url = dm_link_url || null
    if (public_reply_text !== undefined) updateData.public_reply_text = public_reply_text || null
    if (not_following_dm !== undefined) updateData.not_following_dm = not_following_dm || null
    if (not_following_link !== undefined) updateData.not_following_link = not_following_link || null

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update.' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('posts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error('[posts PATCH]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/posts — remove a post
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { id } = body as { id?: string }

    if (!id) {
      return NextResponse.json({ error: 'id is required.' }, { status: 400 })
    }

    const supabase = await getServiceClient()

    const { error } = await supabase.from('posts').delete().eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[posts DELETE]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
