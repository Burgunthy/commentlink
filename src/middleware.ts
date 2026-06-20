import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const protectedPaths = ['/dashboard']

export async function middleware(request: NextRequest) {
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

  // Network-free: reads cookies only, handles base64url + chunking.
  // getSession() does NOT call GoTrue — only reads from cookie storage.
  const { data: { session } } = await supabase.auth.getSession()

  const { pathname } = request.nextUrl

  // Allow auth routes and public routes
  if (pathname.startsWith('/auth') || pathname === '/' || pathname.startsWith('/api')) {
    return response
  }

  // Protect dashboard routes
  if (protectedPaths.some(p => pathname.startsWith(p)) && !session) {
    const redirectUrl = new URL('/auth/login', request.url)
    redirectUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
