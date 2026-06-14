import { NextRequest, NextResponse } from 'next/server'

function getEnv(key: string): string {
  const val = process.env[key]
  if (!val) throw new Error(`Missing env: ${key}`)
  return val
}

// GET /api/auth/instagram — redirect to Instagram Business Login
export async function GET(request: NextRequest) {
  const CLIENT_ID = getEnv('INSTAGRAM_CLIENT_ID')
  const APP_URL = getEnv('NEXT_PUBLIC_APP_URL')
  const REDIRECT_URI = `${APP_URL}/api/auth/instagram/callback`

  // Facebook Login OAuth — required for Instagram Business API
  // Instagram Business accounts MUST be connected via Facebook Login + Facebook Page
  const SCOPES = [
    'instagram_business_basic',
    'instagram_business_manage_messages',
    'instagram_business_manage_comments',
    'instagram_business_content_publish',
    'instagram_business_manage_insights',
    'pages_show_list',
    'pages_read_engagement',
  ].join(',')

  const state = crypto.randomUUID()

  const oauthUrl = new URL('https://www.facebook.com/v25.0/dialog/oauth')
  oauthUrl.searchParams.set('client_id', CLIENT_ID)
  oauthUrl.searchParams.set('redirect_uri', REDIRECT_URI)
  oauthUrl.searchParams.set('response_type', 'code')
  oauthUrl.searchParams.set('scope', SCOPES)
  oauthUrl.searchParams.set('state', state)
  // config_id for Instagram Business Login via Facebook
  oauthUrl.searchParams.set('config_id', process.env.FB_LOGIN_CONFIG_ID || '')

  const response = NextResponse.redirect(oauthUrl.toString())
  response.cookies.set('ig_oauth_state', state, {
    path: '/',
    maxAge: 600,
    httpOnly: true,
    secure: true,
  })

  return response
}
