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
          {accounts.map((account) => (
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
                <div className="mt-0.5 flex items-center gap-3 text-xs text-zinc-500">
                  <span>Connected: {formatDate(account.created_at)}</span>
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
          ))}
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
    </div>
  )
}
