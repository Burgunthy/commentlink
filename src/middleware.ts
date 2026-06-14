import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// TODO: Enable Supabase auth once keys are configured
// import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  // Pass through — auth guard enabled after Supabase keys are set
  return NextResponse.next({ request })
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
