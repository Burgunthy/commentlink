import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function getEnv(key: string): string {
  const val = process.env[key]
  if (!val) throw new Error(`Missing env: ${key}`)
  return val
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const errorParam = searchParams.get('error')

  const APP_ID = getEnv('META_APP_ID')
  const APP_SECRET = getEnv('META_APP_SECRET')
  const APP_URL = getEnv('NEXT_PUBLIC_APP_URL')
  const REDIRECT_URI = `${APP_URL}/api/auth/instagram/callback`

  // Check CSRF state
  const savedState = request.cookies.get('ig_oauth_state')?.value
  if (!state || state !== savedState) {
    return NextResponse.redirect(new URL('/dashboard/accounts?error=invalid_state', request.url))
  }

  if (errorParam) {
    console.error('[ig callback] OAuth error:', errorParam)
    return NextResponse.redirect(new URL('/dashboard/accounts?error=oauth_denied', request.url))
  }

  if (!code) {
    return NextResponse.redirect(new URL('/dashboard/accounts?error=no_code', request.url))
  }

  try {
    // 1. Exchange code for access token
    const tokenResp = await fetch(
      `https://graph.facebook.com/v25.0/oauth/access_token?client_id=${APP_ID}&client_secret=${APP_SECRET}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&code=${code}`
    )
    const tokenData = await tokenResp.json()

    if (!tokenResp.ok || !tokenData.access_token) {
      console.error('[ig callback] Token exchange failed:', tokenData)
      return NextResponse.redirect(new URL('/dashboard/accounts?error=token_failed', request.url))
    }

    const shortToken = tokenData.access_token

    // 2. Exchange for long-lived token (60 days)
    const longResp = await fetch(
      `https://graph.facebook.com/v25.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${APP_ID}&client_secret=${APP_SECRET}&fb_exchange_token=${shortToken}`
    )
    const longData = await longResp.json()
    const longToken = longData.access_token || shortToken

    // 3. Get Instagram Business Account
    const igResp = await fetch(
      `https://graph.facebook.com/v25.0/me/accounts?fields=instagram_business_account{id,username,name,profile_picture_url}&access_token=${longToken}`
    )
    const igData = await igResp.json()

    if (!igData.data?.length || !igData.data[0].instagram_business_account) {
      console.error('[ig callback] No IG business account:', JSON.stringify(igData))
      return NextResponse.redirect(new URL('/dashboard/accounts?error=no_ig_account', request.url))
    }

    const igAccount = igData.data[0].instagram_business_account

    // 4. Get Instagram user details
    const igDetailResp = await fetch(
      `https://graph.facebook.com/v25.0/${igAccount.id}?fields=id,username,name,profile_picture_url,followers_count,media_count&access_token=${longToken}`
    )
    const igDetail = await igDetailResp.json()

    // 5. Get current user session
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }

    // 6. Save to database
    const { error: dbError } = await supabase.from('accounts').upsert({
      user_id: session.user.id,
      ig_id: String(igAccount.id),
      ig_username: igDetail.username || igAccount.username || '',
      access_token: longToken,
    }, { onConflict: 'ig_id' })

    if (dbError) {
      console.error('[ig callback] DB error:', dbError)
      return NextResponse.redirect(new URL('/dashboard/accounts?error=db_error', request.url))
    }

    return NextResponse.redirect(new URL('/dashboard/accounts?success=connected', request.url))
  } catch (err) {
    console.error('[ig callback] Unexpected error:', err)
    return NextResponse.redirect(new URL('/dashboard/accounts?error=unknown', request.url))
  }
}
