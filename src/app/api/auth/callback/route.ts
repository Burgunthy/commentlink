import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase auth callback handler (API route convention).
 * Exchanges the auth code for a session and sets cookies on the response.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

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
                // Route Handler — may be read-only; fallback below.
              }
            },
          },
        }
      );

      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error) {
        const response = NextResponse.redirect(`${origin}${next}`);
        
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

      console.error("[API Auth Callback] Error exchanging code:", error.message);
      const detail = encodeURIComponent((error.message || "unknown").slice(0, 200));
      return NextResponse.redirect(`${origin}/auth/login?error=api_auth_failed&detail=${detail}`);
    } catch (err) {
      console.error("[API Auth Callback] Exception:", err);
      const detail = encodeURIComponent((err instanceof Error ? err.message : String(err)).slice(0, 200));
      return NextResponse.redirect(`${origin}/auth/login?error=api_auth_exception&detail=${detail}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=no_code`);
}
