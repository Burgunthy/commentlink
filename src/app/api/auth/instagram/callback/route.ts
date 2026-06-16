import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

function getEnv(key: string): string {
  const val = process.env[key]
  if (!val) throw new Error(`Missing env: ${key}`)
  return val
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const errorParam = searchParams.get("error")

  const CLIENT_ID = getEnv("INSTAGRAM_CLIENT_ID")
  const APP_SECRET=getEnv("INSTAGRAM_APP_SECRET")
  const APP_URL = getEnv("NEXT_PUBLIC_APP_URL")
  const REDIRECT_URI = `${APP_URL}/api/auth/instagram/callback`

  // Check CSRF state
  const savedState = request.cookies.get("ig_oauth_state")?.value
  if (!state || !savedState || state !== savedState) {
    return NextResponse.redirect(new URL("/dashboard/accounts?error=invalid_state", request.url))
  }

  if (errorParam) {
    return NextResponse.redirect(new URL("/dashboard/accounts?error=oauth_denied", request.url))
  }

  if (!code) {
    return NextResponse.redirect(new URL("/dashboard/accounts?error=no_code", request.url))
  }

  try {
    // 1. Exchange code for short-lived access token
    // Official endpoint: https://developers.facebook.com/docs/instagram-platform/instagram-api/get-started
    const tokenResp = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: APP_SECRET,
        grant_type: "authorization_code",
        redirect_uri: REDIRECT_URI,
        code,
      }),
    })
    const tokenData = await tokenResp.json()

    // Handle both response formats:
    // Old format: { access_token, user_id }
    // New format: { data: [{ access_token, user_id, permissions }] }
    const tokenResult = Array.isArray(tokenData.data) ? tokenData.data[0] : tokenData

    if (!tokenResp.ok || !tokenResult?.access_token) {
      console.error("[ig callback] Token exchange failed:", tokenData.error?.message || tokenData.error_type || "unknown")
      return NextResponse.redirect(new URL("/dashboard/accounts?error=token_failed", request.url))
    }

    const shortToken = tokenResult.access_token
    const igUserId = tokenResult.user_id

    if (!igUserId) {
      return NextResponse.redirect(new URL("/dashboard/accounts?error=token_failed", request.url))
    }

    // 2. Exchange for long-lived token (60 days)
    // Instagram Login uses graph.instagram.com (NOT graph.facebook.com)
    // grant_type=ig_exchange_token (NOT fb_exchange_token)
    const longResp = await fetch(
      `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${APP_SECRET}&access_token=${shortToken}`
    )
    const longData = await longResp.json()

    if (!longResp.ok || !longData.access_token) {
      console.error("[ig callback] Long-lived token exchange failed:", longData.error?.message || "unknown")
      return NextResponse.redirect(new URL("/dashboard/accounts?error=token_upgrade_failed", request.url))
    }

    const longToken = longData.access_token

    // 3. Get Instagram user details
    const igDetailResp = await fetch(
      `https://graph.instagram.com/me?fields=id,username,name,profile_picture_url,account_type&access_token=${longToken}`
    )
    const igDetail = await igDetailResp.json()

    if (igDetail.error) {
      console.error("[ig callback] IG detail failed:", igDetail.error)
      return NextResponse.redirect(new URL("/dashboard/accounts?error=no_ig_account", request.url))
    }

    // 4. Get current user session
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.redirect(new URL("/auth/login", request.url))
    }

    // 5. Save to database
    const { error: dbError } = await supabase.from("accounts").upsert({
      user_id: session.user.id,
      ig_id: String(igUserId),
      ig_username: igDetail.username || "",
      access_token: longToken,
    }, { onConflict: "ig_id" })

    if (dbError) {
      console.error("[ig callback] DB error:", dbError.message)
      return NextResponse.redirect(new URL("/dashboard/accounts?error=db_error", request.url))
    }

    return NextResponse.redirect(new URL("/dashboard/accounts?success=connected", request.url))
  } catch (err) {
    console.error("[ig callback] Unexpected error:", err)
    return NextResponse.redirect(new URL("/dashboard/accounts?error=unknown", request.url))
  }
}
