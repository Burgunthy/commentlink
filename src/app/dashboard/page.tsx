"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  MessageSquare,
  Send,
  Images,
  Users,
  TrendingUp,
} from "lucide-react"

interface Stats {
  totalComments: number
  totalDmsSent: number
  activePosts: number
  totalAccounts: number
}

interface RecentComment {
  id: string
  username: string
  content: string
  status: string
  created_at: string
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalComments: 0,
    totalDmsSent: 0,
    activePosts: 0,
    totalAccounts: 0,
  })
  const [recentComments, setRecentComments] = useState<RecentComment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDashboardData() {
      const supabase = createClient()
      try {
        // Total tracked comments (one conversation per inbound comment)
        const { count: totalComments } = await supabase
          .from("conversations")
          .select("*", { count: "exact", head: true })

        // DMs actually delivered
        const { count: totalDmsSent } = await supabase
          .from("conversations")
          .select("*", { count: "exact", head: true })
          .not("dm_sent_at", "is", null)

        // Posts with automation enabled
        const { count: activePosts } = await supabase
          .from("posts")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true)

        // Connected Instagram accounts
        const { count: totalAccounts } = await supabase
          .from("accounts")
          .select("*", { count: "exact", head: true })

        setStats({
          totalComments: totalComments ?? 0,
          totalDmsSent: totalDmsSent ?? 0,
          activePosts: activePosts ?? 0,
          totalAccounts: totalAccounts ?? 0,
        })

        const { data: conversations } = await supabase
          .from("conversations")
          .select("id, username, comment_text, status, created_at")
          .order("created_at", { ascending: false })
          .limit(5)

        if (conversations) {
          setRecentComments(
            conversations.map((c) => ({
              id: c.id,
              username: c.username ?? "",
              content: c.comment_text ?? "",
              status: c.status ?? "received",
              created_at: c.created_at,
            }))
          )
        }
      } catch {
        // Tables may not exist yet — use defaults
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  const statCards = [
    { label: "Total Comments", value: stats.totalComments, icon: MessageSquare },
    { label: "DMs Sent", value: stats.totalDmsSent, icon: Send },
    { label: "Active Posts", value: stats.activePosts, icon: Images },
    { label: "Connected Accounts", value: stats.totalAccounts, icon: Users },
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

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
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
                {card.value.toLocaleString()}
              </p>
            </div>
          )
        })}
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
