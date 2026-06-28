import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/server'
import { ensureFreshToken } from '@/lib/instagram'

type RouteContext = { params: Promise<{ id: string }> }

// GET /api/accounts/[id]/media — fetch Instagram media from Graph API
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const supabase = await getServiceClient()

    // Get account with access_token
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('id, ig_username, access_token, token_expires_at')
      .eq('id', id)
      .single()

    if (accountError || !account) {
      return NextResponse.json({ error: 'Account not found.' }, { status: 404 })
    }

    if (!account.access_token) {
      return NextResponse.json({ error: 'No access token. Please reconnect.' }, { status: 400 })
    }

    // Decrypt (and refresh if near expiry) the stored token before the API call.
    const accessToken = await ensureFreshToken(supabase, {
      id: account.id,
      access_token: account.access_token,
      token_expires_at: account.token_expires_at,
    })

    // Fetch media from Instagram Graph API
    const mediaUrl = new URL('https://graph.instagram.com/v25.0/me/media')
    mediaUrl.searchParams.set('fields', 'id,caption,media_type,media_url,thumbnail_url,like_count,timestamp,permalink')
    mediaUrl.searchParams.set('limit', '25')
    mediaUrl.searchParams.set('access_token', accessToken)

    const response = await fetch(mediaUrl, {
      next: { revalidate: 300 }, // cache for 5 minutes
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('[media GET] Instagram API error:', errorData)
      return NextResponse.json(
        { error: 'Instagram API 호출에 실패했습니다.', details: errorData },
        { status: response.status }
      )
    }

    const mediaData = await response.json()
    return NextResponse.json({ data: mediaData.data || [], paging: mediaData.paging || null })
  } catch (err) {
    console.error('[accounts media GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
