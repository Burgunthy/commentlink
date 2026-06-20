import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }

    console.error("[API Auth Callback] error:", error.message);
    const detail = encodeURIComponent((error.message || "unknown").slice(0, 200));
    return NextResponse.redirect(`${origin}/auth/login?error=api_auth_failed&detail=${detail}`);
  }

  return NextResponse.redirect(`${origin}/auth/login?error=no_code`);
}
