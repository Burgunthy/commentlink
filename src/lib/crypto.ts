import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

/**
 * AES-256-GCM symmetric encryption for sensitive columns (accounts.access_token).
 *
 * Ciphertext format: "<ivHex>:<authTagHex>:<encryptedHex>".
 *
 * Plaintext fallback: when TOKEN_ENCRYPTION_KEY is unset (dev) the functions are
 * identity — encrypt returns the plaintext, decrypt returns its input verbatim.
 * This lets the feature roll out incrementally: existing plaintext rows keep
 * reading correctly, and new writes become encrypted once the key is set.
 * Production MUST set TOKEN_ENCRYPTION_KEY.
 */

const ALGO = 'aes-256-gcm'

function getKey(): Buffer | null {
  const hex = process.env.TOKEN_ENCRYPTION_KEY
  if (!hex || hex.length !== 64) return null // unset or malformed → plaintext mode
  return Buffer.from(hex, 'hex')
}

/** Whether encryption is active (key configured). */
export function isEncryptionEnabled(): boolean {
  return getKey() !== null
}

/** Encrypt a token. Returns plaintext unchanged when no key is configured. */
export function encryptToken(plaintext: string): string {
  const key = getKey()
  if (!key) return plaintext
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGO, key, iv)
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv.toString('hex'), tag.toString('hex'), enc.toString('hex')].join(':')
}

/**
 * Decrypt a token. Accepts both encrypted ("iv:tag:enc") and legacy plaintext
 * values — a value without the two ":" separators is returned as-is, so reads
 * keep working before/during migration.
 */
export function decryptToken(stored: string): string {
  // Encrypted values are "iv(24):tag(32):enc" — require both separators.
  const parts = stored.split(':')
  if (parts.length !== 3) return stored // plaintext (pre-encryption or dev)
  const [ivHex, tagHex, encHex] = parts
  const key = getKey()
  if (!key) return stored // no key → can't have been encrypted by us; treat as plaintext
  try {
    const decipher = createDecipheriv(ALGO, key, Buffer.from(ivHex, 'hex'))
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
    return Buffer.concat([decipher.update(Buffer.from(encHex, 'hex')), decipher.final()]).toString('utf8')
  } catch {
    return stored // corrupt/foreign value → best-effort plaintext
  }
}
