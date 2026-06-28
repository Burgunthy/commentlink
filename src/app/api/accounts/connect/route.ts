import { NextRequest, NextResponse } from "next/server"
import { expiryFromTtl } from "@/lib/instagram"
import { getServerUserId } from "@/lib/auth-user"
import { upsertAccount } from "@/lib/accounts"
import { syncAccountPosts } from "@/lib/syncPosts"
import { getServiceClient } from "@/lib/supabase/server"
import { canAddAccount } from "@/lib/plan-guard"

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

    // 1. Exchange for long-lived token if short-lived. Build the URL with
    // searchParams so the token (which may contain URL-special chars like '|')
    // is encoded safely; a failed exchange falls through to the original token.
    let longToken = token
    let expiresIn: number | null = null
    const exUrl = new URL("https://graph.facebook.com/v25.0/oauth/access_token")
    exUrl.searchParams.set("grant_type", "fb_exchange_token")
    exUrl.searchParams.set("client_id", appId)
    exUrl.searchParams.set("client_secret", appSecret)
    exUrl.searchParams.set("fb_exchange_token", token)
    const exResp = await fetch(exUrl)
    if (exResp.ok) {
      const exData = await exResp.json()
      if (exData.access_token) {
        longToken = exData.access_token
        if (typeof exData.expires_in === "number") expiresIn = exData.expires_in
      }
    }

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

    // 5. Get current user id via the standard Supabase client.
    const userId = await getServerUserId()

    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // 5.5. Enforce plan account limit (a reconnect of an existing account is an
    // update, so only enforce when this Instagram account is new to the user).
    const guardClient = await getServiceClient()
    const { data: existingAccount } = await guardClient
      .from('accounts')
      .select('id')
      .eq('user_id', userId)
      .eq('ig_id', String(igAccount.id))
      .maybeSingle()

    if (!existingAccount) {
      const { allowed } = await canAddAccount(guardClient, userId)
      if (!allowed) {
        return NextResponse.json(
          { error: '계정 연결 한도에 도달했습니다. 요금제를 업그레이드해주세요.' },
          { status: 403 }
        )
      }
    }

    // 6. Save the account via the service-role client.
    const tokenExpiresAt = expiryFromTtl(expiresIn)
    const dbResult = await upsertAccount(guardClient, {
      user_id: userId,
      ig_id: String(igAccount.id),
      ig_username: igDetail.username || igAccount.username || "",
      access_token: longToken,
      ...(tokenExpiresAt ? { token_expires_at: tokenExpiresAt } : {}),
    })

    if (dbResult.error) {
      return NextResponse.json({ error: dbResult.error }, { status: 400 })
    }

    // Sync recent media into posts so the webhook can match incoming comments.
    const { data: accountRow } = await guardClient
      .from('accounts')
      .select('id')
      .eq('ig_id', String(igAccount.id))
      .single()
    if (accountRow) {
      await syncAccountPosts(guardClient, {
        id: accountRow.id,
        access_token: longToken,
        token_expires_at: tokenExpiresAt ?? null,
      })
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
