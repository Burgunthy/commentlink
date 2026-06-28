/**
 * Shared DM/message helpers.
 *
 * Extracted from the webhook so the manual re-send and raffle flows rebuild
 * the *exact same* message the webhook would have sent. Pure functions only —
 * no Supabase, no network — except `sendInstagramDm`, which mirrors the
 * webhook's DM POST and is reused by the re-send/raffle endpoints.
 */

const IG_API_BASE = 'https://graph.instagram.com/v25.0'

export interface AccountRow {
  id: string
  user_id: string
  access_token: string
  token_expires_at: string | null
  ig_username: string
  reply_comment_text: string
  public_reply_enabled: boolean
  follow_check_enabled: boolean
  private_reply_text: string
  not_following_text: string | null
}

export interface PostKeywordRow {
  id: string
  keyword: string
  dm_message: string | null
  dm_link_url: string | null
  not_following_dm: string | null
  not_following_link: string | null
  sort_order: number
}

export interface ProductLink {
  product_name: string
  affiliate_url: string
  sort_order: number
}

export interface PostRow {
  id: string
  account_id: string
  media_id: string
  caption: string | null
  dm_message: string | null
  dm_link_url: string | null
  public_reply_text: string | null
  not_following_dm: string | null
  not_following_link: string | null
  accounts: AccountRow
  products?: ProductLink[] | null
}

/** Variables that may appear in a settings DM template (`{username}` etc.). */
export interface DmVariableContext {
  username: string
  post_url: string
  product_name: string
  product_url: string
}

/**
 * Build the final DM message with priority:
 *   keyword match > post-level setting > account-level fallback
 */
export function buildDmMessage(
  account: AccountRow,
  post: PostRow,
  matchedKeyword: PostKeywordRow | undefined,
  isFollower: boolean,
  products?: ProductLink[] | null
): string {
  let dmMessage: string
  let linkUrl: string

  if (isFollower) {
    dmMessage =
      matchedKeyword?.dm_message ||
      post.dm_message ||
      account.private_reply_text ||
      ''
    linkUrl =
      matchedKeyword?.dm_link_url ||
      post.dm_link_url ||
      ''
  } else {
    dmMessage =
      matchedKeyword?.not_following_dm ||
      post.not_following_dm ||
      account.not_following_text ||
      matchedKeyword?.dm_message ||
      post.dm_message ||
      account.private_reply_text ||
      ''
    linkUrl =
      matchedKeyword?.not_following_link ||
      post.not_following_link ||
      matchedKeyword?.dm_link_url ||
      post.dm_link_url ||
      ''
  }

  // Registered products (affiliate links) take precedence over a single linkUrl —
  // list up to 3 (Instagram's button cap) sorted by sort_order.
  if (products && products.length > 0) {
    const linkBlock = products
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .slice(0, 3)
      .map((p) => `🔗 ${p.product_name} — ${p.affiliate_url}`)
      .join('\n')
    dmMessage = dmMessage ? `${dmMessage}\n\n${linkBlock}` : linkBlock
  } else if (linkUrl && dmMessage) {
    dmMessage = dmMessage + '\n\n🔗 ' + linkUrl
  }

  return dmMessage
}

/**
 * Build the public reply text with priority:
 *   post-level override > account-level setting
 */
export function buildPublicReply(
  account: AccountRow,
  post: PostRow
): string | null {
  return post.public_reply_text || account.reply_comment_text || null
}

/**
 * Replace `{username}` / `{post_url}` / `{product_name}` / `{product_url}`
 * placeholders in a settings DM template. Uses regex replace (not
 * `String.replaceAll`) to stay compatible with the project's ES2017 target.
 */
export function substituteVariables(template: string, ctx: DmVariableContext): string {
  return template
    .replace(/\{username\}/g, ctx.username)
    .replace(/\{post_url\}/g, ctx.post_url)
    .replace(/\{product_name\}/g, ctx.product_name)
    .replace(/\{product_url\}/g, ctx.product_url)
}

/**
 * Split a comma-separated keyword list (e.g. "링크, 정보, 가격") into trimmed,
 * lowercased tokens, then return true if `text` contains any of them.
 * Empty/whitespace keywords are ignored.
 */
export function matchesAnyKeyword(text: string, keywordCsv: string | null | undefined): boolean {
  if (!keywordCsv) return false
  const haystack = text.toLowerCase()
  return keywordCsv
    .split(',')
    .map(k => k.trim().toLowerCase())
    .filter(Boolean)
    .some(k => haystack.includes(k))
}

/** Result of a single Instagram DM send. */
export interface SendDmResult {
  ok: boolean
  error?: string
}

/**
 * Send a private Instagram DM via the Graph API. Mirrors the webhook's DM step
 * (POST /me/messages). Returns `{ ok: false, error }` on any failure rather
 * than throwing, so callers can record the reason without a try/catch.
 */
export async function sendInstagramDm(
  accessToken: string,
  recipientIgUserId: string,
  message: string
): Promise<SendDmResult> {
  try {
    const url = new URL(`${IG_API_BASE}/me/messages`)
    url.searchParams.set('access_token', accessToken)

    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: recipientIgUserId },
        message: { text: message },
      }),
    })

    const data = (await res.json()) as { error?: { message?: string } }

    if (!res.ok || data.error) {
      return { ok: false, error: data.error?.message || `HTTP ${res.status}` }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}
