import type { SupabaseClient } from '@supabase/supabase-js'
import { ensureFreshToken } from './instagram'

const IG_API_BASE = 'https://graph.instagram.com/v25.0'

interface IgMedia {
  id: string
  caption?: string
  media_type?: string
  media_url?: string
  thumbnail_url?: string
  permalink?: string
  timestamp?: string
}

/**
 * Sync an account's recent Instagram media into the `posts` table (upsert by
 * account_id+media_id). Called after an account is connected/reconnected so the
 * webhook can match incoming comments to a post — without this, handleComment
 * finds no post for a media_id and the comment→DM flow never fires (PLAN 5-2⑥).
 *
 * Best-effort: network/DB errors are logged and return 0, never throw — a sync
 * failure must not break the connect flow. `ensureFreshToken` decrypts the
 * stored token (and refreshes if near expiry) before the Graph API call.
 */
export async function syncAccountPosts(
  supabase: SupabaseClient,
  account: { id: string; access_token: string; token_expires_at?: string | null },
  limit = 25
): Promise<number> {
  try {
    const accessToken = await ensureFreshToken(supabase, account)

    const url = new URL(`${IG_API_BASE}/me/media`)
    url.searchParams.set('fields', 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp')
    url.searchParams.set('limit', String(limit))
    url.searchParams.set('access_token', accessToken)

    const res = await fetch(url.toString(), { cache: 'no-store' })
    if (!res.ok) {
      console.error('[syncPosts] IG media fetch failed:', res.status, await res.text().catch(() => ''))
      return 0
    }

    const data = (await res.json()) as { data?: IgMedia[] }
    const media = data.data ?? []
    if (media.length === 0) return 0

    const rows = media.map((m) => ({
      account_id: account.id,
      media_id: m.id,
      media_type: m.media_type ?? null,
      caption: m.caption ?? null,
      media_url: m.media_url ?? m.thumbnail_url ?? null,
      is_active: true,
    }))

    const { error } = await supabase
      .from('posts')
      .upsert(rows, { onConflict: 'account_id,media_id' })

    if (error) {
      console.error('[syncPosts] upsert failed:', error.message)
      return 0
    }

    console.log(`[syncPosts] synced ${rows.length} posts for account ${account.id}`)
    return rows.length
  } catch (err) {
    console.error('[syncPosts] threw:', err)
    return 0
  }
}
