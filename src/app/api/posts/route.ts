import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/server'

// GET /api/posts — list posts with account and product info
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
          name,
          link_url
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
