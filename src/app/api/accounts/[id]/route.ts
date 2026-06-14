import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/server'

type RouteContext = { params: Promise<{ id: string }> }

// GET /api/accounts/[id] — get single account
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const supabase = await getServiceClient()

    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Account not found.' }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error('[accounts GET id]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/accounts/[id] — update account settings
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const supabase = await getServiceClient()

    // Only allow specific fields to be updated
    const updates: Record<string, unknown> = {}
    const allowedFields = [
      'ig_username',
      'access_token',
      'reply_comment_text',
      'public_reply_enabled',
      'follow_check_enabled',
      'private_reply_text',
      'is_active',
    ] as const

    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update.' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('accounts')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error('[accounts PATCH id]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/accounts/[id] — soft-delete (deactivate) account
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const supabase = await getServiceClient()

    // Soft delete: set is_active = false
    const { data, error } = await supabase
      .from('accounts')
      .update({ is_active: false })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error('[accounts DELETE id]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
