import type { SupabaseClient } from '@supabase/supabase-js'
import { decryptToken, encryptToken } from './crypto'

// Instagram Graph API base (matches the version used by the webhook).
const IG_API_BASE = 'https://graph.instagram.com/v25.0'

/** Default long-lived token lifetime (~60 days) when the API omits expires_in. */
const DEFAULT_LONG_LIVED_TTL_SECONDS = 60 * 24 * 60 * 60

interface IgRefreshResponse {
  access_token?: string
  expires_in?: number
  token_type?: string
  error?: { message?: string; code?: number; type?: string }
}

/**
 * Refresh a long-lived Instagram User Access Token. Long-lived tokens last ~60
 * days and can be refreshed at most once per 24h. Returns the new token and its
 * TTL in seconds, or null on failure.
 *
 * Uses the `ig_refresh_token` grant at /refresh_access_token. Note: the
 * `ig_exchange_token` grant (used during the initial OAuth flow) only converts a
 * short-lived token into a long-lived one — it cannot refresh an already
 * long-lived token, so it is not used here.
 */
export async function refreshLongLivedToken(
  accessToken: string
): Promise<{ accessToken: string; expiresInSeconds: number } | null> {
  try {
    const url = new URL(`${IG_API_BASE}/refresh_access_token`)
    url.searchParams.set('grant_type', 'ig_refresh_token')
    url.searchParams.set('access_token', accessToken)

    const res = await fetch(url.toString())
    const data = (await res.json()) as IgRefreshResponse

    if (!res.ok || !data.access_token) {
      console.error(
        '[instagram:error] token refresh failed:',
        data.error?.message || JSON.stringify(data)
      )
      return null
    }

    return {
      accessToken: data.access_token,
      expiresInSeconds:
        typeof data.expires_in === 'number'
          ? data.expires_in
          : DEFAULT_LONG_LIVED_TTL_SECONDS,
    }
  } catch (err) {
    console.error('[instagram:error] token refresh threw:', err)
    return null
  }
}

/** Refresh one account's long-lived token and persist it. Returns the new
 *  expiry ISO string, or null on failure. */
export async function refreshAndPersistAccount(
  supabase: SupabaseClient,
  account: { id: string; access_token: string }
): Promise<string | null> {
  const refreshed = await refreshLongLivedToken(decryptToken(account.access_token))
  if (!refreshed) return null
  const newExpiresAt = new Date(
    Date.now() + refreshed.expiresInSeconds * 1000
  ).toISOString()
  const { error } = await supabase
    .from('accounts')
    .update({ access_token: encryptToken(refreshed.accessToken), token_expires_at: newExpiresAt })
    .eq('id', account.id)
  if (error) {
    console.error('[instagram:error] persist refreshed token:', error.message)
    return null
  }
  return newExpiresAt
}

/**
 * Ensure the account has a usable access token. If the stored token expires
 * within `withinMs` (default 24h) — or has no recorded expiry — attempt a
 * refresh and persist the new token + expiry to the accounts table.
 *
 * On refresh failure the original token is returned unchanged: a refresh can
 * fail transiently while the existing token is still valid, so the caller can
 * still attempt the real API call with it.
 */
export async function ensureFreshToken(
  supabase: SupabaseClient,
  account: { id: string; access_token: string; token_expires_at?: string | null },
  withinMs = 24 * 60 * 60 * 1000
): Promise<string> {
  const now = Date.now()
  const plaintextToken = decryptToken(account.access_token)
  const expiresAtMs = account.token_expires_at ? Date.parse(account.token_expires_at) : NaN

  // Refresh when expiry is unknown or within the threshold.
  const needsRefresh = Number.isNaN(expiresAtMs) || expiresAtMs - now <= withinMs
  if (!needsRefresh) return plaintextToken

  const refreshed = await refreshLongLivedToken(plaintextToken)
  if (!refreshed) {
    // Keep the existing token; it may still be valid for this request.
    return plaintextToken
  }

  const newExpiresAt = new Date(now + refreshed.expiresInSeconds * 1000).toISOString()
  const { error } = await supabase
    .from('accounts')
    .update({ access_token: encryptToken(refreshed.accessToken), token_expires_at: newExpiresAt })
    .eq('id', account.id)

  if (error) {
    console.error('[instagram:error] failed to persist refreshed token:', error.message)
  } else {
    console.log(
      `[instagram] refreshed token for account ${account.id}; expires ${newExpiresAt}`
    )
  }

  return refreshed.accessToken
}

/** Compute an ISO expiry timestamp from a TTL in seconds (or null if unknown). */
export function expiryFromTtl(
  expiresInSeconds: number | null | undefined
): string | null {
  if (typeof expiresInSeconds !== 'number') return null
  return new Date(Date.now() + expiresInSeconds * 1000).toISOString()
}
