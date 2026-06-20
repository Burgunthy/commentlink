import { NextRequest, NextResponse } from "next/server"
import { expiryFromTtl } from "@/lib/instagram"
import { getUserIdFromCookie } from "@/lib/getUserIdFromCookie"

function getEnv(key: string): string {
  const val = process.env[key]
  if (!val) throw new Error(`Missing env: ${key}`)
  return val
}

/**
 * Upsert an Instagram account into Supabase via direct REST API call.
 * Bypasses @supabase/supabase-js and @supabase/ssr entirely.
 */
async function upsertAccountViaRestApi(
  supabaseUrl: string,
  serviceRoleKey: string,
  data: {
    user_id: string
    ig_id: string
    ig_username: string
    access_token: string
    token_expires_at?: string
  }
): Promise<{ error?: string }> {
  const url = `${supabaseUrl}/rest/v1/accounts`
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const body = await res.text()
    console.error("[ig callback] REST API upsert failed:", res.status, body)
    return { error: `DB error ${res.status}: ${body.slice(0, 200)}` }
  }

  return {}
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const errorParam = searchParams.get("error")
    const errorReason = searchParams.get("error_reason")
    const errorDescription = searchParams.get("error_description")

    const CLIENT_ID = getEnv("INSTAGRAM_CLIENT_ID")
    const APP_SECRET = getEnv("INSTAGRAM_APP_SECRET")
    const APP_URL = getEnv("NEXT_PUBLIC_APP_URL")
    const REDIRECT_URI = `${APP_URL}/api/auth/instagram/callback`

    // Check CSRF state
    const savedState = request.cookies.get("ig_oauth_state")?.value
    if (!state || !savedState || state !== savedState) {
      console.error("[ig callback] CSRF check failed")
      const detail = encodeURIComponent(
        `state=${state ?? "null"}, saved=${savedState ?? "null"}`
      )
      return NextResponse.redirect(
        new URL(`/dashboard/accounts?error=invalid_state&detail=${detail}`, request.url)
      )
    }

    if (errorParam) {
      console.error("[ig callback] OAuth error:", errorParam, errorReason)
      const detail = encodeURIComponent(`${errorReason}: ${errorDescription || "unknown"}`)
      return NextResponse.redirect(
        new URL(`/dashboard/accounts?error=oauth_denied&detail=${detail}`, request.url)
      )
    }

    if (!code) {
      return NextResponse.redirect(new URL("/dashboard/accounts?error=no_code", request.url))
    }

    // --- Step 1: Exchange code for short-lived access token ---
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
    const tokenResult = Array.isArray(tokenData.data) ? tokenData.data[0] : tokenData

    if (!tokenResp.ok || !tokenResult?.access_token) {
      console.error("[ig callback] Token exchange failed:", JSON.stringify(tokenData))
      const detail = encodeURIComponent(
        tokenData.error?.message || tokenData.error_type || JSON.stringify(tokenData)
      )
      return NextResponse.redirect(
        new URL(`/dashboard/accounts?error=token_failed&detail=${detail}`, request.url)
      )
    }

    const shortToken = tokenResult.access_token
    const igUserId = tokenResult.user_id

    if (!igUserId) {
      return NextResponse.redirect(
        new URL(`/dashboard/accounts?error=token_failed&detail=no_user_id`, request.url)
      )
    }

    // --- Step 2: Exchange for long-lived token ---
    const longResp = await fetch(
      `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${APP_SECRET}&access_token=${shortToken}`
    )
    const longData = await longResp.json()

    if (!longResp.ok || !longData.access_token) {
      console.error("[ig callback] Long-lived token failed:", JSON.stringify(longData))
      const detail = encodeURIComponent(longData.error?.message || JSON.stringify(longData))
      return NextResponse.redirect(
        new URL(`/dashboard/accounts?error=token_upgrade_failed&detail=${detail}`, request.url)
      )
    }

    const longToken = longData.access_token
    const tokenExpiresAt = expiryFromTtl(longData.expires_in)

    // --- Step 3: Get Instagram user details ---
    const igDetailResp = await fetch(
      `https://graph.instagram.com/me?fields=id,username,name,profile_picture_url,account_type&access_token=${longToken}`
    )
    const igDetail = await igDetailResp.json()

    if (igDetail.error) {
      console.error("[ig callback] IG detail failed:", JSON.stringify(igDetail.error))
      const detail = encodeURIComponent(JSON.stringify(igDetail.error))
      return NextResponse.redirect(
        new URL(`/dashboard/accounts?error=no_ig_account&detail=${detail}`, request.url)
      )
    }

    console.log("[ig callback] IG detail:", igDetail.username, igDetail.id, igDetail.account_type)

    // --- Step 4: Get user ID from JWT cookie (shared util, handles base64url) ---
    const userId = getUserIdFromCookie(request)
    if (!userId) {
      console.error("[ig callback] No user ID in Supabase auth cookie")
      return NextResponse.redirect(new URL("/auth/login", request.url))
    }

    // --- Step 5: Save to database via direct REST API ---
    const SUPABASE_URL = getEnv("NEXT_PUBLIC_SUPABASE_URL")
    const SERVICE_ROLE_KEY = getEnv("SUPABASE_SERVICE_ROLE_KEY")

    const dbResult = await upsertAccountViaRestApi(SUPABASE_URL, SERVICE_ROLE_KEY, {
      user_id: userId,
      ig_id: String(igUserId),
      ig_username: igDetail.username || "",
      access_token: longToken,
      ...(tokenExpiresAt ? { token_expires_at: tokenExpiresAt } : {}),
    })

    if (dbResult.error) {
      const detail = encodeURIComponent(dbResult.error)
      return NextResponse.redirect(
        new URL(`/dashboard/accounts?error=db_error&detail=${detail}`, request.url)
      )
    }

    console.log("[ig callback] Account saved:", igDetail.username, "for user:", userId)
    return NextResponse.redirect(new URL("/dashboard/accounts?success=connected", request.url))
  } catch (err) {
    console.error("[ig callback] Unexpected error:", err)
    const message = err instanceof Error ? err.message : String(err)
    const detail = encodeURIComponent(message.slice(0, 300))
    return NextResponse.redirect(
      new URL(`/dashboard/accounts?error=unknown&detail=${detail}`, request.url)
    )
  }
}
