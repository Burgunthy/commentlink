import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { expiryFromTtl } from "@/lib/instagram"

function getEnv(key: string): string {
  const val = process.env[key]
  if (!val) throw new Error(`Missing env: ${key}`)
  return val
}

function fail(step: string, detail: string, requestUrl: string) {
  const enc = encodeURIComponent(`[STEP ${step}] ${detail}`.slice(0, 300))
  return NextResponse.redirect(new URL(`/dashboard/accounts?error=unknown&detail=${enc}`, requestUrl))
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
      console.error("[ig callback] CSRF check failed:", {
        hasState: !!state,
        hasSavedState: !!savedState,
        match: state === savedState,
      })
      const detail = encodeURIComponent(
        `state=${state ?? "null"}, saved=${savedState ?? "null"}, match=${state === savedState}`
      )
      return NextResponse.redirect(new URL(`/dashboard/accounts?error=invalid_state&detail=${detail}`, request.url))
    }

    if (errorParam) {
      console.error("[ig callback] OAuth error:", errorParam, errorReason, errorDescription)
      const detail = encodeURIComponent(`${errorReason}: ${errorDescription || "unknown"}`)
      return NextResponse.redirect(new URL(`/dashboard/accounts?error=oauth_denied&detail=${detail}`, request.url))
    }

    if (!code) {
      console.error("[ig callback] No code in callback")
      return NextResponse.redirect(new URL("/dashboard/accounts?error=no_code", request.url))
    }

    // --- Step 1: Exchange code for short-lived access token ---
    try {
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
        return NextResponse.redirect(new URL(`/dashboard/accounts?error=token_failed&detail=${detail}`, request.url))
      }

      const shortToken = tokenResult.access_token
      const igUserId = tokenResult.user_id

      if (!igUserId) {
        return NextResponse.redirect(new URL(`/dashboard/accounts?error=token_failed&detail=no_user_id`, request.url))
      }

      // --- Step 2: Exchange for long-lived token ---
      try {
        const longResp = await fetch(
          `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${APP_SECRET}&access_token=${shortToken}`
        )
        const longData = await longResp.json()

        if (!longResp.ok || !longData.access_token) {
          console.error("[ig callback] Long-lived token exchange failed:", JSON.stringify(longData))
          const detail = encodeURIComponent(longData.error?.message || JSON.stringify(longData))
          return NextResponse.redirect(new URL(`/dashboard/accounts?error=token_upgrade_failed&detail=${detail}`, request.url))
        }

        const longToken = longData.access_token
        const tokenExpiresAt = expiryFromTtl(longData.expires_in)

        // --- Step 3: Get Instagram user details ---
        try {
          const igDetailResp = await fetch(
            `https://graph.instagram.com/me?fields=id,username,name,profile_picture_url,account_type&access_token=${longToken}`
          )
          const igDetail = await igDetailResp.json()

          if (igDetail.error) {
            console.error("[ig callback] IG detail failed:", JSON.stringify(igDetail.error))
            const detail = encodeURIComponent(JSON.stringify(igDetail.error))
            return NextResponse.redirect(new URL(`/dashboard/accounts?error=no_ig_account&detail=${detail}`, request.url))
          }

          console.log("[ig callback] IG detail:", igDetail.username, igDetail.id, igDetail.account_type)

          // --- Step 4: Get current user session ---
          try {
            const supabase = await createClient()
            const {
              data: { session },
            } = await supabase.auth.getSession()

            if (!session?.user) {
              console.error("[ig callback] No Supabase session — user not logged in")
              return NextResponse.redirect(new URL("/auth/login", request.url))
            }

            // --- Step 5: Save to database ---
            try {
              const { error: dbError } = await supabase.from("accounts").upsert(
                {
                  user_id: session.user.id,
                  ig_id: String(igUserId),
                  ig_username: igDetail.username || "",
                  access_token: longToken,
                  ...(tokenExpiresAt ? { token_expires_at: tokenExpiresAt } : {}),
                },
                { onConflict: "ig_id" }
              )

              if (dbError) {
                console.error("[ig callback] DB upsert error:", dbError.message, dbError.details)
                const detail = encodeURIComponent(
                  `${dbError.message} | details: ${dbError.details || "none"} | code: ${dbError.code || "none"}`
                )
                return NextResponse.redirect(new URL(`/dashboard/accounts?error=db_error&detail=${detail}`, request.url))
              }

              console.log("[ig callback] Account saved successfully:", igDetail.username, "for user:", session.user.id)
              return NextResponse.redirect(new URL("/dashboard/accounts?success=connected", request.url))
            } catch (err) {
              console.error("[ig callback] Step 5 (DB upsert) error:", err)
              return fail("5-DB", err instanceof Error ? err.message : String(err), request.url)
            }
          } catch (err) {
            console.error("[ig callback] Step 4 (Supabase session) error:", err)
            return fail("4-SESSION", err instanceof Error ? err.message : String(err), request.url)
          }
        } catch (err) {
          console.error("[ig callback] Step 3 (IG detail) error:", err)
          return fail("3-IG_DETAIL", err instanceof Error ? err.message : String(err), request.url)
        }
      } catch (err) {
        console.error("[ig callback] Step 2 (Long-lived token) error:", err)
        return fail("2-LONG_TOKEN", err instanceof Error ? err.message : String(err), request.url)
      }
    } catch (err) {
      console.error("[ig callback] Step 1 (Token exchange) error:", err)
      return fail("1-TOKEN_EXCHANGE", err instanceof Error ? err.message : String(err), request.url)
    }
  } catch (err) {
    // Catches errors from getEnv, cookie access, or any code before the steps
    console.error("[ig callback] OUTER error:", err)
    return fail("0-OUTER", err instanceof Error ? err.message : String(err), request.url)
  }
}
