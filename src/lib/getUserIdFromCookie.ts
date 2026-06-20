/**
 * Edge-runtime-safe base64url → UTF-8 string.
 * Buffer.from(str, 'base64url') is NOT available in Edge/ middleware.
 */
function base64urlToString(input: string): string {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

/**
 * Extract user ID from Supabase JWT stored in an httpOnly cookie.
 * Handles both @supabase/ssr >= 0.10 base64url encoding (prefix "base64-")
 * and legacy URL-encoded JSON format.
 *
 * Does NOT call any Supabase client or GoTrue endpoint — pure cookie parsing.
 */
export function getUserIdFromCookie(request: Request): string | null {
  try {
    // Cookie name is `sb-<ref>-auth-token`. Use endsWith to skip the
    // separate `sb-<ref>-auth-token-code-verifier` cookie.
    const cookie = (request as { cookies?: { getAll: () => { name: string; value: string }[] } }).cookies
      ?.getAll()
      ?.find((c) => c.name.endsWith('-auth-token'))
    const value = cookie?.value
    if (!value) return null

    // @supabase/ssr >= 0.10 stores "base64-" + base64url(JSON). Handle legacy too.
    const json = value.startsWith('base64-')
      ? base64urlToString(value.slice('base64-'.length))
      : decodeURIComponent(value)

    const accessToken: string | undefined = JSON.parse(json).access_token
    if (!accessToken) return null

    // Decode JWT payload (base64url)
    const parts = accessToken.split('.')
    if (parts.length !== 3) return null

    const payload = JSON.parse(base64urlToString(parts[1]))
    return payload.sub || null
  } catch {
    return null
  }
}
