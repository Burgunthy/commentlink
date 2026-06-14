"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Trash2,
  RefreshCw,
  AtSign,
  CheckCircle2,
  AlertCircle,
  Camera,
  ExternalLink,
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

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [searchParams] = useState(() => {
  if (typeof window === 'undefined') return new URLSearchParams()
  return new URLSearchParams(window.location.search)
})

  useEffect(() => {
    // Clear URL params on mount
    if (searchParams.toString()) {
      window.history.replaceState({}, "", "/dashboard/accounts")
    }
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

  const handleConnect = () => {
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

  const handleRefresh = async (account: Account) => {
    // TODO: refresh long-lived token via Meta API
    const supabase = createClient()
    try {
      await supabase
        .from("accounts")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", account.id)
      await fetchAccounts()
    } catch {
      alert("Failed to refresh.")
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`
  }

  const isTokenExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
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
      {/* OAuth result notifications */}
      {searchParams?.get("success") === "connected" && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-900/20">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <p className="text-sm text-emerald-800 dark:text-emerald-300">
            Instagram account connected successfully!
          </p>
        </div>
      )}
      {searchParams?.get("error") && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
          <p className="text-sm text-red-800 dark:text-red-300">
            Connection failed. Error: {searchParams.get("error")}
          </p>
        </div>
      )}

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
          onClick={handleConnect}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:from-purple-700 hover:to-pink-700 hover:shadow-md"
        >
          <Camera className="h-4 w-4" />
          Connect Instagram
        </button>
      </div>

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
            Connect your Instagram account to start auto-DMing links to commenters.
          </p>
          <button
            onClick={handleConnect}
            className="mt-4 flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-sm font-medium text-white transition-all hover:from-purple-700 hover:to-pink-700"
          >
            <Camera className="h-4 w-4" />
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
              {/* Avatar */}
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
                <AtSign className="h-6 w-6 text-white" />
              </div>

              {/* Info */}
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
                  {isTokenExpired(account.token_expires_at) && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-400">
                      Token expired
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex items-center gap-3 text-xs text-zinc-500">
                  <span>Connected: {formatDate(account.created_at)}</span>
                  <span>Last updated: {formatDate(account.updated_at)}</span>
                </div>
              </div>

              {/* Feature tags */}
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
                {account.auto_sync_enabled && (
                  <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-xs text-purple-700 dark:bg-purple-900/20 dark:text-purple-400">
                    Auto Sync
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <a
                  href={`https://instagram.com/${account.ig_username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-primary dark:hover:bg-zinc-800"
                  title="Open Instagram"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
                <button
                  onClick={() => handleRefresh(account)}
                  className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-primary dark:hover:bg-zinc-800"
                  title="Refresh token"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(account.id)}
                  className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                  title="Disconnect"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
