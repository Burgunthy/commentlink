import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase auth callback handler.
 * GoTrue redirects here after Google OAuth completes.
 * Exchanges auth code for session and sets cookies on the response.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectTo = searchParams.get("next") ?? "/dashboard";

  if (code) {
    try {
      const cookieStore = await cookies();
      
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return cookieStore.getAll();
            },
            setAll(cookiesToSet) {
              try {
                cookiesToSet.forEach(({ name, value, options }) =>
                  cookieStore.set(name, value, options)
                );
              } catch {
                // Route Handler context — cookies().set() may be read-only.
                // Fallback: we manually set cookies on the response below.
              }
            },
          },
        }
      );

      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error) {
        // Build the response
        const response = NextResponse.redirect(`${origin}${redirectTo}`);
        
        // Ensure session cookies are set on the response
        // (in case cookies().set() silently failed in route handler context)
        const allCookies = cookieStore.getAll();
        const sessionCookie = allCookies.find((c) => c.name.includes("-auth-token"));
        if (sessionCookie) {
          response.cookies.set(sessionCookie.name, sessionCookie.value, {
            path: "/",
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
          });
        }
        
        return response;
      }

      console.error("Auth callback error:", error.message);
      const detail = encodeURIComponent((error.message || "unknown").slice(0, 200));
      return NextResponse.redirect(`${origin}/auth/login?error=auth_failed&detail=${detail}`);
    } catch (err) {
      console.error("Auth callback exception:", err);
      const detail = encodeURIComponent((err instanceof Error ? err.message : String(err)).slice(0, 200));
      return NextResponse.redirect(`${origin}/auth/login?error=auth_exception&detail=${detail}`);
    }
  }

  // No code parameter
  return NextResponse.redirect(`${origin}/auth/login?error=no_code`);
}
