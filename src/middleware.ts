import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const protectedPaths = ['/dashboard']

/**
 * Check if the user has a valid Supabase session by reading the JWT
 * directly from the httpOnly cookie. This avoids creating a Supabase client
 * that would trigger GoTrue GET requests (which cause
 * "Unsupported request - method type: get" errors on Vercel).
 */
function hasValidSession(request: NextRequest): boolean {
  try {
    const cookieName = request.cookies.getAll().find(
      (c) => c.name.includes('-auth-token')
    )?.name
    if (!cookieName) return false

    const cookieValue = request.cookies.get(cookieName)?.value
    if (!cookieValue) return false

    const parsed = JSON.parse(decodeURIComponent(cookieValue))
    const accessToken: string | undefined = parsed.access_token
    if (!accessToken) return false

    const parts = accessToken.split('.')
    if (parts.length !== 3) return false

    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    // Check that the token has an expiry and it hasn't expired
    const exp = payload.exp
    if (!exp) return false
    return Date.now() < exp * 1000
  } catch {
    return false
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow auth routes and public routes
  if (pathname.startsWith('/auth') || pathname === '/' || pathname.startsWith('/api')) {
    return NextResponse.next({ request })
  }

  // Protect dashboard routes
  if (protectedPaths.some(p => pathname.startsWith(p))) {
    if (!hasValidSession(request)) {
      const redirectUrl = new URL('/auth/login', request.url)
      redirectUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(redirectUrl)
    }
  }

  return NextResponse.next({ request })
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
