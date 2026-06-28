import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const protectedPaths = ['/dashboard']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public routes need no session check — return before allocating a Supabase
  // client or parsing cookies, so '/' and '/api/*' stay off the auth path.
  if (pathname.startsWith('/auth') || pathname === '/' || pathname.startsWith('/api')) {
    return NextResponse.next({ request })
  }

  const response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)        // forward to downstream handlers
            response.cookies.set(name, value, options) // persist for the browser
          })
        },
      },
    },
  )

  // getSession() reads the session from the cookie store. NOTE: it is NOT purely
  // local — when the access token is within its expiry margin it performs a
  // GoTrue POST to refresh it, so this can incur a network round-trip.
  const { data: { session } } = await supabase.auth.getSession()

  // Protect dashboard routes. On redirect we carry over any cookies getSession()
  // refreshed onto `response` (e.g. a rotated token), otherwise the browser
  // would keep the stale token and the refresh would be lost.
  if (protectedPaths.some(p => pathname.startsWith(p)) && !session) {
    const redirectUrl = new URL('/auth/login', request.url)
    redirectUrl.searchParams.set('redirectTo', pathname)
    const redirectResponse = NextResponse.redirect(redirectUrl)
    for (const cookie of response.cookies.getAll()) {
      redirectResponse.cookies.set(cookie)
    }
    return redirectResponse
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
