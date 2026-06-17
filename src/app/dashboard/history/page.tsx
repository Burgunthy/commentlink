"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  AlertCircle,
  MessageSquare,
  Send,
  Clock,
  Inbox,
  UserCheck,
  UserX,
  Link2,
} from "lucide-react"

interface ConversationRow {
  id: string
  username: string | null
  comment_text: string | null
  comment_id: string
  media_id: string | null
  user_igsid: string
  status: string | null
  error_message: string | null
  is_following: boolean | null
  created_at: string
  replied_at: string | null
  dm_sent_at: string | null
  accounts: { ig_username: string } | null
  posts: {
    media_id: string | null
    caption: string | null
    dm_message: string | null
    dm_link_url: string | null
  } | null
}

interface AccountOption {
  id: string
  ig_username: string
}

type StatusFilter = "all" | "received" | "replied" | "confirmed" | "error"

const PAGE_SIZE = 20

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "received", label: "Received" },
  { key: "replied", label: "Replied" },
  { key: "confirmed", label: "Confirmed" },
  { key: "error", label: "Error" },
]

// received=blue, replied=amber, confirmed/dm_sent/done=green, failed/error=red
function statusBadge(status: string | null) {
  const s = (status || "received").toLowerCase()
  if (s === "received")
    return { label: "Received", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" }
  if (s === "replied")
    return { label: "Replied", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" }
  if (s === "confirmed" || s === "dm_sent" || s === "done")
    return { label: "Confirmed", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" }
  if (s === "failed" || s === "error")
    return { label: "Failed", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" }
  return { label: status || "Unknown", className: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400" }
}

export default function HistoryPage() {
  const [conversations, setConversations] = useState<ConversationRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [accountFilter, setAccountFilter] = useState<string>("all")
  const [accounts, setAccounts] = useState<AccountOption[]>([])
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<ConversationRow | null>(null)

  // Load accounts once for the account filter
  useEffect(() => {
    async function loadAccounts() {
      const supabase = createClient()
      try {
        const { data } = await supabase
          .from("accounts")
          .select("id, ig_username")
          .order("ig_username", { ascending: true })
        if (data) setAccounts(data as AccountOption[])
      } catch {
        // table may not exist
      }
    }
    loadAccounts()
  }, [])

  // Debounce the search box; reset to first page on change
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, 350)
    return () => clearTimeout(t)
  }, [searchInput])

  const fetchConversations = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    try {
      let query = supabase
        .from("conversations")
        .select(
          `id, username, comment_text, comment_id, media_id, user_igsid, status, error_message,
           is_following, created_at, replied_at, dm_sent_at,
           accounts ( ig_username ),
           posts ( media_id, caption, dm_message, dm_link_url )`,
          { count: "exact" }
        )

      if (statusFilter === "received") query = query.eq("status", "received")
      else if (statusFilter === "replied") query = query.eq("status", "replied")
      else if (statusFilter === "confirmed")
        query = query.in("status", ["confirmed", "dm_sent", "done"])
      else if (statusFilter === "error") query = query.in("status", ["failed", "error"])

      if (accountFilter !== "all") query = query.eq("account_id", accountFilter)

      if (search.trim()) {
        // Strip chars that are special in the PostgREST `or()` filter syntax
        const q = search.trim().replace(/[(),]/g, " ").slice(0, 100)
        query = query.or(`username.ilike.%${q}%,comment_text.ilike.%${q}%`)
      }

      const { data, count } = await query
        .order("created_at", { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

      // accounts/posts are many-to-one embeds → single objects at runtime,
      // but Supabase infers them as arrays (no generated DB types). Cast via
      // unknown to align with the actual shape.
      setConversations((data ?? []) as unknown as ConversationRow[])
      setTotal(count ?? 0)
    } catch {
      setConversations([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, accountFilter, search])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const fromIdx = total === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1
  const toIdx = Math.min(total, safePage * PAGE_SIZE)

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return "—"
    const d = new Date(dateStr)
    const pad = (n: number) => String(n).padStart(2, "0")
    return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-sm text-zinc-500 dark:text-zinc-400">Conversation History</h2>
        <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          {total.toLocaleString()} <span className="text-base font-medium text-zinc-400">records</span>
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setStatusFilter(tab.key)
                setPage(1)
              }}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                statusFilter === tab.key
                  ? "bg-primary text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <select
            value={accountFilter}
            onChange={(e) => {
              setAccountFilter(e.target.value)
              setPage(1)
            }}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          >
            <option value="all">All accounts</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                @{acc.ig_username}
              </option>
            ))}
          </select>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search @username or comment"
              className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 sm:w-72"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
            <Inbox className="mb-3 h-10 w-10" />
            <p className="text-sm font-medium">No conversations found.</p>
            <p className="mt-1 text-xs">Try adjusting your filters or search.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] table-fixed text-sm">
              <colgroup>
                <col className="w-[170px]" />
                <col className="w-[300px]" />
                <col className="w-[240px]" />
                <col className="w-[120px]" />
                <col className="w-[145px]" />
                <col className="w-[145px]" />
              </colgroup>
              <thead>
                <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-400 dark:border-zinc-800">
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Comment</th>
                  <th className="px-4 py-3 font-medium">Post</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Received</th>
                  <th className="px-4 py-3 font-medium">Replied</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {conversations.map((c) => {
                  const badge = statusBadge(c.status)
                  return (
                    <tr
                      key={c.id}
                      onClick={() => setSelected(c)}
                      className="cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-light dark:bg-primary/10">
                            <span className="text-xs font-bold text-primary">
                              {(c.username || "?").charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                            @{c.username || "unknown"}
                          </span>
                        </div>
                      </td>
                      <td className="overflow-hidden px-4 py-3">
                        <p className="truncate text-zinc-600 dark:text-zinc-400">
                          {c.comment_text || <span className="text-zinc-400">(no text)</span>}
                        </p>
                      </td>
                      <td className="overflow-hidden px-4 py-3">
                        <p className="truncate text-zinc-600 dark:text-zinc-400">
                          {c.posts?.caption || c.media_id || <span className="text-zinc-400">—</span>}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">
                        {formatDateTime(c.created_at)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">
                        {formatDateTime(c.replied_at)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && total > 0 && (
          <div className="flex flex-col items-center justify-between gap-3 border-t border-zinc-200 px-5 py-4 dark:border-zinc-800 sm:flex-row">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Showing {fromIdx}–{toIdx} of {total.toLocaleString()}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="flex items-center gap-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <ChevronLeft className="h-4 w-4" /> Prev
              </button>
              <span className="px-2 text-sm text-zinc-500 dark:text-zinc-400">
                Page {safePage} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="flex items-center gap-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selected &&
        (() => {
          const badge = statusBadge(selected.status)
          return (
            <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-16">
              <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl dark:bg-zinc-900">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-zinc-200 p-5 dark:border-zinc-800">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-light dark:bg-primary/10">
                      <span className="text-sm font-bold text-primary">
                        {(selected.username || "?").charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                        @{selected.username || "unknown"}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}>
                          {badge.label}
                        </span>
                        {selected.is_following === true && (
                          <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
                            <UserCheck className="h-3 w-3" /> Following
                          </span>
                        )}
                        {selected.is_following === false && (
                          <span className="flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                            <UserX className="h-3 w-3" /> Not following
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelected(null)}
                    className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Body */}
                <div className="max-h-[70vh] space-y-5 overflow-y-auto p-5">
                  {/* Comment */}
                  <div>
                    <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                      <MessageSquare className="h-3.5 w-3.5" /> Comment
                    </p>
                    <p className="whitespace-pre-wrap rounded-lg bg-zinc-50 p-3 text-sm text-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300">
                      {selected.comment_text || <span className="text-zinc-400">(empty)</span>}
                    </p>
                  </div>

                  {/* Post */}
                  <div>
                    <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                      <Inbox className="h-3.5 w-3.5" /> Post
                    </p>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300">
                      {selected.posts?.caption || "(no caption)"}
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">
                      media_id: {selected.posts?.media_id || selected.media_id || "—"}
                    </p>
                  </div>

                  {/* DM message */}
                  <div>
                    <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                      <Send className="h-3.5 w-3.5" /> DM Message
                    </p>
                    {selected.posts?.dm_message ? (
                      <p className="whitespace-pre-wrap rounded-lg bg-blue-50 p-3 text-sm text-zinc-700 dark:bg-blue-900/20 dark:text-zinc-300">
                        {selected.posts.dm_message}
                      </p>
                    ) : (
                      <p className="text-sm text-zinc-400">(no DM message configured on this post)</p>
                    )}
                    {selected.posts?.dm_link_url && (
                      <a
                        href={selected.posts.dm_link_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 flex items-center gap-1 truncate text-xs font-medium text-primary hover:underline"
                      >
                        <Link2 className="h-3 w-3 shrink-0" />
                        {selected.posts.dm_link_url}
                      </a>
                    )}
                  </div>

                  {/* Error */}
                  {selected.error_message && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900/40 dark:bg-red-900/20">
                      <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-red-500">
                        <AlertCircle className="h-3.5 w-3.5" /> Error
                      </p>
                      <p className="whitespace-pre-wrap text-sm text-red-700 dark:text-red-300">
                        {selected.error_message}
                      </p>
                    </div>
                  )}

                  {/* Timestamps */}
                  <div className="grid grid-cols-1 gap-3 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50 sm:grid-cols-3">
                    <div>
                      <p className="flex items-center gap-1 text-xs text-zinc-400">
                        <Clock className="h-3 w-3" /> Received
                      </p>
                      <p className="mt-0.5 text-sm text-zinc-700 dark:text-zinc-300">
                        {formatDateTime(selected.created_at)}
                      </p>
                    </div>
                    <div>
                      <p className="flex items-center gap-1 text-xs text-zinc-400">
                        <MessageSquare className="h-3 w-3" /> Replied
                      </p>
                      <p className="mt-0.5 text-sm text-zinc-700 dark:text-zinc-300">
                        {formatDateTime(selected.replied_at)}
                      </p>
                    </div>
                    <div>
                      <p className="flex items-center gap-1 text-xs text-zinc-400">
                        <Send className="h-3 w-3" /> DM Sent
                      </p>
                      <p className="mt-0.5 text-sm text-zinc-700 dark:text-zinc-300">
                        {formatDateTime(selected.dm_sent_at)}
                      </p>
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-zinc-400">
                    <span>account: @{selected.accounts?.ig_username ?? "—"}</span>
                    <span>comment_id: {selected.comment_id}</span>
                    <span>user_igsid: {selected.user_igsid}</span>
                  </div>
                </div>
              </div>
            </div>
          )
        })()}
    </div>
  )
}
