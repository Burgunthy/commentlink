import { NextRequest, NextResponse } from 'next/server'

function getEnv(key: string): string {
  const val = process.env[key]
  if (!val) throw new Error(`Missing env: ${key}`)
  return val
}

// GET /api/auth/instagram — redirect to Instagram OAuth authorize directly
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

  // Direct redirect to Instagram OAuth authorize (no intermediate login step)
  const authorizeUrl = new URL('https://api.instagram.com/oauth/authorize')
  authorizeUrl.searchParams.set('client_id', CLIENT_ID)
  authorizeUrl.searchParams.set('redirect_uri', REDIRECT_URI)
  authorizeUrl.searchParams.set('response_type', 'code')
  authorizeUrl.searchParams.set('scope', SCOPES)
  authorizeUrl.searchParams.set('state', state)

  const response = NextResponse.redirect(authorizeUrl.toString())
  response.cookies.set('ig_oauth_state', state, {
    path: '/',
    maxAge: 600,
    httpOnly: true,
    secure: true,
  })

  return response
}
