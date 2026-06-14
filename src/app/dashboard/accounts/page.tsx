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
  Key,
  Loader2,
  X,
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
  const [showModal, setShowModal] = useState(false)
  const [token, setToken] = useState("")
  const [connecting, setConnecting] = useState(false)
  const [connectError, setConnectError] = useState("")

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

  const handleConnect = async () => {
    if (!token.trim()) return
    setConnecting(true)
    setConnectError("")
    try {
      const resp = await fetch("/api/accounts/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: token.trim() }),
      })
      const data = await resp.json()
      if (!resp.ok) {
        setConnectError(data.error || "Connection failed")
        return
      }
      setShowModal(false)
      setToken("")
      await fetchAccounts()
    } catch {
      setConnectError("Network error. Please try again.")
    } finally {
      setConnecting(false)
    }
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
          onClick={() => setShowModal(true)}
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
            onClick={() => setShowModal(true)}
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

      {/* Token Input Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-purple-100 p-2 dark:bg-purple-900/30">
                  <Key className="h-5 w-5 text-purple-600" />
                </div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  Connect Instagram
                </h2>
              </div>
              <button
                onClick={() => { setShowModal(false); setConnectError("") }}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
              <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
                <strong>How to get your token:</strong><br />
                1. Go to your Meta App → Instagram API<br />
                2. Click &quot;Add Instagram account&quot; in step 2<br />
                3. Generate a long-lived token<br />
                4. Copy and paste it below
              </p>
            </div>

            <textarea
              value={token}
              onChange={(e) => { setToken(e.target.value); setConnectError("") }}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 font-mono focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              rows={4}
              placeholder="Paste your Instagram access token here..."
              disabled={connecting}
            />

            {connectError && (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                {connectError}
              </p>
            )}

            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => { setShowModal(false); setConnectError("") }}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                disabled={connecting}
              >
                Cancel
              </button>
              <button
                onClick={handleConnect}
                disabled={connecting || !token.trim()}
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-sm font-medium text-white transition-all hover:from-purple-700 hover:to-pink-700 disabled:opacity-50"
              >
                {connecting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Camera className="h-4 w-4" />
                    Connect
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
