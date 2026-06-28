"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Plus,
  Trash2,
  ExternalLink,
  Image as ImageIcon,
  Heart,
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Settings2,
  Link2,
  MessageSquare,
  Tag,
  UserCheck,
  UserX,
  Package,
} from "lucide-react"

interface Account {
  id: string
  ig_username: string
  access_token: string
}

interface RegisteredPost {
  id: string
  account_id: string
  media_id: string
  media_type: string | null
  caption: string | null
  media_url: string | null
  is_active: boolean
  dm_message: string | null
  dm_link_url: string | null
  public_reply_text: string | null
  not_following_dm: string | null
  not_following_link: string | null
  created_at: string
  accounts: { id: string; ig_username: string } | null
}

interface IgMedia {
  id: string
  caption: string | null
  media_type: string
  media_url: string | null
  thumbnail_url: string | null
  like_count: number | null
  timestamp: string
  permalink: string
}

interface PostKeyword {
  id: string
  post_id: string
  keyword: string
  dm_message: string | null
  dm_link_url: string | null
  not_following_dm: string | null
  not_following_link: string | null
  sort_order: number
}

interface Product {
  id: string
  product_name: string
  affiliate_url: string
  sort_order: number
}

interface PostSettingsForm {
  dm_message: string
  dm_link_url: string
  public_reply_text: string
  not_following_dm: string
  not_following_link: string
}

export default function PostsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string>("")
  const [registeredPosts, setRegisteredPosts] = useState<RegisteredPost[]>([])
  const [igMedia, setIgMedia] = useState<IgMedia[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMedia, setLoadingMedia] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)
  const [showMediaPicker, setShowMediaPicker] = useState(false)

  // Post settings modal
  const [showSettings, setShowSettings] = useState(false)
  const [settingsPost, setSettingsPost] = useState<RegisteredPost | null>(null)
  const [settingsForm, setSettingsForm] = useState<PostSettingsForm>({
    dm_message: "",
    dm_link_url: "",
    public_reply_text: "",
    not_following_dm: "",
    not_following_link: "",
  })
  const [settingsSaving, setSettingsSaving] = useState(false)

  // Keywords
  const [keywords, setKeywords] = useState<PostKeyword[]>([])
  const [newKeyword, setNewKeyword] = useState("")
  const [newKwDm, setNewKwDm] = useState("")
  const [newKwLink, setNewKwLink] = useState("")
  const [newKwNotDm, setNewKwNotDm] = useState("")
  const [newKwNotLink, setNewKwNotLink] = useState("")

  // Products (affiliate links)
  const [products, setProducts] = useState<Product[]>([])
  const [newProductName, setNewProductName] = useState("")
  const [newProductUrl, setNewProductUrl] = useState("")

  useEffect(() => {
    fetchAccounts()
  }, [])

  const fetchAccounts = async () => {
    const supabase = createClient()
    try {
      const { data } = await supabase
        .from("accounts")
        .select("id, ig_username, access_token")
      if (data) {
        setAccounts(data as Account[])
        if (data.length > 0) {
          setSelectedAccountId(data[0].id)
        }
      }
    } catch {
      // table may not exist
    } finally {
      setLoading(false)
    }
  }

  const fetchRegisteredPosts = useCallback(async () => {
    if (!selectedAccountId) return
    const supabase = createClient()
    try {
      const { data } = await supabase
        .from("posts")
        .select("*, accounts (id, ig_username)")
        .eq("account_id", selectedAccountId)
        .order("created_at", { ascending: false })
      if (data) setRegisteredPosts(data as RegisteredPost[])
    } catch {
      // ignore
    }
  }, [selectedAccountId])

  useEffect(() => {
    fetchRegisteredPosts()
  }, [fetchRegisteredPosts])

  const fetchIgMedia = async () => {
    if (!selectedAccountId) return
    setLoadingMedia(true)
    setShowMediaPicker(true)
    try {
      const res = await fetch(`/api/accounts/${selectedAccountId}/media`)
      if (!res.ok) {
        const err = await res.json()
        alert(err.error || "Instagram 게시물을 불러오지 못했습니다.")
        return
      }
      const json = await res.json()
      setIgMedia(json.data || [])
    } catch {
      alert("Instagram 게시물을 불러오지 못했습니다.")
    } finally {
      setLoadingMedia(false)
    }
  }

  const handleRegisterPost = async (media: IgMedia) => {
    setSaving(media.id)
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: selectedAccountId,
          media_id: media.id,
          media_type: media.media_type,
          caption: media.caption,
          media_url: media.thumbnail_url || media.media_url,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        alert(err.error || "게시물 등록에 실패했습니다.")
        return
      }
      setIgMedia((prev) => prev.filter((m) => m.id !== media.id))
      await fetchRegisteredPosts()
    } catch {
      alert("게시물 등록에 실패했습니다.")
    } finally {
      setSaving(null)
    }
  }

  const handleToggleActive = async (post: RegisteredPost) => {
    try {
      const res = await fetch("/api/posts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: post.id, is_active: !post.is_active }),
      })
      if (res.ok) {
        await fetchRegisteredPosts()
      }
    } catch {
      // ignore
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("이 게시물을 삭제하시겠습니까?")) return
    try {
      const res = await fetch("/api/posts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      if (res.ok) {
        await fetchRegisteredPosts()
      }
    } catch {
      // ignore
    }
  }

  // --- Post Settings ---

  const openSettings = async (post: RegisteredPost) => {
    setSettingsPost(post)
    setSettingsForm({
      dm_message: post.dm_message || "",
      dm_link_url: post.dm_link_url || "",
      public_reply_text: post.public_reply_text || "",
      not_following_dm: post.not_following_dm || "",
      not_following_link: post.not_following_link || "",
    })
    setShowSettings(true)
    // Fetch keywords
    try {
      const res = await fetch(`/api/post-keywords?post_id=${post.id}`)
      if (res.ok) {
        const json = await res.json()
        setKeywords(json.data || [])
      }
    } catch {
      // ignore
    }
    // Fetch products
    try {
      const res = await fetch(`/api/posts/${post.id}/products`)
      if (res.ok) {
        const json = await res.json()
        setProducts(json.data || [])
      }
    } catch {
      // ignore
    }
  }

  const saveSettings = async () => {
    if (!settingsPost) return
    setSettingsSaving(true)
    try {
      const res = await fetch("/api/posts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: settingsPost.id,
          dm_message: settingsForm.dm_message || null,
          dm_link_url: settingsForm.dm_link_url || null,
          public_reply_text: settingsForm.public_reply_text || null,
          not_following_dm: settingsForm.not_following_dm || null,
          not_following_link: settingsForm.not_following_link || null,
        }),
      })
      if (res.ok) {
        await fetchRegisteredPosts()
        setShowSettings(false)
      }
    } catch {
      alert("설정 저장에 실패했습니다.")
    } finally {
      setSettingsSaving(false)
    }
  }

  const addKeyword = async () => {
    if (!settingsPost || !newKeyword.trim()) return
    try {
      const res = await fetch("/api/post-keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post_id: settingsPost.id,
          keyword: newKeyword.trim(),
          dm_message: newKwDm || null,
          dm_link_url: newKwLink || null,
          not_following_dm: newKwNotDm || null,
          not_following_link: newKwNotLink || null,
        }),
      })
      if (res.ok) {
        const json = await res.json()
        setKeywords((prev) => [...prev, json.data])
        setNewKeyword("")
        setNewKwDm("")
        setNewKwLink("")
        setNewKwNotDm("")
        setNewKwNotLink("")
      }
    } catch {
      alert("키워드 추가에 실패했습니다.")
    }
  }

  const deleteKeyword = async (id: string) => {
    try {
      const res = await fetch("/api/post-keywords", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      if (res.ok) {
        setKeywords((prev) => prev.filter((kw) => kw.id !== id))
      }
    } catch {
      // ignore
    }
  }

  const addProduct = async () => {
    if (!settingsPost || !newProductName.trim() || !newProductUrl.trim()) return
    try {
      const res = await fetch(`/api/posts/${settingsPost.id}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_name: newProductName.trim(),
          affiliate_url: newProductUrl.trim(),
        }),
      })
      const json = await res.json()
      if (res.ok) {
        setProducts((prev) => [...prev, json.data])
        setNewProductName("")
        setNewProductUrl("")
      } else {
        alert(json.error || "제품 추가에 실패했습니다.")
      }
    } catch {
      alert("제품 추가에 실패했습니다.")
    }
  }

  const deleteProduct = async (id: string) => {
    if (!settingsPost) return
    try {
      const res = await fetch(`/api/posts/${settingsPost.id}/products/${id}`, {
        method: "DELETE",
      })
      if (res.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== id))
      }
    } catch {
      // ignore
    }
  }

  const isRegistered = (mediaId: string) =>
    registeredPosts.some((p) => p.media_id === mediaId)

  const getThumbnail = (media: IgMedia | RegisteredPost) => {
    if (media.media_url) return media.media_url
    if ("thumbnail_url" in media && media.thumbnail_url) return media.thumbnail_url
    return null
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`
  }

  const truncateCaption = (caption: string | null, maxLen = 60) => {
    if (!caption) return "캡션 없음"
    return caption.length > maxLen ? caption.slice(0, maxLen) + "..." : caption
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white py-16 dark:border-zinc-700 dark:bg-zinc-900">
        <ImageIcon className="mb-3 h-10 w-10 text-zinc-300 dark:text-zinc-600" />
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          연결된 Instagram 계정이 없습니다
        </p>
        <p className="mt-1 text-xs text-zinc-400">
          먼저 Accounts 페이지에서 Instagram 계정을 연결해주세요.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm text-zinc-500 dark:text-zinc-400">
            감시 게시물
          </h2>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {registeredPosts.length}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          >
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                @{acc.ig_username}
              </option>
            ))}
          </select>
          <button
            onClick={fetchIgMedia}
            disabled={loadingMedia}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
          >
            {loadingMedia ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Instagram 불러오기
          </button>
        </div>
      </div>

      {/* Media Picker Modal */}
      {showMediaPicker && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-20">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-200 p-5 dark:border-zinc-800">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  Instagram 게시물 불러오기
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  감시할 게시물을 선택하세요
                </p>
              </div>
              <button
                onClick={() => setShowMediaPicker(false)}
                className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-5">
              {loadingMedia ? (
                <div className="flex h-40 items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : igMedia.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <ImageIcon className="mb-3 h-10 w-10 text-zinc-300 dark:text-zinc-600" />
                  <p className="text-sm text-zinc-500">게시물을 찾을 수 없습니다</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {igMedia.map((media) => {
                    const thumb = getThumbnail(media)
                    const alreadyRegistered = isRegistered(media.id)
                    return (
                      <div
                        key={media.id}
                        className="group relative overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                      >
                        {thumb ? (
                          <div className="aspect-square w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                            <img src={thumb} alt="" className="h-full w-full object-cover" />
                          </div>
                        ) : (
                          <div className="flex aspect-square items-center justify-center bg-zinc-100 dark:bg-zinc-800">
                            <ImageIcon className="h-8 w-8 text-zinc-400" />
                          </div>
                        )}
                        <div className="p-2">
                          <p className="truncate text-xs text-zinc-700 dark:text-zinc-300">
                            {truncateCaption(media.caption, 40)}
                          </p>
                          <div className="mt-1 flex items-center gap-2 text-xs text-zinc-400">
                            <Heart className="h-3 w-3" />
                            <span>{media.like_count ?? 0}</span>
                            <span>{formatDate(media.timestamp)}</span>
                          </div>
                        </div>
                        {alreadyRegistered ? (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                            <span className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              등록됨
                            </span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleRegisterPost(media)}
                            disabled={saving === media.id}
                            className="absolute bottom-2 right-2 flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 disabled:opacity-60"
                          >
                            {saving === media.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Plus className="h-3 w-3" />
                            )}
                            등록
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
              <button
                onClick={() => setShowMediaPicker(false)}
                className="w-full rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post Settings Modal */}
      {showSettings && settingsPost && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-16">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-200 p-5 dark:border-zinc-800">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  게시물 설정
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {truncateCaption(settingsPost.caption, 50)}
                </p>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[70vh] space-y-6 overflow-y-auto p-5">
              {/* Default DM Message */}
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  <MessageSquare className="h-4 w-4" />
                  기본 DM 메시지
                </label>
                <textarea
                  value={settingsForm.dm_message}
                  onChange={(e) => setSettingsForm((p) => ({ ...p, dm_message: e.target.value }))}
                  rows={3}
                  placeholder="댓글 작성자에게 보낼 DM 메시지 (미설정 시 계정 기본값 사용)"
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>

              {/* DM Link URL */}
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  <Link2 className="h-4 w-4" />
                  DM 링크 URL
                </label>
                <input
                  type="url"
                  value={settingsForm.dm_link_url}
                  onChange={(e) => setSettingsForm((p) => ({ ...p, dm_link_url: e.target.value }))}
                  placeholder="https://example.com/product (DM 메시지에 자동 포함)"
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>

              {/* Public Reply Override */}
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  <ExternalLink className="h-4 w-4" />
                  공개 댓글 답장 (게시물 오버라이드)
                </label>
                <input
                  type="text"
                  value={settingsForm.public_reply_text}
                  onChange={(e) => setSettingsForm((p) => ({ ...p, public_reply_text: e.target.value }))}
                  placeholder="미설정 시 계정 기본값 사용"
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>

              {/* Divider */}
              <hr className="border-zinc-200 dark:border-zinc-800" />

              {/* Not Following Section */}
              <div>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  <UserX className="h-4 w-4 text-amber-500" />
                  비팔로워 전용
                </h3>
                <div className="space-y-3">
                  <textarea
                    value={settingsForm.not_following_dm}
                    onChange={(e) => setSettingsForm((p) => ({ ...p, not_following_dm: e.target.value }))}
                    rows={3}
                    placeholder="비팔로워에게 보낼 DM 메시지 (미설정 시 기본 DM 사용)"
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                  <input
                    type="url"
                    value={settingsForm.not_following_link}
                    onChange={(e) => setSettingsForm((p) => ({ ...p, not_following_link: e.target.value }))}
                    placeholder="비팔로워 전용 링크 URL"
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </div>
              </div>

              {/* Divider */}
              <hr className="border-zinc-200 dark:border-zinc-800" />

              {/* Keywords Section */}
              <div>
                <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  <Tag className="h-4 w-4 text-primary" />
                  키워드별 자동 응답
                </h3>
                <p className="mb-3 text-xs text-zinc-400">
                  댓글에 키워드가 포함되면 지정한 메시지/링크를 전송합니다
                </p>

                {/* Existing keywords */}
                {keywords.length > 0 && (
                  <div className="mb-4 space-y-2">
                    {keywords.map((kw) => (
                      <div
                        key={kw.id}
                        className="flex items-start gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/50"
                      >
                        <span className="mt-0.5 shrink-0 rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                          {kw.keyword}
                        </span>
                        <div className="min-w-0 flex-1 space-y-1">
                          {kw.dm_message && (
                            <p className="truncate text-xs text-zinc-600 dark:text-zinc-400">
                              DM: {kw.dm_message}
                            </p>
                          )}
                          {kw.dm_link_url && (
                            <p className="truncate text-xs text-primary">
                              🔗 {kw.dm_link_url}
                            </p>
                          )}
                          {kw.not_following_dm && (
                            <p className="truncate text-xs text-amber-600 dark:text-amber-400">
                              비팔로워 DM: {kw.not_following_dm}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => deleteKeyword(kw.id)}
                          className="shrink-0 rounded p-1 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add new keyword */}
                <div className="space-y-3 rounded-lg border border-dashed border-zinc-300 p-3 dark:border-zinc-700">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value)}
                      placeholder="키워드 (예: 링크, 사이즈, 가격)"
                      className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                    <button
                      onClick={addKeyword}
                      disabled={!newKeyword.trim()}
                      className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-40"
                    >
                      <Plus className="h-4 w-4" />
                      추가
                    </button>
                  </div>
                  {newKeyword.trim() && (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={newKwDm}
                        onChange={(e) => setNewKwDm(e.target.value)}
                        placeholder="DM 메시지"
                        className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                      />
                      <input
                        type="url"
                        value={newKwLink}
                        onChange={(e) => setNewKwLink(e.target.value)}
                        placeholder="링크 URL"
                        className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                      />
                      <div className="flex items-center gap-2 text-xs text-amber-600">
                        <UserX className="h-3 w-3" />
                        <span>비팔로워 전용</span>
                      </div>
                      <input
                        type="text"
                        value={newKwNotDm}
                        onChange={(e) => setNewKwNotDm(e.target.value)}
                        placeholder="비팔로워 DM 메시지"
                        className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                      />
                      <input
                        type="url"
                        value={newKwNotLink}
                        onChange={(e) => setNewKwNotLink(e.target.value)}
                        placeholder="비팔로워 링크 URL"
                        className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Divider */}
              <hr className="border-zinc-200 dark:border-zinc-800" />

              {/* Products (affiliate links) */}
              <div>
                <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  <Package className="h-4 w-4 text-primary" />
                  제품 링크 (최대 3개)
                </h3>
                <p className="mb-3 text-xs text-zinc-400">
                  DM에 포함할 제휴 링크를 등록하세요. 첫 번째 링크가 자동 발송에 사용됩니다.
                </p>

                {products.length > 0 && (
                  <div className="mb-4 space-y-2">
                    {products.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-start gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/50"
                      >
                        <Package className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-zinc-700 dark:text-zinc-300">
                            {p.product_name}
                          </p>
                          <p className="truncate text-xs text-primary">🔗 {p.affiliate_url}</p>
                        </div>
                        <button
                          onClick={() => deleteProduct(p.id)}
                          className="shrink-0 rounded p-1 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {products.length < 3 ? (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      type="text"
                      value={newProductName}
                      onChange={(e) => setNewProductName(e.target.value)}
                      placeholder="제품명 (예: 선크림)"
                      className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                    <input
                      type="url"
                      value={newProductUrl}
                      onChange={(e) => setNewProductUrl(e.target.value)}
                      placeholder="https://..."
                      className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                    <button
                      onClick={addProduct}
                      disabled={!newProductName.trim() || !newProductUrl.trim()}
                      className="flex items-center justify-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-40"
                    >
                      <Plus className="h-4 w-4" />
                      추가
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-400">제품은 게시물당 최대 3개까지 등록할 수 있습니다.</p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 border-t border-zinc-200 p-5 dark:border-zinc-800">
              <button
                onClick={() => setShowSettings(false)}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                취소
              </button>
              <button
                onClick={saveSettings}
                disabled={settingsSaving}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
              >
                {settingsSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Registered Posts List */}
      {registeredPosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white py-16 dark:border-zinc-700 dark:bg-zinc-900">
          <ImageIcon className="mb-3 h-10 w-10 text-zinc-300 dark:text-zinc-600" />
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            아직 감시 중인 게시물이 없습니다
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            &quot;Instagram 불러오기&quot; 버튼으로 게시물을 선택하세요
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {registeredPosts.map((post) => {
            const thumb = getThumbnail(post)
            return (
              <div
                key={post.id}
                className={`flex items-center gap-4 rounded-xl border p-4 transition-shadow hover:shadow-md ${
                  post.is_active
                    ? "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                    : "border-zinc-200 bg-zinc-50 opacity-60 dark:border-zinc-800 dark:bg-zinc-900/50"
                }`}
              >
                {/* Thumbnail */}
                {thumb ? (
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
                    <img src={thumb} alt="" className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                    <ImageIcon className="h-6 w-6 text-zinc-400" />
                  </div>
                )}

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        post.is_active
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                      }`}
                    >
                      {post.is_active ? "감시 중" : "일시정지"}
                    </span>
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                      {post.media_type === "VIDEO" ? "영상" : post.media_type === "CAROUSEL_ALBUM" ? "캐러셀" : "이미지"}
                    </span>
                    {post.dm_link_url && (
                      <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        <Link2 className="h-3 w-3" />
                        링크
                      </span>
                    )}
                    {post.dm_message && (
                      <span className="flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                        <MessageSquare className="h-3 w-3" />
                        DM
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-sm text-zinc-700 dark:text-zinc-300">
                    {truncateCaption(post.caption, 80)}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-400">
                    @{post.accounts?.ig_username ?? ""} · 등록: {formatDate(post.created_at)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openSettings(post)}
                    className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                    title="설정"
                  >
                    <Settings2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleToggleActive(post)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      post.is_active
                        ? "text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20"
                        : "text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
                    }`}
                  >
                    {post.is_active ? "일시정지" : "감시 시작"}
                  </button>
                  <button
                    onClick={() => handleDelete(post.id)}
                    className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
