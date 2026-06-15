import { NextRequest, NextResponse } from 'next/server'

function getEnv(key: string): string {
  const val = process.env[key]
  if (!val) throw new Error(`Missing env: ${key}`)
  return val
}

// GET /api/auth/instagram — redirect to Instagram Business Login (same flow as Inpock)
export async function GET(request: NextRequest) {
  const CLIENT_ID = getEnv('INSTAGRAM_CLIENT_ID')
  const APP_URL = getEnv('NEXT_PUBLIC_APP_URL')
  const REDIRECT_URI = `${APP_URL}/api/auth/instagram/callback`

  const SCOPES = [
    'instagram_business_basic',
    'instagram_business_manage_messages',
    'instagram_business_manage_comments',
    'instagram_business_content_publish',
    'instagram_business_manage_insights',
  ].join(',')

  const state = crypto.randomUUID()
  const loggerId = crypto.randomUUID()

  // Instagram Business Login — same flow Inpock uses
  // Step 1: Instagram login page → Step 2: OAuth authorize with enable_fb_login
  const authorizeParams = new URLSearchParams({
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES,
    enable_fb_login: '1',
    client_id: CLIENT_ID,
    logger_id: loggerId,
    state: state,
  })

  const nextPath = `/oauth/authorize/third_party/?${authorizeParams.toString()}`

  const loginUrl = new URL('https://www.instagram.com/accounts/login/')
  loginUrl.searchParams.set('force_authentication', '')
  loginUrl.searchParams.set('platform_app_id', CLIENT_ID)
  loginUrl.searchParams.set('next', nextPath)
  loginUrl.searchParams.set('enable_fb_login', '')

  const response = NextResponse.redirect(loginUrl.toString())
  response.cookies.set('ig_oauth_state', state, {
    path: '/',
    maxAge: 600,
    httpOnly: true,
    secure: true,
  })

  return response
}
