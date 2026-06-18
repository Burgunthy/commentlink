"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  MessageSquare,
  Send,
  Images,
  Users,
  TrendingUp,
  Percent,
  AlertCircle,
  ChartColumn,
} from "lucide-react"

interface Stats {
  totalComments: number
  totalDmsSent: number
  activePosts: number
  totalAccounts: number
  errorCount: number
  conversionRate: number // DMs / comments * 100
  successRate: number // delivered / processed * 100
}

interface RecentComment {
  id: string
  username: string
  content: string
  status: string
  created_at: string
}

interface AccountOption {
  id: string
  ig_username: string
}

interface DayBucket {
  key: string // YYYY-MM-DD (local)
  label: string // M/D
  received: number
  dms: number
}

const EMPTY_STATS: Stats = {
  totalComments: 0,
  totalDmsSent: 0,
  activePosts: 0,
  totalAccounts: 0,
  errorCount: 0,
  conversionRate: 0,
  successRate: 0,
}

// Statuses that count as "delivered" vs "processed" for the success rate.
const DELIVERED = ["confirmed", "dm_sent", "done"]
const PROCESSED = ["replied", "confirmed", "dm_sent", "done", "failed", "error"]
const ERRORED = ["failed", "error"]

/** Build the last 7 local-day buckets (oldest → newest). */
function buildLast7Days(): DayBucket[] {
  const buckets: DayBucket[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    buckets.push({ key, label: `${d.getMonth() + 1}/${d.getDate()}`, received: 0, dms: 0 })
  }
  return buckets
}

/** Local YYYY-MM-DD key for an ISO timestamp. */
function localDateKey(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>(EMPTY_STATS)
  const [recentComments, setRecentComments] = useState<RecentComment[]>([])
  const [accounts, setAccounts] = useState<AccountOption[]>([])
  const [accountId, setAccountId] = useState<string>("all")
  const [buckets, setBuckets] = useState<DayBucket[]>(buildLast7Days)
  const [loading, setLoading] = useState(true)

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

  const fetchDashboardData = useCallback(async (selectedAccount: string) => {
    setLoading(true)
    const supabase = createClient()
    const filtered = selectedAccount !== "all"

    try {
      // Total tracked comments (one conversation per inbound comment)
      let totalQuery = supabase
        .from("conversations")
        .select("*", { count: "exact", head: true })
      if (filtered) totalQuery = totalQuery.eq("account_id", selectedAccount)
      const { count: totalComments } = await totalQuery

      // DMs actually delivered
      let dmsQuery = supabase
        .from("conversations")
        .select("*", { count: "exact", head: true })
        .not("dm_sent_at", "is", null)
      if (filtered) dmsQuery = dmsQuery.eq("account_id", selectedAccount)
      const { count: totalDmsSent } = await dmsQuery

      // Posts with automation enabled
      let postsQuery = supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true)
      if (filtered) postsQuery = postsQuery.eq("account_id", selectedAccount)
      const { count: activePosts } = await postsQuery

      // Connected Instagram accounts (always global)
      const { count: totalAccounts } = await supabase
        .from("accounts")
        .select("*", { count: "exact", head: true })

      // Error count (failed / error statuses)
      let errorQuery = supabase
        .from("conversations")
        .select("*", { count: "exact", head: true })
        .in("status", ERRORED)
      if (filtered) errorQuery = errorQuery.eq("account_id", selectedAccount)
      const { count: errorCount } = await errorQuery

      // Success-rate numerator (delivered) and denominator (processed)
      let deliveredQuery = supabase
        .from("conversations")
        .select("*", { count: "exact", head: true })
        .in("status", DELIVERED)
      if (filtered) deliveredQuery = deliveredQuery.eq("account_id", selectedAccount)
      const { count: delivered } = await deliveredQuery

      let processedQuery = supabase
        .from("conversations")
        .select("*", { count: "exact", head: true })
        .in("status", PROCESSED)
      if (filtered) processedQuery = processedQuery.eq("account_id", selectedAccount)
      const { count: processed } = await processedQuery

      const tc = totalComments ?? 0
      const td = totalDmsSent ?? 0
      setStats({
        totalComments: tc,
        totalDmsSent: td,
        activePosts: activePosts ?? 0,
        totalAccounts: totalAccounts ?? 0,
        errorCount: errorCount ?? 0,
        conversionRate: tc > 0 ? (td / tc) * 100 : 0,
        successRate: (processed ?? 0) > 0 ? ((delivered ?? 0) / (processed ?? 0)) * 100 : 0,
      })

      // Recent comments
      let recentQuery = supabase
        .from("conversations")
        .select("id, username, comment_text, status, created_at")
      if (filtered) recentQuery = recentQuery.eq("account_id", selectedAccount)
      const { data: conversations } = await recentQuery
        .order("created_at", { ascending: false })
        .limit(5)
      setRecentComments(
        (conversations ?? []).map((c) => ({
          id: c.id,
          username: c.username ?? "",
          content: c.comment_text ?? "",
          status: c.status ?? "received",
          created_at: c.created_at,
        }))
      )

      // 7-day activity chart
      const dayBuckets = buildLast7Days()
      const startIso = new Date(`${dayBuckets[0].key}T00:00:00`).toISOString()
      let chartQuery = supabase
        .from("conversations")
        .select("created_at, dm_sent_at")
        .gte("created_at", startIso)
      if (filtered) chartQuery = chartQuery.eq("account_id", selectedAccount)
      const { data: chartRows } = await chartQuery

      for (const row of chartRows ?? []) {
        const k = localDateKey(row.created_at)
        const b = k ? dayBuckets.find((x) => x.key === k) : undefined
        if (b) {
          b.received += 1
          const dk = localDateKey(row.dm_sent_at)
          const db = dk ? dayBuckets.find((x) => x.key === dk) : undefined
          if (db) db.dms += 1
        }
      }
      setBuckets(dayBuckets)
    } catch {
      // Tables may not exist yet — keep defaults
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboardData(accountId)
  }, [accountId, fetchDashboardData])

  const statCards = [
    { label: "Total Comments", display: stats.totalComments.toLocaleString(), icon: MessageSquare },
    { label: "DMs Sent", display: stats.totalDmsSent.toLocaleString(), icon: Send },
    { label: "Conversion Rate", display: `${stats.conversionRate.toFixed(1)}%`, icon: Percent },
    { label: "Success Rate", display: `${stats.successRate.toFixed(1)}%`, icon: TrendingUp },
    { label: "Errors", display: stats.errorCount.toLocaleString(), icon: AlertCircle },
    { label: "Active Posts", display: stats.activePosts.toLocaleString(), icon: Images },
    { label: "Connected Accounts", display: stats.totalAccounts.toLocaleString(), icon: Users },
  ]

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`
  }

  const statusPill = (status: string) => {
    if (status === "confirmed" || status === "dm_sent" || status === "done") {
      return { label: "DM Sent", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" }
    }
    if (status === "replied") {
      return { label: "Replied", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" }
    }
    if (status === "failed" || status === "error") {
      return { label: "Failed", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" }
    }
    return { label: "Received", className: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400" }
  }

  const chartMax = Math.max(1, ...buckets.map((b) => Math.max(b.received, b.dms)))
  const chartTotals = buckets.reduce(
    (acc, b) => ({ received: acc.received + b.received, dms: acc.dms + b.dms }),
    { received: 0, dms: 0 }
  )

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Account filter */}
      <div className="flex items-center gap-3">
        <label htmlFor="account-filter" className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
          Account
        </label>
        <select
          id="account-filter"
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        >
          <option value="all">All accounts</option>
          {accounts.map((acc) => (
            <option key={acc.id} value={acc.id}>
              @{acc.ig_username}
            </option>
          ))}
        </select>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <div
              key={card.label}
              className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  {card.label}
                </p>
                <div className="rounded-lg bg-primary-light p-2 dark:bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {card.display}
              </p>
            </div>
          )
        })}
      </div>

      {/* 7-day activity chart */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ChartColumn className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Last 7 Days
            </h2>
          </div>
          <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-blue-400" />
              Received ({chartTotals.received})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-primary" />
              DMs Sent ({chartTotals.dms})
            </span>
          </div>
        </div>

        <div className="flex items-end gap-2 sm:gap-3">
          {buckets.map((b) => {
            const receivedPct = (b.received / chartMax) * 100
            const dmPct = (b.dms / chartMax) * 100
            return (
              <div key={b.key} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex h-36 w-full items-end justify-center gap-1">
                  <div
                    className="w-2.5 rounded-t bg-blue-400 sm:w-3 dark:bg-blue-500/80"
                    style={{ height: `${Math.max(receivedPct, b.received > 0 ? 6 : 0)}%` }}
                    title={`Received: ${b.received}`}
                  />
                  <div
                    className="w-2.5 rounded-t bg-primary sm:w-3"
                    style={{ height: `${Math.max(dmPct, b.dms > 0 ? 6 : 0)}%` }}
                    title={`DMs Sent: ${b.dms}`}
                  />
                </div>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">{b.label}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Recent activity */}
      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Recent Comment Activity
            </h2>
          </div>
          <span className="text-xs text-zinc-500">Last 5</span>
        </div>

        {recentComments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
            <MessageSquare className="mb-3 h-10 w-10" />
            <p className="text-sm">No comment data yet.</p>
            <p className="mt-1 text-xs">Connect your Instagram account and enable posts to get started.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {recentComments.map((comment) => {
              const pill = statusPill(comment.status)
              return (
                <div key={comment.id} className="flex items-start gap-4 px-5 py-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-light dark:bg-primary/10">
                    <span className="text-xs font-bold text-primary">
                      {comment.username.charAt(0).toUpperCase() || "?"}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        @{comment.username || "unknown"}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${pill.className}`}>
                        {pill.label}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-zinc-600 dark:text-zinc-400">
                      {comment.content}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-zinc-400">
                    {formatDate(comment.created_at)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
