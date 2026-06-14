import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Supabase auth callback handler (Next.js API route convention).
 * Supabase redirects here after OAuth flow completes.
 * Exchanges the auth code for a session and redirects to the app.
 */
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

    console.error("[API Auth Callback] Error exchanging code:", error.message);
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`);
}
