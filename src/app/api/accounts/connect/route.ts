import { NextRequest, NextResponse } from "next/server"
import { expiryFromTtl } from "@/lib/instagram"
import { getUserIdFromCookie } from "@/lib/getUserIdFromCookie"

/**
 * Upsert an Instagram account into Supabase via direct REST API call.
 * This completely bypasses @supabase/supabase-js and @supabase/ssr to avoid
 * any internal GoTrue/auth client initialization that could trigger unexpected
 * GET requests to GoTrue (which returns "Unsupported request - method type: get").
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
  const url = `${supabaseUrl}/rest/v1/accounts?on_conflict=ig_id`
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
    console.error("[connect] REST API upsert failed:", res.status, body)
    return { error: `DB error ${res.status}: ${body.slice(0, 200)}` }
  }

  return {}
}

export async function POST(request: NextRequest) {
  try {
    const { access_token } = await request.json()

    if (!access_token || typeof access_token !== "string") {
      return NextResponse.json({ error: "access_token is required" }, { status: 400 })
    }

    const token = access_token.trim()

    // Read Meta credentials from env
    const appId = process.env.META_APP_ID
    const appSecret = process.env.META_APP_SECRET
    if (!appId || !appSecret) {
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 })
    }

    // 1. Exchange for long-lived token if short-lived
    let longToken = token
    let expiresIn: number | null = null
    try {
      const exUrl = `https://graph.facebook.com/v25.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${token}`
      const exResp = await fetch(exUrl)
      const exData = await exResp.json()
      if (exData.access_token) {
        longToken = exData.access_token
        if (typeof exData.expires_in === "number") expiresIn = exData.expires_in
      }
    } catch { /* keep original token */ }

    // 2. Get Facebook Pages with Instagram Business accounts
    const pagesUrl = `https://graph.facebook.com/v25.0/me/accounts?fields=instagram_business_account{id,username,name,profile_picture_url}&access_token=${longToken}`
    const pagesResp = await fetch(pagesUrl)
    const pagesData = await pagesResp.json()

    if (!pagesResp.ok) {
      const msg = pagesData.error?.message || "unknown error"
      return NextResponse.json({ error: `Token validation failed: ${msg}` }, { status: 400 })
    }

    if (!pagesData.data?.length) {
      return NextResponse.json(
        { error: "No Facebook Pages linked. Please link a Facebook Page with an Instagram Business account." },
        { status: 400 }
      )
    }

    // 3. Find first page with IG Business account
    let igAccount = null
    for (const page of pagesData.data) {
      if (page.instagram_business_account) {
        igAccount = page.instagram_business_account
        break
      }
    }

    if (!igAccount) {
      return NextResponse.json(
        { error: "No Instagram Business account found on your Facebook Pages." },
        { status: 400 }
      )
    }

    // 4. Get Instagram user details
    const detailUrl = `https://graph.facebook.com/v25.0/${igAccount.id}?fields=id,username,name,profile_picture_url,followers_count,media_count&access_token=${longToken}`
    const igDetailResp = await fetch(detailUrl)
    const igDetail = await igDetailResp.json()

    // 5. Get current user ID from JWT cookie (no GoTrue/session call)
    const userId = getUserIdFromCookie(request)

    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // 6. Save to database via direct REST API (no Supabase client, no GoTrue)
    const tokenExpiresAt = expiryFromTtl(expiresIn)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 })
    }

    const dbResult = await upsertAccountViaRestApi(supabaseUrl, serviceRoleKey, {
      user_id: userId,
      ig_id: String(igAccount.id),
      ig_username: igDetail.username || igAccount.username || "",
      access_token: longToken,
      ...(tokenExpiresAt ? { token_expires_at: tokenExpiresAt } : {}),
    })

    if (dbResult.error) {
      return NextResponse.json({ error: dbResult.error }, { status: 400 })
    }

    return NextResponse.json({
      data: {
        ig_id: igAccount.id,
        ig_username: igDetail.username || igAccount.username,
        followers_count: igDetail.followers_count,
      }
    }, { status: 201 })
  } catch (err) {
    console.error("[connect] Unexpected:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
