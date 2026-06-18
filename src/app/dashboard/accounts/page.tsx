"use client"

import { Suspense, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useSearchParams, useRouter } from "next/navigation"
import {
  Trash2,
  AtSign,
  CheckCircle2,
  AlertCircle,
  Camera,
  ExternalLink,
  Loader2,
  Settings,
  X,
  Save,
  MessageSquare,
  Send,
  UserX,
  RefreshCw,
} from "lucide-react"

interface Account {
  id: string
  ig_username: string
  ig_id: string
  fb_page_id: string | null
  access_token: string
  token_expires_at: string | null
  reply_comment_text: string | null
  private_reply_text: string | null
  private_reply_button: string | null
  dm_body_template: string | null
  disclosure_text: string | null
  not_following_text: string | null
  follow_check_enabled: boolean
  public_reply_enabled: boolean
  auto_sync_enabled: boolean
  created_at: string
  updated_at: string
}

interface AccountSettings {
  public_reply_enabled: boolean
  reply_comment_text: string
  follow_check_enabled: boolean
  private_reply_text: string
  not_following_text: string
}

type OAuthStatus = {
  type: "success" | "error"
  message: string
} | null

const ERROR_MESSAGES: Record<string, string> = {
  invalid_state: "Security check failed. Please try again.",
  oauth_denied: "Instagram authorization was cancelled.",
  no_code: "No authorization code received. Please try again.",
  token_failed: "Failed to exchange token with Meta. Check your app settings.",
  no_ig_account:
    "No Instagram Business account found. Your Instagram must be a Business or Creator account linked to a Facebook Page.",
  db_error: "Database error. Please contact support.",
  unknown: "An unexpected error occurred. Please try again.",
}

type TokenStatusKey = "valid" | "expiring" | "expired" | "unknown"

interface TokenStatus {
  key: TokenStatusKey
  label: string
  dot: string
  text: string
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

/** Classify an account's token expiry into a status badge. */
function tokenStatus(expiresAt: string | null): TokenStatus {
  if (!expiresAt) {
    return { key: "unknown", label: "Unknown", dot: "bg-zinc-400", text: "text-zinc-500 dark:text-zinc-400" }
  }
  const expires = Date.parse(expiresAt)
  if (Number.isNaN(expires)) {
    return { key: "unknown", label: "Unknown", dot: "bg-zinc-400", text: "text-zinc-500 dark:text-zinc-400" }
  }
  const now = Date.now()
  if (expires < now) {
    return { key: "expired", label: "Expired", dot: "bg-red-500", text: "text-red-600 dark:text-red-400" }
  }
  if (expires - now <= SEVEN_DAYS_MS) {
    return { key: "expiring", label: "Expiring Soon", dot: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" }
  }
  return { key: "valid", label: "Valid", dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" }
}

export default function AccountsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      <AccountsContent />
    </Suspense>
  )
}

function AccountsContent() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [status, setStatus] = useState<OAuthStatus>(null)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [settings, setSettings] = useState<AccountSettings>({
    public_reply_enabled: false,
    reply_comment_text: "",
    follow_check_enabled: false,
    private_reply_text: "",
    not_following_text: "",
  })
  const [saving, setSaving] = useState(false)
  const [refreshingId, setRefreshingId] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const router = useRouter()

  // Handle OAuth callback params
  useEffect(() => {
    const success = searchParams.get("success")
    const error = searchParams.get("error")

    if (success === "connected") {
      setStatus({ type: "success", message: "Instagram account connected successfully!" })
      router.replace("/dashboard/accounts")
    } else if (error) {
      const msg = ERROR_MESSAGES[error] || ERROR_MESSAGES.unknown
      const detail = searchParams.get("detail")
      const fullMsg = detail ? `${msg}\n\n[Detail] ${decodeURIComponent(detail)}` : msg
      setStatus({ type: "error", message: fullMsg })
      router.replace("/dashboard/accounts")
    }
  }, [searchParams, router])

  useEffect(() => {
    fetchAccounts()
  }, [])

  async function fetchAccounts() {
    const supabase = createClient()
    try {
      const { data } = await supabase
        .from("accounts")
        .select("*")
        .order("created_at", { ascending: false })
      if (data) setAccounts(data as Account[])
    } catch {
      // table may not exist
    } finally {
      setLoading(false)
    }
  }

  const handleConnectOAuth = () => {
    setConnecting(true)
    window.location.href = "/api/auth/instagram"
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Disconnect this Instagram account?")) return
    const supabase = createClient()
    try {
      await supabase.from("accounts").delete().eq("id", id)
      await fetchAccounts()
    } catch {
      alert("Failed to disconnect.")
    }
  }

  const handleRefreshToken = async (id: string) => {
    setRefreshingId(id)
    try {
      const res = await fetch(`/api/accounts/${id}/refresh-token`, { method: "POST" })
      const json = (await res.json()) as { error?: string }
      if (!res.ok) {
        alert(json.error || "토큰 갱신에 실패했습니다.")
        return
      }
      await fetchAccounts()
    } catch {
      alert("토큰 갱신에 실패했습니다.")
    } finally {
      setRefreshingId(null)
    }
  }

  const openSettings = (account: Account) => {
    setEditingAccount(account)
    setSettings({
      public_reply_enabled: account.public_reply_enabled,
      reply_comment_text: account.reply_comment_text || "",
      follow_check_enabled: account.follow_check_enabled,
      private_reply_text: account.private_reply_text || "",
      not_following_text: account.not_following_text || "",
    })
  }

  const handleSaveSettings = async () => {
    if (!editingAccount) return
    setSaving(true)
    try {
      const res = await fetch(`/api/accounts/${editingAccount.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          public_reply_enabled: settings.public_reply_enabled,
          reply_comment_text: settings.reply_comment_text || null,
          follow_check_enabled: settings.follow_check_enabled,
          private_reply_text: settings.private_reply_text || null,
          not_following_text: settings.not_following_text || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        alert(err.error || "설정 저장에 실패했습니다.")
        return
      }
      setEditingAccount(null)
      await fetchAccounts()
    } catch {
      alert("설정 저장에 실패했습니다.")
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm text-zinc-500 dark:text-zinc-400">
            Connected Accounts
          </h2>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {accounts.length}
          </p>
        </div>
        <button
          onClick={handleConnectOAuth}
          disabled={connecting}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:from-purple-700 hover:to-pink-700 hover:shadow-md disabled:opacity-50"
        >
          {connecting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Camera className="h-4 w-4" />
          )}
          {connecting ? "Redirecting..." : "Connect Instagram"}
        </button>
      </div>

      {/* Status banner */}
      {status && (
        <div
          className={`flex items-center gap-3 rounded-lg p-4 ${
            status.type === "success"
              ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300"
              : "bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300"
          }`}
        >
          {status.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0" />
          )}
          <p className="text-sm">{status.message}</p>
          <button
            onClick={() => setStatus(null)}
            className="ml-auto text-current opacity-60 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Account cards */}
      {accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white py-16 dark:border-zinc-700 dark:bg-zinc-900">
          <div className="mb-4 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 p-4">
            <Camera className="h-8 w-8 text-white" />
          </div>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            No connected accounts yet
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            Connect your Instagram Business account to start auto-DMing links to commenters.
          </p>
          <button
            onClick={handleConnectOAuth}
            disabled={connecting}
            className="mt-4 flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-sm font-medium text-white transition-all hover:from-purple-700 hover:to-pink-700 disabled:opacity-50"
          >
            {connecting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Camera className="h-4 w-4" />
            )}
            Connect with Instagram
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((account) => {
            const tStatus = tokenStatus(account.token_expires_at)
            return (
              <div
                key={account.id}
                className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-4 transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
                  <AtSign className="h-6 w-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      @{account.ig_username}
                    </h3>
                    {account.follow_check_enabled && account.public_reply_enabled ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                    )}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                    <span>Connected: {formatDate(account.created_at)}</span>
                    <span className={`flex items-center gap-1.5 font-medium ${tStatus.text}`} title="Token status">
                      <span className={`inline-block h-2 w-2 rounded-full ${tStatus.dot}`} />
                      Token: {tStatus.label}
                    </span>
                  </div>
                </div>
                <div className="hidden flex-wrap items-center gap-1.5 sm:flex">
                  {account.public_reply_enabled && (
                    <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                      Auto Reply
                    </span>
                  )}
                  {account.follow_check_enabled && (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                      Follow Check
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {(tStatus.key === "expired" || tStatus.key === "expiring") && (
                    <button
                      onClick={() => handleRefreshToken(account.id)}
                      disabled={refreshingId === account.id}
                      className="flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      title="토큰 갱신"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${refreshingId === account.id ? "animate-spin" : ""}`} />
                      <span className="hidden sm:inline">토큰 갱신</span>
                    </button>
                  )}
                  <button
                    onClick={() => openSettings(account)}
                    className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                    title="설정"
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                  <a
                    href={`https://instagram.com/${account.ig_username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-primary dark:hover:bg-zinc-800"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  <button
                    onClick={() => handleDelete(account.id)}
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

      {/* Requirements note */}
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Requirements
        </h4>
        <ul className="mt-2 space-y-1.5 text-xs text-zinc-600 dark:text-zinc-400">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-purple-500">•</span>
            <span>Instagram account must be set to <strong>Business</strong> or <strong>Creator</strong></span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-purple-500">•</span>
            <span>Must be linked to a <strong>Facebook Page</strong></span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-purple-500">•</span>
            <span>The Facebook Page must be assigned to your Meta App</span>
          </li>
        </ul>
      </div>

      {/* Settings Modal */}
      {editingAccount && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-20">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl dark:bg-zinc-900">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-200 p-5 dark:border-zinc-800">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  계정 설정
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  @{editingAccount.ig_username}
                </p>
              </div>
              <button
                onClick={() => setEditingAccount(null)}
                className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-5 p-5">
              {/* Public Reply Toggle */}
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/20">
                      <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        공개 댓글 답장
                      </h3>
                      <p className="text-xs text-zinc-500">
                        댓글에 공개 답장을 남깁니다
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      setSettings((prev) => ({
                        ...prev,
                        public_reply_enabled: !prev.public_reply_enabled,
                      }))
                    }
                    className={`relative h-6 w-11 rounded-full transition-colors ${
                      settings.public_reply_enabled
                        ? "bg-primary"
                        : "bg-zinc-300 dark:bg-zinc-600"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                        settings.public_reply_enabled
                          ? "translate-x-5"
                          : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Reply Comment Text */}
                {settings.public_reply_enabled && (
                  <div className="mt-4">
                    <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      공개 답장 내용
                    </label>
                    <textarea
                      value={settings.reply_comment_text}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          reply_comment_text: e.target.value,
                        }))
                      }
                      rows={3}
                      className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                      placeholder="공개 댓글로 남길 답장 내용을 입력하세요..."
                    />
                  </div>
                )}
              </div>

              {/* Follow Check / DM Toggle */}
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-emerald-100 p-2 dark:bg-emerald-900/20">
                      <Send className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        DM 자동 발송
                      </h3>
                      <p className="text-xs text-zinc-500">
                        팔로워 여부 확인 후 DM을 발송합니다
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      setSettings((prev) => ({
                        ...prev,
                        follow_check_enabled: !prev.follow_check_enabled,
                      }))
                    }
                    className={`relative h-6 w-11 rounded-full transition-colors ${
                      settings.follow_check_enabled
                        ? "bg-primary"
                        : "bg-zinc-300 dark:bg-zinc-600"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                        settings.follow_check_enabled
                          ? "translate-x-5"
                          : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* DM Settings */}
                {settings.follow_check_enabled && (
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                        팔로워 DM 메시지
                      </label>
                      <textarea
                        value={settings.private_reply_text}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            private_reply_text: e.target.value,
                          }))
                        }
                        rows={4}
                        className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        placeholder="팔로워에게 보낼 DM 메시지를 입력하세요..."
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                        <UserX className="h-3.5 w-3.5 text-amber-500" />
                        비팔로워 DM 메시지
                      </label>
                      <textarea
                        value={settings.not_following_text}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            not_following_text: e.target.value,
                          }))
                        }
                        rows={3}
                        className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        placeholder="비팔로워에게 보낼 DM 메시지 (선택사항)"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-zinc-200 p-5 dark:border-zinc-800">
              <button
                onClick={() => setEditingAccount(null)}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                취소
              </button>
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {saving ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
