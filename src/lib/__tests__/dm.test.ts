import { describe, it, expect } from 'vitest'
import {
  buildDmMessage,
  buildPublicReply,
  matchesAnyKeyword,
  substituteVariables,
  type AccountRow,
  type PostRow,
  type PostKeywordRow,
  type ProductLink,
} from '../dm'

const account: AccountRow = {
  id: 'a1',
  user_id: 'u1',
  access_token: 'tok',
  token_expires_at: null,
  ig_username: 'acc',
  reply_comment_text: '기본 대댓글',
  public_reply_enabled: true,
  follow_check_enabled: true,
  private_reply_text: '기본 DM',
  not_following_text: '팔로우 안됨',
}

const basePost = (): PostRow => ({
  id: 'p1',
  account_id: 'a1',
  media_id: 'm1',
  caption: null,
  dm_message: null,
  dm_link_url: null,
  public_reply_text: null,
  not_following_dm: null,
  not_following_link: null,
  accounts: account,
})

describe('buildDmMessage — priority order', () => {
  it('keyword match wins for followers', () => {
    const kw: PostKeywordRow = {
      id: 'k1', keyword: '링크', dm_message: 'kw DM', dm_link_url: 'kw-url',
      not_following_dm: null, not_following_link: null, sort_order: 0,
    }
    expect(buildDmMessage(account, basePost(), kw, true)).toBe('kw DM\n\n🔗 kw-url')
  })

  it('post-level setting beats account default', () => {
    const post = { ...basePost(), dm_message: 'post DM', dm_link_url: 'post-url' }
    expect(buildDmMessage(account, post, undefined, true)).toBe('post DM\n\n🔗 post-url')
  })

  it('falls back to account.private_reply_text for followers', () => {
    expect(buildDmMessage(account, basePost(), undefined, true)).toBe('기본 DM')
  })

  it('registered products take precedence over a single linkUrl, sorted by sort_order', () => {
    const post = { ...basePost(), dm_message: '안내', dm_link_url: 'single-url' }
    const products: ProductLink[] = [
      { product_name: '선크림', affiliate_url: 'https://a.com', sort_order: 1 },
      { product_name: '토너', affiliate_url: 'https://b.com', sort_order: 0 },
    ]
    expect(buildDmMessage(account, post, undefined, true, products)).toBe(
      '안내\n\n🔗 토너 — https://b.com\n🔗 선크림 — https://a.com'
    )
  })

  it('caps products at 3 links', () => {
    const products: ProductLink[] = Array.from({ length: 5 }, (_, i) => ({
      product_name: `P${i}`, affiliate_url: `https://${i}.com`, sort_order: i,
    }))
    const out = buildDmMessage(account, basePost(), undefined, true, products)
    expect(out.split('\n').filter((l) => l.startsWith('🔗')).length).toBe(3)
  })

  it('uses not-following path for non-followers', () => {
    expect(buildDmMessage(account, basePost(), undefined, false)).toBe('팔로우 안됨')
  })

  it('non-follower falls through to follower message when no not-following config', () => {
    const acc = { ...account, not_following_text: null }
    expect(buildDmMessage(acc, basePost(), undefined, false)).toBe('기본 DM')
  })
})

describe('buildPublicReply', () => {
  it('post override beats account default', () => {
    expect(buildPublicReply(account, { ...basePost(), public_reply_text: 'post reply' })).toBe('post reply')
    expect(buildPublicReply(account, basePost())).toBe('기본 대댓글')
  })
})

describe('matchesAnyKeyword', () => {
  it('matches any comma-separated keyword, case-insensitive', () => {
    expect(matchesAnyKeyword('링크 부탁해요', '링크, 정보, 가격')).toBe(true)
    expect(matchesAnyKeyword('INFO please', '링크, 정보')).toBe(false)
    expect(matchesAnyKeyword('send LINK', 'link, url')).toBe(true)
  })

  it('returns false for empty / whitespace keywords', () => {
    expect(matchesAnyKeyword('anything', null)).toBe(false)
    expect(matchesAnyKeyword('anything', '')).toBe(false)
    expect(matchesAnyKeyword('anything', ' , , ')).toBe(false)
  })
})

describe('substituteVariables', () => {
  it('replaces all known placeholders', () => {
    const out = substituteVariables('{username} → {post_url} : {product_name} @ {product_url}', {
      username: 'u', post_url: 'P', product_name: 'N', product_url: 'L',
    })
    expect(out).toBe('u → P : N @ L')
  })

  it('leaves unknown placeholders untouched', () => {
    expect(substituteVariables('hi {unknown}', {
      username: 'u', post_url: '', product_name: '', product_url: '',
    })).toBe('hi {unknown}')
  })
})
