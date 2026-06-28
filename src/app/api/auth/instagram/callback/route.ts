import { NextRequest, NextResponse } from "next/server"
import { expiryFromTtl } from "@/lib/instagram"
import { getServerUserId } from "@/lib/auth-user"
import { upsertAccount } from "@/lib/accounts"
import { getServiceClient } from "@/lib/supabase/server"
import { canAddAccount } from "@/lib/plan-guard"

function getEnv(key: string): string {
  const val = process.env[key]
  if (!val) throw new Error(`Missing env: ${key}`)
  return val
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

    // --- Step 4: Get user id via the standard Supabase client ---
    const userId = await getServerUserId()
    if (!userId) {
      console.error("[ig callback] No user ID in Supabase auth cookie")
      return NextResponse.redirect(new URL("/auth/login", request.url))
    }

    // --- Step 4.5: Enforce plan account limit ---
    // A reconnect of an already-linked account is an update, not a new connection,
    // so only enforce the limit when this Instagram account is new to the user.
    const guardClient = await getServiceClient()
    const { data: existingAccount } = await guardClient
      .from("accounts")
      .select("id")
      .eq("user_id", userId)
      .eq("ig_id", String(igUserId))
      .maybeSingle()

    if (!existingAccount) {
      const { allowed, count, limit: accountLimit } = await canAddAccount(guardClient, userId)
      if (!allowed) {
        console.warn(
          `[ig callback] Account limit reached for user ${userId}: ${count}/${accountLimit}`
        )
        return NextResponse.redirect(
          new URL("/dashboard/accounts?error=account_limit", request.url)
        )
      }
    }

    // --- Step 5: Save the account via the service-role client ---
    const dbResult = await upsertAccount(guardClient, {
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
