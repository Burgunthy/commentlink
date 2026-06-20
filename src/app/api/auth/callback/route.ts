import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    // Collect cookies that Supabase wants to set
    const cookieJar: { name: string; value: string; options?: Record<string, unknown> }[] = [];

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return []; },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieJar.push({ name, value, options });
            });
          },
        },
      }
    );

    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error) {
        const response = NextResponse.redirect(`${origin}${next}`);
        // Apply all session cookies to the response
        cookieJar.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, {
            path: "/",
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            ...options,
          });
        });
        console.log("[Auth Callback] Success, cookies set:", cookieJar.map(c => c.name));
        return response;
      }

      console.error("[Auth Callback] exchangeCodeForSession error:", error.message);
      const detail = encodeURIComponent((error.message || "unknown").slice(0, 200));
      return NextResponse.redirect(`${origin}/auth/login?error=auth_failed&detail=${detail}`);
    } catch (err) {
      console.error("[Auth Callback] Exception:", err);
      const detail = encodeURIComponent((err instanceof Error ? err.message : String(err)).slice(0, 200));
      return NextResponse.redirect(`${origin}/auth/login?error=auth_exception&detail=${detail}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=no_code`);
}
