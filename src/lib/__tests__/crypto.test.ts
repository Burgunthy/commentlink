import { describe, it, expect, afterEach } from 'vitest'
import { encryptToken, decryptToken, isEncryptionEnabled } from '../crypto'

describe('crypto token encryption', () => {
  const originalKey = process.env.TOKEN_ENCRYPTION_KEY

  afterEach(() => {
    if (originalKey === undefined) delete process.env.TOKEN_ENCRYPTION_KEY
    else process.env.TOKEN_ENCRYPTION_KEY = originalKey
  })

  it('round-trips an encrypted token when a key is set', () => {
    process.env.TOKEN_ENCRYPTION_KEY = 'a'.repeat(64)
    const token = 'IGQVJ...|secret-part'
    const encrypted = encryptToken(token)
    expect(encrypted).not.toBe(token)
    expect(encrypted.split(':')).toHaveLength(3)
    expect(decryptToken(encrypted)).toBe(token)
  })

  it('is identity when no key is configured (plaintext / dev mode)', () => {
    delete process.env.TOKEN_ENCRYPTION_KEY
    expect(isEncryptionEnabled()).toBe(false)
    expect(encryptToken('abc')).toBe('abc')
    expect(decryptToken('abc')).toBe('abc')
  })

  it('treats legacy plaintext (no ":" separators) as plaintext even with a key', () => {
    process.env.TOKEN_ENCRYPTION_KEY = 'b'.repeat(64)
    expect(decryptToken('legacy_plaintoken')).toBe('legacy_plaintoken')
  })

  it('produces different ciphertexts for the same plaintext (random IV)', () => {
    process.env.TOKEN_ENCRYPTION_KEY = 'c'.repeat(64)
    expect(encryptToken('same')).not.toBe(encryptToken('same'))
  })

  it('decrypt of a tampered ciphertext falls back to the stored value', () => {
    process.env.TOKEN_ENCRYPTION_KEY = 'd'.repeat(64)
    const encrypted = encryptToken('real')
    const [, tag, enc] = encrypted.split(':')
    // Flip a byte in the auth tag → GCM verification fails → best-effort fallback.
    const tampered = ['00'.padStart(24, '0'), tag, enc].join(':')
    // Not the original plaintext, but must not throw.
    expect(typeof decryptToken(tampered)).toBe('string')
  })
})
